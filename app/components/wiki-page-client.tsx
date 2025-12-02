"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { ContentRenderer } from "./content-renderer";
import { ArrowUpRightIcon, ExternalLinkIcon } from "./icons";
import { NavigationTree } from "./navigation-tree";
import Link from "next/link";
import {
  Section,
  WikiData,
  findSectionByPath,
  collectLeafPaths,
  findFirstLeafPathFromSection,
} from "../lib/wiki";

type Props = {
  data: WikiData;
  activeSlug: string[];
};

export function WikiPageClient({ data, activeSlug }: Props) {
  const router = useRouter();
  const [navOpen, setNavOpen] = useState(false);
  const [showThemes, setShowThemes] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const popupRef = useRef<HTMLDivElement | null>(null);
  const [popupPosition, setPopupPosition] = useState<{ top: number; left: number } | null>(null);
  const [palette, setPalette] = useState<
    { name: string; accent: string; accentSoft: string; accentStrong: string; glow1: string; glow2: string }
  >({
    name: "Blue",
    accent: "#60a5fa",
    accentSoft: "rgba(96,165,250,0.15)",
    accentStrong: "#3b82f6",
    glow1: "rgba(96,165,250,0.2)",
    glow2: "rgba(14,165,233,0.14)",
  });

  const palettes = [
    {
      name: "Blue",
      accent: "#60a5fa",
      accentSoft: "rgba(96,165,250,0.15)",
      accentStrong: "#3b82f6",
      glow1: "rgba(96,165,250,0.2)",
      glow2: "rgba(14,165,233,0.14)",
    },
    {
      name: "Violet",
      accent: "#a78bfa",
      accentSoft: "rgba(167,139,250,0.15)",
      accentStrong: "#8b5cf6",
      glow1: "rgba(167,139,250,0.2)",
      glow2: "rgba(124,58,237,0.12)",
    },
    {
      name: "Teal",
      accent: "#5eead4",
      accentSoft: "rgba(94,234,212,0.14)",
      accentStrong: "#14b8a6",
      glow1: "rgba(94,234,212,0.2)",
      glow2: "rgba(45,212,191,0.14)",
    },
    {
      name: "Amber",
      accent: "#fbbf24",
      accentSoft: "rgba(251,191,36,0.16)",
      accentStrong: "#f59e0b",
      glow1: "rgba(251,191,36,0.2)",
      glow2: "rgba(249,115,22,0.12)",
    },
    {
      name: "Rose",
      accent: "#fb7185",
      accentSoft: "rgba(251,113,133,0.16)",
      accentStrong: "#f43f5e",
      glow1: "rgba(251,113,133,0.2)",
      glow2: "rgba(244,63,94,0.12)",
    },
    {
      name: "Mint",
      accent: "#34d399",
      accentSoft: "rgba(52,211,153,0.16)",
      accentStrong: "#10b981",
      glow1: "rgba(52,211,153,0.2)",
      glow2: "rgba(16,185,129,0.12)",
    },
  ];

  useEffect(() => {
    if (!showThemes) return;
    const handler = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        popupRef.current &&
        !popupRef.current.contains(target) &&
        triggerRef.current &&
        !triggerRef.current.contains(target)
      ) {
        setShowThemes(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showThemes]);

  useEffect(() => {
    if (!showThemes || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setPopupPosition({
      top: rect.bottom + 10 + window.scrollY,
      left: rect.left + rect.width / 2 + window.scrollX,
    });
  }, [showThemes]);

  const formatDate = (value?: string) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return new Intl.DateTimeFormat("ro-RO", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(date);
  };

  const fallbackSlug = useMemo(
    () => collectLeafPaths(data.sections)[0]?.ids ?? [],
    [data.sections],
  );

  const activeSection: Section | null =
    findSectionByPath(activeSlug, data.sections) ||
    findSectionByPath(fallbackSlug, data.sections);

  const resolvedSlug =
    activeSection &&
    (findFirstLeafPathFromSection(activeSection, activeSlug) ||
      findFirstLeafPathFromSection(activeSection, fallbackSlug) ||
      fallbackSlug) ||
    fallbackSlug;

  const handleSelect = (path: string[]) => {
    const href = `/${path.join("/")}`;
    router.push(href);
    setNavOpen(false);
  };

  return (
    <div
      className="relative min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950"
      style={
        {
          "--accent": palette.accent,
          "--accent-soft": palette.accentSoft,
          "--accent-strong": palette.accentStrong,
        } as React.CSSProperties
      }
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute left-[-20%] top-[-10%] h-72 w-72 rounded-full blur-3xl"
          style={{ backgroundColor: palette.glow1 }}
        />
        <div
          className="absolute right-[-10%] top-[30%] h-80 w-80 rounded-full blur-3xl"
          style={{ backgroundColor: palette.glow2 }}
        />
      </div>

      <header className="relative border-b border-slate-800 bg-slate-900/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--accent)]">
              Wiki pentru dezvoltatori
            </p>
            <h1 className="text-2xl font-semibold text-white">{data.title}</h1>
            {data.tagline ? (
              <p className="text-sm text-slate-300">{data.tagline}</p>
            ) : null}
          </div>
          <div className="relative flex items-center gap-3">
            <button
              ref={triggerRef}
              onClick={() => setShowThemes((v) => !v)}
              className="group inline-flex items-center gap-2 self-start rounded-full border border-slate-700 px-4 py-2 text-sm font-medium text-slate-100 transition hover:border-slate-500 hover:bg-slate-800"
            >
              Tema ({palette.name})
              <ExternalLinkIcon className="text-slate-400 group-hover:text-slate-200" />
            </button>
            <Link
              href="/cronologie"
              className="inline-flex items-center gap-2 rounded-full border border-slate-700 px-4 py-2 text-sm font-medium text-slate-100 transition hover:border-slate-500 hover:bg-slate-800"
            >
              Cronologie articole
            </Link>
          </div>
        </div>
      </header>

      {showThemes && popupPosition
        ? createPortal(
            <div
              ref={popupRef}
              className="z-50 w-64 rounded-2xl border border-slate-800 bg-slate-900/90 p-3 shadow-2xl backdrop-blur"
              style={{
                position: "absolute",
                top: popupPosition.top,
                left: popupPosition.left,
                transform: "translateX(-50%)",
              }}
            >
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                  Accente
                </p>
                <button
                  className="text-xs text-slate-500 hover:text-slate-200"
                  onClick={() => setShowThemes(false)}
                >
                  Close
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {palettes.map((p) => (
                  <button
                    key={p.name}
                    onClick={() => {
                      setPalette(p);
                      setShowThemes(false);
                    }}
                    className={`flex items-center gap-2 rounded-xl border px-2 py-2 text-xs text-slate-100 transition ${
                      palette.name === p.name
                        ? "border-[color:var(--accent)] bg-slate-800"
                        : "border-slate-700 hover:border-slate-500 hover:bg-slate-800/60"
                    }`}
                    style={
                      {
                        "--accent": p.accent,
                      } as React.CSSProperties
                    }
                  >
                    <span
                      className="h-6 w-6 rounded-lg border border-slate-700"
                      style={{ background: `linear-gradient(135deg, ${p.glow1}, ${p.glow2})` }}
                    />
                    {p.name}
                  </button>
                ))}
              </div>
            </div>,
            document.body,
          )
        : null}

      <main className="relative mx-auto flex min-h-screen max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 lg:flex-row lg:gap-10 lg:py-10">
        <div className="lg:hidden">
          <div className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-900/90 p-4 shadow-sm backdrop-blur">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--accent)]">
                Sectiuni
              </p>
              <p className="text-sm text-slate-300">Atinge pentru a rasfoi wiki-ul</p>
            </div>
            <button
              className="rounded-full border px-3 py-2 text-sm font-semibold text-[color:var(--accent)] shadow-sm transition hover:bg-slate-800"
              style={{ borderColor: "var(--accent-soft)", backgroundColor: "var(--accent-soft)" }}
              onClick={() => setNavOpen(true)}
            >
              Deschide meniul
            </button>
          </div>
        </div>

        <aside className="sticky top-6 hidden h-fit w-72 rounded-2xl border border-slate-800 bg-slate-900/80 p-4 shadow-sm backdrop-blur lg:block">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--accent)]">
                Sectiuni
              </p>
              <p className="text-sm text-slate-300">Administreaza din backend (API sau Prisma Studio)</p>
            </div>
            <ArrowUpRightIcon />
          </div>
          <NavigationTree
            sections={data.sections}
            activeSlug={resolvedSlug}
            onSelect={handleSelect}
            accentColor="var(--accent)"
            accentStrong="var(--accent-strong)"
          />
        </aside>

        <section className="w-full max-w-3xl space-y-8 rounded-2xl border border-slate-800 bg-slate-900/90 p-6 shadow-sm backdrop-blur sm:p-8 lg:p-10">
          {activeSection ? (
            <>
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[color:var(--accent)]">
                  {activeSection.id}
                </p>
                <h2 className="text-3xl font-semibold text-white">{activeSection.title}</h2>
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                  {activeSection.addedAt ? (
                    <span className="rounded-full border border-slate-700 bg-slate-800 px-3 py-1 text-[color:var(--accent)] border-[color:var(--accent-soft)]">
                      Adaugat: {formatDate(activeSection.addedAt)}
                    </span>
                  ) : null}
                  {activeSection.updatedAt ? (
                    <span className="rounded-full border border-slate-700 bg-slate-800 px-3 py-1 text-[color:var(--accent)] border-[color:var(--accent-soft)]">
                      Actualizat: {formatDate(activeSection.updatedAt)}
                    </span>
                  ) : null}
                </div>
                {activeSection.summary ? (
                  <p className="text-base text-slate-300">{activeSection.summary}</p>
                ) : null}
              </div>
              {activeSection.content ? (
                <ContentRenderer blocks={activeSection.content} />
              ) : (
                <p className="text-sm text-slate-400">
                  Sectiunea nu are continut inca.
                </p>
              )}
            </>
          ) : (
            <p className="text-sm text-slate-400">Selecteaza o sectiune pentru a vedea documentatia.</p>
          )}
        </section>
      </main>

      {navOpen ? (
        <div className="fixed inset-0 z-30 flex items-start justify-start bg-black/60 backdrop-blur-sm lg:hidden">
          <div className="h-full w-full max-w-full border-r border-slate-800 bg-slate-900 p-4 shadow-2xl">
            <div className="mb-3 flex items-center justify-between">
              <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--accent)]">
                  Sectiuni
                </p>
                <p className="text-sm text-slate-300">Rasfoieste si selecteaza subiecte</p>
              </div>
              <button
                className="rounded-full border border-slate-700 px-3 py-1 text-xs font-semibold text-slate-200 transition hover:bg-slate-800"
                onClick={() => setNavOpen(false)}
              >
                Inchide
              </button>
            </div>
            <NavigationTree
              sections={data.sections}
              activeSlug={resolvedSlug}
              onSelect={handleSelect}
              accentColor="var(--accent)"
              accentStrong="var(--accent-strong)"
            />
          </div>
          <button
            className="h-full w-full cursor-pointer"
            aria-label="Inchide navigarea"
            onClick={() => setNavOpen(false)}
          />
        </div>
      ) : null}
    </div>
  );
}
