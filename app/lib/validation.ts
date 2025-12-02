import { z } from "zod";
import { Prisma } from "@prisma/client";

const textStyleSchema = z.object({
  fontSize: z.enum(["sm", "base", "lg", "xl"]).optional(),
  fontWeight: z.enum(["normal", "medium", "semibold", "bold"]).optional(),
  accent: z.boolean().optional(),
  highlight: z.boolean().optional(),
});

export const contentBlockSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("paragraph"),
    text: z.string().min(1),
    style: textStyleSchema.optional(),
  }),
  z.object({
    type: z.literal("list"),
    title: z.string().optional(),
    items: z
      .array(
        z.union([
          z.string().min(1),
          z.object({
            text: z.string().min(1),
            style: textStyleSchema.optional(),
          }),
        ]),
      )
      .min(1),
  }),
  z.object({
    type: z.literal("code"),
    title: z.string().optional(),
    language: z.string().optional(),
    value: z.string().min(1),
  }),
  z.object({
    type: z.literal("image"),
    alt: z.string().min(1),
    src: z.string().url(),
    caption: z.string().optional(),
  }),
  z.object({
    type: z.literal("video"),
    title: z.string().optional(),
    youtubeId: z.string().min(1),
  }),
]);

export const createSectionSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  summary: z.string().optional(),
  parentId: z.string().optional(),
  position: z.number().int().nonnegative().optional(),
  content: z.array(contentBlockSchema).optional(),
});

export const updateSectionSchema = z.object({
  title: z.string().min(1).optional(),
  summary: z.string().optional(),
  parentId: z.string().nullable().optional(),
  position: z.number().int().nonnegative().optional(),
  content: z.array(contentBlockSchema).optional(),
});

export type ContentBlockInput = z.infer<typeof contentBlockSchema>;
export type CreateSectionInput = z.infer<typeof createSectionSchema>;
export type UpdateSectionInput = z.infer<typeof updateSectionSchema>;

export function contentPayload(block: ContentBlockInput): Prisma.InputJsonValue {
  const { type: _omit, ...payload } = block;
  void _omit;
  return payload as Prisma.InputJsonValue;
}
