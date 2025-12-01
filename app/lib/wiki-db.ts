import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import type { Section, WikiData, ContentBlock } from "./wiki";

type DbSection = Prisma.SectionGetPayload<{
  include: { content: true };
}>;

type SectionNode = {
  id: string;
  title: string;
  summary?: string;
  addedAt?: string;
  updatedAt?: string;
  content?: ContentBlock[];
  children: SectionNode[];
  position: number;
};

const formatDate = (date: Date | null | undefined): string | undefined =>
  date ? date.toISOString().slice(0, 10) : undefined;

const toContentBlock = (block: DbSection["content"][number]): ContentBlock => {
  const payload = (block.payload || {}) as Record<string, unknown>;
  return { type: block.type, ...payload } as ContentBlock;
};

function stripPosition(node: SectionNode): Section {
  return {
    id: node.id,
    title: node.title,
    summary: node.summary,
    addedAt: node.addedAt,
    updatedAt: node.updatedAt,
    content: node.content && node.content.length > 0 ? node.content : undefined,
    children:
      node.children.length > 0 ? node.children.map((child) => stripPosition(child)) : undefined,
  };
}

function sortTree(node: SectionNode): SectionNode {
  node.children = node.children
    .sort((a, b) => a.position - b.position)
    .map((child) => sortTree(child));
  return node;
}

export function buildSectionTree(rows: DbSection[]): Section[] {
  const nodes = new Map<string, SectionNode>();
  const roots: SectionNode[] = [];

  for (const row of rows) {
    nodes.set(row.id, {
      id: row.id,
      title: row.title,
      summary: row.summary ?? undefined,
      addedAt: formatDate(row.addedAt),
      updatedAt: formatDate(row.updatedAt),
      content: row.content.length ? row.content.map(toContentBlock) : undefined,
      children: [],
      position: row.position,
    });
  }

  for (const row of rows) {
    const node = nodes.get(row.id);
    if (!node) continue;
    if (row.parentId) {
      const parent = nodes.get(row.parentId);
      if (parent) parent.children.push(node);
    } else {
      roots.push(node);
    }
  }

  const sortedRoots = roots.sort((a, b) => a.position - b.position).map(sortTree);
  return sortedRoots.map((node) => stripPosition(node));
}

export async function fetchWikiSections(): Promise<Section[]> {
  const rows = await prisma.section.findMany({
    include: { content: { orderBy: { order: "asc" } } },
    orderBy: [{ parentId: "asc" }, { position: "asc" }],
  });
  return buildSectionTree(rows);
}

export async function getWikiData(meta?: { title?: string; tagline?: string }): Promise<WikiData> {
  const sections = await fetchWikiSections();
  return {
    title: meta?.title ?? "Wiki",
    tagline: meta?.tagline,
    sections,
  };
}
