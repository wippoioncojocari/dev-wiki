"use client";

import { useMemo } from "react";
import { Section, findFirstLeafPathFromSection } from "../lib/wiki";
import { ChevronDownIcon, ChevronRightIcon } from "./icons";

type Props = {
  sections: Section[];
  activeSlug: string[];
  onSelect: (path: string[]) => void;
  depth?: number;
  prefix?: string[];
  accentColor?: string;
  accentStrong?: string;
};

export function NavigationTree({
  sections,
  activeSlug,
  onSelect,
  depth = 0,
  prefix = [],
  accentColor = "var(--accent)",
  accentStrong = "var(--accent-strong)",
}: Props) {
  const items = useMemo(
    () =>
      sections.map((section) => {
        const currentPath = [...prefix, section.id];
        const leafPath =
          (section.children && findFirstLeafPathFromSection(section, currentPath)) || currentPath;
        const isActive =
          activeSlug.length === currentPath.length &&
          activeSlug.every((slugPart, idx) => slugPart === currentPath[idx]);
        const isOpen = currentPath.every((slugPart, idx) => activeSlug[idx] === slugPart);
        return { section, isActive, isOpen, currentPath, leafPath };
      }),
    [sections, activeSlug, prefix],
  );

  return (
    <div className="space-y-1">
      {items.map(({ section, isActive, isOpen, currentPath, leafPath }) => {
        const hasChildren = section.children && section.children.length > 0;
        return (
          <div key={section.id} className="space-y-1">
            <button
              onClick={() => onSelect(leafPath)}
              className={`group flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition ${
                isActive
                  ? "bg-slate-800 text-white shadow-sm ring-1"
                  : "text-slate-400 hover:bg-slate-800/60 hover:text-white"
              }`}
              style={{
                paddingLeft: 12 + depth * 12,
                boxShadow: isActive ? `0 0 0 1px ${accentColor}40` : undefined,
                borderColor: isActive ? `${accentColor}40` : undefined,
              }}
            >
              <span className="flex items-center gap-2">
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: accentStrong }}
                />
                {section.title}
              </span>
              {hasChildren ? (
                <span className="text-slate-500 group-hover:text-slate-300">
                  {isOpen ? <ChevronDownIcon /> : <ChevronRightIcon />}
                </span>
              ) : null}
            </button>
            {hasChildren && isOpen ? (
              <div className="pl-5">
                <NavigationTree
                  sections={section.children!}
                  activeSlug={activeSlug}
                  onSelect={onSelect}
                  depth={depth + 1}
                  prefix={currentPath}
                />
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
