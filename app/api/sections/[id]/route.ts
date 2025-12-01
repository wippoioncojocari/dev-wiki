import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { ZodError } from "zod";
import { prisma } from "@/app/lib/prisma";
import { Prisma } from "@prisma/client";
import { fetchWikiSections } from "@/app/lib/wiki-db";
import { findSectionById } from "@/app/lib/wiki";
import { contentPayload, updateSectionSchema } from "@/app/lib/validation";

type ParamsContext = { params: Promise<{ id: string }> };

async function nextPosition(parentId: string | null): Promise<number> {
  const result = await prisma.section.aggregate({
    _max: { position: true },
    where: { parentId },
  });
  const current = result._max.position ?? -1;
  return current + 1;
}

async function collectDescendants(id: string): Promise<Set<string>> {
  const rows = await prisma.section.findMany({ select: { id: true, parentId: true } });
  const tree = rows.reduce<Record<string, string[]>>((acc, row) => {
    if (!acc[row.parentId ?? "root"]) acc[row.parentId ?? "root"] = [];
    acc[row.parentId ?? "root"].push(row.id);
    return acc;
  }, {});

  const descendants = new Set<string>();
  const walk = (current: string) => {
    const children = tree[current] || [];
    for (const child of children) {
      descendants.add(child);
      walk(child);
    }
  };
  walk(id);
  return descendants;
}

export async function GET(_: NextRequest, { params }: ParamsContext) {
  const { id } = await params;
  const sections = await fetchWikiSections();
  const section = findSectionById(id, sections);
  if (!section) {
    return NextResponse.json({ error: "Section not found." }, { status: 404 });
  }
  return NextResponse.json(section);
}

export async function PATCH(req: NextRequest, { params }: ParamsContext) {
  try {
    const { id } = await params;
    const body = await req.json();
    const parsed = updateSectionSchema.parse(body);

    const current = await prisma.section.findUnique({
      where: { id },
    });

    if (!current) {
      return NextResponse.json({ error: "Section not found." }, { status: 404 });
    }

    if (parsed.content) {
      const childrenCount = await prisma.section.count({ where: { parentId: id } });
      if (childrenCount > 0) {
        return NextResponse.json(
          { error: "Cannot set content on a non-leaf section. Remove or move its children first." },
          { status: 400 },
        );
      }
    }

    const targetParentId =
      parsed.parentId === undefined ? current.parentId : parsed.parentId ?? null;

    if (targetParentId) {
      const parent = await prisma.section.findUnique({
        where: { id: targetParentId },
      });
      if (!parent) {
        return NextResponse.json({ error: "New parent section not found." }, { status: 404 });
      }
    }

    if (targetParentId) {
      const descendants = await collectDescendants(id);
      if (descendants.has(targetParentId)) {
        return NextResponse.json(
          { error: "Cannot move section under its own descendant." },
          { status: 400 },
        );
      }
    }

    const parentChanged = targetParentId !== current.parentId;
    const position =
      parsed.position !== undefined
        ? parsed.position
        : parentChanged
          ? await nextPosition(targetParentId)
          : undefined;

    const updateData: Prisma.SectionUncheckedUpdateInput = { updatedAt: new Date() };
    if (parsed.title) updateData.title = parsed.title;
    if (parsed.summary !== undefined) updateData.summary = parsed.summary;
    if (parentChanged || parsed.parentId !== undefined) updateData.parentId = targetParentId;
    if (position !== undefined) updateData.position = position;

    const tx: Prisma.PrismaPromise<unknown>[] = [];

    if (parsed.content) {
      tx.push(prisma.contentBlock.deleteMany({ where: { sectionId: id } }));
      tx.push(
        prisma.contentBlock.createMany({
          data: parsed.content.map((block, index) => ({
            sectionId: id,
            order: index,
            type: block.type,
            payload: contentPayload(block),
          })),
        }),
      );
    }

    tx.push(
      prisma.section.update({
        where: { id },
        data: updateData,
      }),
    );

    await prisma.$transaction(tx);
    revalidatePath("/");
    return NextResponse.json({ status: "updated", id });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.flatten() }, { status: 400 });
    }
    console.error(error);
    return NextResponse.json({ error: "Unexpected server error." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: ParamsContext) {
  try {
    const { id: paramId } = await params;
    const url = req.nextUrl;
    const fromPath = url?.pathname?.split("/").filter(Boolean).pop();
    const id = (paramId || fromPath || "").trim();

    if (!id) {
      return NextResponse.json({ error: "Missing section id." }, { status: 400 });
    }

    const descendants = await collectDescendants(id);
    const idsToDelete = Array.from(new Set<string>([id, ...descendants])).filter(Boolean);

    if (idsToDelete.length === 0) {
      return NextResponse.json({ error: "Section not found." }, { status: 404 });
    }

    await prisma.$transaction([
      prisma.contentBlock.deleteMany({ where: { sectionId: { in: idsToDelete } } }),
      prisma.section.deleteMany({ where: { id: { in: idsToDelete } } }),
    ]);

    revalidatePath("/");
    return NextResponse.json({ status: "deleted", ids: idsToDelete });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Section not found." }, { status: 404 });
    }
    console.error("DELETE /api/sections/[id] failed", error);
    return NextResponse.json(
      { error: "Unexpected error while deleting section.", detail: String(error) },
      { status: 500 },
    );
  }
}
