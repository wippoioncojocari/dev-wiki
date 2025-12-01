import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/app/lib/prisma";
import { fetchWikiSections } from "@/app/lib/wiki-db";
import { contentPayload, createSectionSchema } from "@/app/lib/validation";
import { ZodError } from "zod";

async function nextPosition(parentId: string | null): Promise<number> {
  const result = await prisma.section.aggregate({
    _max: { position: true },
    where: { parentId },
  });
  const current = result._max.position ?? -1;
  return current + 1;
}

export async function GET() {
  const sections = await fetchWikiSections();
  return NextResponse.json({ sections });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = createSectionSchema.parse(body);

    const exists = await prisma.section.findUnique({ where: { id: parsed.id } });
    if (exists) {
      return NextResponse.json({ error: "Section id already exists." }, { status: 409 });
    }

    if (parsed.parentId) {
      const parent = await prisma.section.findUnique({
        where: { id: parsed.parentId },
      });
      if (!parent) {
        return NextResponse.json({ error: "Parent section not found." }, { status: 404 });
      }
    }

    const position = parsed.position ?? (await nextPosition(parsed.parentId ?? null));
    const now = new Date();

    await prisma.section.create({
      data: {
        id: parsed.id,
        title: parsed.title,
        summary: parsed.summary,
        addedAt: now,
        updatedAt: now,
        parentId: parsed.parentId ?? null,
        position,
        content: parsed.content
          ? {
              create: parsed.content.map((block, index) => ({
                order: index,
                type: block.type,
                payload: contentPayload(block),
              })),
            }
          : undefined,
      },
    });

    revalidatePath("/");
    return NextResponse.json({ status: "created", id: parsed.id }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.flatten() }, { status: 400 });
    }
    console.error(error);
    return NextResponse.json({ error: "Unexpected server error." }, { status: 500 });
  }
}
