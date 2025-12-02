export type TextStyle = {
  fontSize?: "sm" | "base" | "lg" | "xl";
  fontWeight?: "normal" | "medium" | "semibold" | "bold";
  accent?: boolean;
  highlight?: boolean;
};

export type ListItem = string | { text: string; style?: TextStyle };

export type ContentBlock =
  | { type: "paragraph"; text: string; style?: TextStyle }
  | { type: "list"; title?: string; items: ListItem[] }
  | { type: "code"; language?: string; title?: string; value: string }
  | { type: "image"; alt: string; src: string; caption?: string }
  | { type: "video"; title?: string; youtubeId: string };

export type Section = {
  id: string;
  title: string;
  summary?: string;
  addedAt?: string;
  updatedAt?: string;
  content?: ContentBlock[];
  children?: Section[];
};

export type WikiData = {
  title: string;
  tagline?: string;
  sections: Section[];
};

export function findSectionById(id: string, sections: Section[]): Section | null {
  for (const section of sections) {
    if (section.id === id) return section;
    if (section.children) {
      const match = findSectionById(id, section.children);
      if (match) return match;
    }
  }
  return null;
}

export function flattenSectionIds(sections: Section[]): string[] {
  return sections.flatMap((section) => [
    section.id,
    ...(section.children ? flattenSectionIds(section.children) : []),
  ]);
}

export function collectSectionPaths(
  sections: Section[],
  prefix: string[] = [],
): { ids: string[]; section: Section }[] {
  return sections.flatMap((section) => {
    const path = [...prefix, section.id];
    const current = { ids: path, section };
    const children = section.children ? collectSectionPaths(section.children, path) : [];
    return [current, ...children];
  });
}

export function collectLeafPaths(
  sections: Section[],
  prefix: string[] = [],
): { ids: string[]; section: Section }[] {
  return sections.flatMap((section) => {
    const path = [...prefix, section.id];
    if (!section.children || section.children.length === 0) {
      return [{ ids: path, section }];
    }
    return collectLeafPaths(section.children, path);
  });
}

export function findSectionByPath(ids: string[], sections: Section[]): Section | null {
  if (!ids || ids.length === 0) return null;
  const [head, ...rest] = ids;
  const match = sections.find((s) => s.id === head);
  if (!match) return null;
  if (rest.length === 0) return match;
  if (!match.children) return null;
  return findSectionByPath(rest, match.children);
}

export function findFirstLeafPathFromSection(
  section: Section,
  prefix: string[],
): string[] | null {
  if (!section.children || section.children.length === 0) {
    return prefix;
  }
  for (const child of section.children) {
    const childPath = findFirstLeafPathFromSection(child, [...prefix, child.id]);
    if (childPath) return childPath;
  }
  return null;
}

export function findPathToSection(
  id: string,
  sections: Section[],
  path: string[] = [],
): string[] | null {
  for (const section of sections) {
    const nextPath = [...path, section.id];
    if (section.id === id) return nextPath;
    if (section.children) {
      const match = findPathToSection(id, section.children, nextPath);
      if (match) return match;
    }
  }
  return null;
}
