import { PrismaClient } from "@prisma/client";
import wikiData from "../app/wiki-data.json" with { type: "json" };

const prisma = new PrismaClient();

const toPayload = (block) => {
  const { type: _omit, ...payload } = block;
  void _omit;
  return payload;
};

async function insertSection(section, parentId = null, position = 0) {
  const addedAt = section.addedAt ? new Date(section.addedAt) : new Date();
  const updatedAt = section.updatedAt ? new Date(section.updatedAt) : addedAt;

  await prisma.section.create({
    data: {
      id: section.id,
      title: section.title,
      summary: section.summary ?? null,
      addedAt,
      updatedAt,
      parentId,
      position,
      content: section.content
        ? {
            create: section.content.map((block, index) => ({
              order: index,
              type: block.type,
              payload: toPayload(block),
            })),
          }
        : undefined,
    },
  });

  if (section.children && section.children.length > 0) {
    for (const [index, child] of section.children.entries()) {
      await insertSection(child, section.id, index);
    }
  }
}

async function main() {
  await prisma.contentBlock.deleteMany();
  await prisma.section.deleteMany();
  for (const [index, section] of (wikiData.sections || []).entries()) {
    await insertSection(section, null, index);
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
