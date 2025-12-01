"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { collectSectionPaths, Section } from "../lib/wiki";

type Props = {
  sections: Section[];
};

export function DeleteSectionForm({ sections }: Props) {
  const router = useRouter();
  const [sectionId, setSectionId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const options = useMemo(
    () => collectSectionPaths(sections).map(({ ids, section }) => ({ id: section.id, label: ids.join(" / ") })),
    [sections],
  );

  const resetMessages = () => {
    setError(null);
    setSuccess(null);
  };

  const doDelete = async () => {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/sections/${encodeURIComponent(sectionId)}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body?.error || "Nu s-a putut sterge sectiunea.");
        return;
      }
      setSuccess("Sectiunea a fost stearsa.");
      setSectionId("");
      setConfirming(false);
      router.refresh();
    } catch {
      setError("Eroare neasteptata. Incearca din nou.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    resetMessages();
    if (!sectionId) {
      setError("Selecteaza o sectiune.");
      return;
    }
    setConfirming(true);
  };

  return (
    <div className="rounded-2xl border border-rose-700/60 bg-rose-950/20 p-5 shadow-sm backdrop-blur">
      <div className="mb-3 space-y-1">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-rose-300">Sterge sectiune</p>
        <p className="text-sm text-rose-100">Atentie: sterge si toti descendentii.</p>
      </div>
      <form className="space-y-3" onSubmit={handleSubmit}>
        <label className="flex flex-col gap-1 text-sm text-rose-50">
          Alege sectiunea
          <select
            value={sectionId}
            onChange={(e) => {
              resetMessages();
              setSectionId(e.target.value);
            }}
            className="rounded-xl border border-rose-800 bg-rose-950 px-3 py-2 text-sm text-rose-50 outline-none transition focus:border-rose-400"
          >
            <option value="">Selecteaza...</option>
            {options.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>

        {error ? <p className="text-sm text-rose-300">{error}</p> : null}
        {success ? <p className="text-sm text-emerald-300">{success}</p> : null}

        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center justify-center rounded-xl border border-rose-400 bg-rose-900 px-4 py-2 text-sm font-semibold text-rose-50 transition hover:bg-rose-800 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {submitting ? "Se sterge..." : "Sterge definitiv"}
        </button>
      </form>

      {confirming ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-rose-700 bg-slate-950 p-5 text-slate-100 shadow-xl">
            <p className="text-lg font-semibold text-rose-200">Confirma stergerea</p>
            <p className="mt-2 text-sm text-slate-300">
              Stergi definitv sectiunea <span className="font-semibold text-rose-200">{sectionId}</span> si toti
              descendentii ei.
            </p>
            <div className="mt-4 flex items-center gap-3">
              <button
                onClick={() => {
                  setConfirming(false);
                  doDelete();
                }}
                disabled={submitting}
                className="inline-flex flex-1 items-center justify-center rounded-xl border border-rose-400 bg-rose-900 px-4 py-2 text-sm font-semibold text-rose-50 transition hover:bg-rose-800 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {submitting ? "Sterg..." : "Da, sterge"}
              </button>
              <button
                onClick={() => setConfirming(false)}
                type="button"
                className="inline-flex flex-1 items-center justify-center rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:bg-slate-800"
              >
                Anuleaza
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
