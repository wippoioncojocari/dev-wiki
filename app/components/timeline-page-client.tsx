"use client";

import Link from "next/link";
import { useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type TimelineItem = {
  slug: string[];
  title: string;
  summary?: string;
  addedAt?: string | null;
  updatedAt?: string | null;
  rootId: string;
  rootTitle: string;
};

function parseDate(value?: string | null): number | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.getTime();
}

export function TimelinePageClient({ items }: { items: TimelineItem[] }) {
  const search = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const compartment = search.get("compartment") || "all";
  const from = search.get("from") || "";
  const to = search.get("to") || "";

  const compartments = useMemo(() => {
    const unique = new Map<string, string>();
    items.forEach((item) => unique.set(item.rootId, item.rootTitle));
    return Array.from(unique.entries()).map(([id, title]) => ({ id, title }));
  }, [items]);

  const filtered = useMemo(() => {
    const fromTs = parseDate(from);
    const toTs = parseDate(to);

    return items
      .filter((item) => {
        if (compartment !== "all" && item.rootId !== compartment) return false;

        const effective = parseDate(item.updatedAt) ?? parseDate(item.addedAt);
        if (fromTs !== null && effective !== null && effective < fromTs) return false;
        if (toTs !== null && effective !== null && effective > toTs) return false;
        return true;
      })
      .sort((a, b) => {
        const aDate = parseDate(a.updatedAt) ?? parseDate(a.addedAt) ?? 0;
        const bDate = parseDate(b.updatedAt) ?? parseDate(b.addedAt) ?? 0;
        return bDate - aDate;
      });
  }, [items, compartment, from, to]);

  const updateQuery = (next: Record<string, string>) => {
    const params = new URLSearchParams(search.toString());
    Object.entries(next).forEach(([key, value]) => {
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    });
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[-10%] top-[-10%] h-72 w-72 rounded-full bg-blue-500/15 blur-3xl" />
        <div className="absolute right-[-10%] top-[40%] h-80 w-80 rounded-full bg-cyan-500/10 blur-3xl" />
      </div>

      <header className="relative border-b border-slate-800 bg-slate-900/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-blue-300">
              Cronologie articole
            </p>
            <h1 className="text-2xl font-semibold text-white">Actualizari dupa data</h1>
            <p className="text-sm text-slate-300">
              Filtreaza dupa compartiment si interval de timp. Filtrele raman in URL.
            </p>
          </div>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full border border-slate-700 px-4 py-2 text-sm font-medium text-slate-100 transition hover:border-slate-500 hover:bg-slate-800"
          >
            Inapoi la wiki
          </Link>
        </div>
      </header>

      <main className="relative mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
        <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 shadow-sm backdrop-blur sm:p-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-[0.14em] text-slate-400">
                Compartiment
              </label>
              <select
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none ring-1 ring-transparent transition hover:border-slate-500 focus:ring-blue-500/60"
                value={compartment}
                onChange={(e) => updateQuery({ compartment: e.target.value })}
              >
                <option value="all">Toate</option>
                {compartments.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-[0.14em] text-slate-400">De la</label>
              <input
                type="date"
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none ring-1 ring-transparent transition hover:border-slate-500 focus:ring-blue-500/60"
                value={from}
                onChange={(e) => updateQuery({ from: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-[0.14em] text-slate-400">Pana la</label>
              <input
                type="date"
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none ring-1 ring-transparent transition hover:border-slate-500 focus:ring-blue-500/60"
                value={to}
                onChange={(e) => updateQuery({ to: e.target.value })}
              />
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between text-sm text-slate-400">
            <span>{filtered.length} articole</span>
            <button
              className="text-blue-300 underline-offset-4 hover:underline"
              onClick={() => updateQuery({ compartment: "", from: "", to: "" })}
            >
              Reseteaza filtrele
            </button>
          </div>
        </section>

        <section className="space-y-3">
          {filtered.map((item) => {
            const added = parseDate(item.addedAt);
            const updated = parseDate(item.updatedAt);
            const effective = updated ?? added;
            const displayDate = effective
              ? new Intl.DateTimeFormat("ro-RO", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                }).format(effective)
              : "Fara data";

            return (
              <Link
                key={item.slug.join("-")}
                href={`/${item.slug.join("/")}`}
                className="block rounded-2xl border border-slate-800 bg-slate-900/80 p-5 transition hover:border-blue-500/40 hover:bg-slate-900/90"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <span className="rounded-full bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-200">
                      {displayDate}
                    </span>
                    <span className="rounded-full border border-slate-700 bg-slate-800 px-3 py-1 text-xs text-slate-200">
                      {item.rootTitle}
                    </span>
                  </div>
                  <span className="text-xs text-slate-500">
                    Actualizat:{" "}
                    {updated
                      ? new Intl.DateTimeFormat("ro-RO", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        }).format(updated)
                      : "n/a"}
                  </span>
                </div>
                <h3 className="mt-3 text-lg font-semibold text-white">{item.title}</h3>
                {item.summary ? (
                  <p className="mt-1 text-sm text-slate-300 line-clamp-2">{item.summary}</p>
                ) : null}
              </Link>
            );
          })}

          {filtered.length === 0 ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 text-center text-sm text-slate-400">
              Nicio inregistrare pentru filtrele selectate.
            </div>
          ) : null}
        </section>
      </main>
    </div>
  );
}
