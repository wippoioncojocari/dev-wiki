import Image from "next/image";
import Link from "next/link";
import React from "react";
import { ContentBlock, ListItem, TextStyle } from "../lib/wiki";

type RichSegment =
  | { type: "text"; value: string }
  | { type: "link"; href: string; label: string; external: boolean };

const anchorPattern = /<a\s+[^>]*href=(["'])(.*?)\1[^>]*>([\s\S]*?)<\/a>/gi;

function stripTags(value: string): string {
  return value.replace(/<\/?[^>]+>/g, "");
}

function parseHref(rawHref: string): { href: string; external: boolean } | null {
  const href = rawHref.trim();
  if (/^https?:\/\//i.test(href)) {
    return { href, external: true };
  }
  if (/^(\/(?!\/)|#|mailto:|tel:)/i.test(href)) {
    return { href, external: false };
  }
  return null;
}

function parseRichText(input: string): RichSegment[] {
  const segments: RichSegment[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  anchorPattern.lastIndex = 0;

  while ((match = anchorPattern.exec(input)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: "text", value: input.slice(lastIndex, match.index) });
    }

    const parsedHref = parseHref(match[2]);
    const label = stripTags(match[3]) || match[2];

    if (parsedHref) {
      segments.push({
        type: "link",
        href: parsedHref.href,
        label,
        external: parsedHref.external,
      });
    } else {
      segments.push({ type: "text", value: match[0] });
    }

    lastIndex = anchorPattern.lastIndex;
  }

  if (lastIndex < input.length) {
    segments.push({ type: "text", value: input.slice(lastIndex) });
  }

  return segments;
}

function renderRichText(input: string, keyPrefix: string): React.ReactNode[] {
  const linkClassName =
    "text-[color:var(--accent)] underline decoration-[color:var(--accent-soft)] underline-offset-4 transition hover:text-white";

  return parseRichText(input).map((segment, index) => {
    if (segment.type === "text") {
      return <React.Fragment key={`${keyPrefix}-text-${index}`}>{segment.value}</React.Fragment>;
    }

    if (segment.external) {
      return (
        <a
          key={`${keyPrefix}-link-${index}`}
          href={segment.href}
          target="_blank"
          rel="noreferrer noopener"
          className={linkClassName}
        >
          {segment.label}
        </a>
      );
    }

    return (
      <Link key={`${keyPrefix}-link-${index}`} href={segment.href} className={linkClassName}>
        {segment.label}
      </Link>
    );
  });
}

function textClasses(style: TextStyle | undefined, fallbackSize: string, fallbackColor: string) {
  const sizeMap: Record<NonNullable<TextStyle["fontSize"]>, string> = {
    sm: "text-sm leading-6",
    base: "text-base leading-7",
    lg: "text-lg leading-8",
    xl: "text-xl leading-8",
  };
  const weightMap: Record<NonNullable<TextStyle["fontWeight"]>, string> = {
    normal: "font-normal",
    medium: "font-medium",
    semibold: "font-semibold",
    bold: "font-bold",
  };

  const sizeClass = style?.fontSize ? sizeMap[style.fontSize] : fallbackSize;
  const weightClass = style?.fontWeight ? weightMap[style.fontWeight] : "font-normal";
  const colorClass = style?.accent ? "text-[color:var(--accent)]" : fallbackColor;
  const highlightClass = style?.highlight ? "bg-[color:var(--accent-soft)] rounded px-1" : "";

  return `${sizeClass} ${weightClass} ${colorClass} ${highlightClass}`.trim();
}

function normalizeListItem(item: ListItem): { text: string; style?: TextStyle } {
  if (typeof item === "string") {
    return { text: item, style: undefined };
  }
  return { text: item.text, style: item.style };
}

export function ContentRenderer({ blocks }: { blocks: ContentBlock[] }) {
  return (
    <div className="space-y-8">
      {blocks.map((block, index) => {
        if (block.type === "paragraph") {
          return (
            <p
              key={index}
              className={textClasses(block.style, "text-base leading-7", "text-slate-200")}
            >
              {renderRichText(block.text, `p-${index}`)}
            </p>
          );
        }

        if (block.type === "list") {
          return (
            <div key={index} className="space-y-2">
              {block.title ? (
                <p className="text-sm font-semibold uppercase tracking-[0.08em] text-[color:var(--accent)]">
                  {block.title}
                </p>
              ) : null}
              <ul className="space-y-2 rounded-xl border border-slate-800/80 bg-slate-900/70 p-4 shadow-sm ring-1 ring-[color:var(--accent-soft)]">
                {(block.items ?? []).map((item, itemIndex) => {
                  const normalized = normalizeListItem(item);
                  return (
                    <li
                      key={`${normalized.text}-${itemIndex}`}
                      className="flex items-start gap-2 text-sm text-slate-200"
                    >
                      <span
                        className="mt-1 h-2 w-2 rounded-full"
                        style={{ backgroundColor: "var(--accent-strong)" }}
                        aria-hidden
                      />
                      <span
                        className={textClasses(
                          normalized.style,
                          "text-sm leading-6",
                          "text-slate-200",
                        )}
                      >
                        {renderRichText(normalized.text, `list-${index}-${itemIndex}`)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        }

        if (block.type === "code") {
          return (
            <div
              key={index}
              className="overflow-hidden rounded-xl border border-slate-800 bg-slate-950 shadow-md ring-1 ring-[color:var(--accent-soft)]"
            >
              <div className="flex items-center justify-between border-b border-white/10 px-4 py-2 text-xs uppercase tracking-[0.08em] text-slate-300">
                <span>{block.title || "Code"}</span>
                <span className="rounded-full bg-[color:var(--accent-soft)] px-2 py-1 font-mono text-[10px] text-[color:var(--accent)]">
                  {block.language || "text"}
                </span>
              </div>
              <pre className="overflow-x-auto p-4 text-sm leading-7 text-emerald-100">
                <code>{block.value}</code>
              </pre>
            </div>
          );
        }

        if (block.type === "image") {
          return (
            <figure
              key={index}
              className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-sm ring-1 ring-[color:var(--accent-soft)]"
            >
              <Image
                src={block.src}
                alt={block.alt}
                width={1200}
                height={800}
                unoptimized
                className="h-auto w-full object-cover transition duration-300 hover:scale-[1.01]"
              />
              {block.caption ? (
                <figcaption className="border-t border-slate-800 px-4 py-3 text-sm text-slate-300">
                  {block.caption}
                </figcaption>
              ) : null}
            </figure>
          );
        }

        if (block.type === "video") {
          return (
            <div key={index} className="space-y-2">
              {block.title ? (
                <p className="text-sm font-semibold uppercase tracking-[0.08em] text-[color:var(--accent)]">
                  {block.title}
                </p>
              ) : null}
              <div className="overflow-hidden rounded-2xl border border-slate-800 bg-black shadow-md ring-1 ring-[color:var(--accent-soft)]">
                <div className="relative aspect-video w-full">
                  <iframe
                    src={`https://www.youtube.com/embed/${block.youtubeId}`}
                    title={block.title || "YouTube video"}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="absolute left-0 top-0 h-full w-full"
                  />
                </div>
              </div>
            </div>
          );
        }

        return null;
      })}
    </div>
  );
}
