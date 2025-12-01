"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { collectSectionPaths, Section } from "../lib/wiki";

type Props = {
  sections: Section[];
};

type FormState = {
  id: string;
  title: string;
  summary: string;
  parentId: string;
};

type ParagraphBlock = { id: string; type: "paragraph"; text: string };
type ListBlock = { id: string; type: "list"; title: string; itemsText: string };
type CodeBlock = { id: string; type: "code"; title: string; language: string; value: string };
type ImageBlock = { id: string; type: "image"; alt: string; src: string; caption: string };
type VideoBlock = { id: string; type: "video"; title: string; youtubeId: string };
type BlockForm = ParagraphBlock | ListBlock | CodeBlock | ImageBlock | VideoBlock;

const newId = () => `${Date.now().toString(36)}-${Math.random().toString(16).slice(2, 8)}`;

export function CreateSectionForm({ sections }: Props) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>({
    id: "",
    title: "",
    summary: "",
    parentId: "",
  });
  const [blocks, setBlocks] = useState<BlockForm[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const parentOptions = useMemo(() => {
    return collectSectionPaths(sections).map(({ ids, section }) => ({
      id: section.id,
      label: ids.join(" / "),
    }));
  }, [sections]);

  const resetMessages = () => {
    setError(null);
    setSuccess(null);
  };

  const handleChange = (key: keyof FormState) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    resetMessages();
    setForm((prev) => ({ ...prev, [key]: event.target.value }));
  };

  const addBlock = (type: BlockForm["type"]) => {
    resetMessages();
    const base = { id: newId(), type } as BlockForm;
    const defaults: Record<BlockForm["type"], BlockForm> = {
      paragraph: { ...base, text: "" },
      list: { ...base, title: "", itemsText: "" },
      code: { ...base, title: "", language: "ts", value: "" },
      image: { ...base, alt: "", src: "", caption: "" },
      video: { ...base, title: "", youtubeId: "" },
    };
    setBlocks((prev) => [...prev, defaults[type]]);
  };

  const updateBlock = (id: string, updater: (block: BlockForm) => BlockForm) => {
    resetMessages();
    setBlocks((prev) => prev.map((b) => (b.id === id ? updater(b) : b)));
  };

  const removeBlock = (id: string) => {
    resetMessages();
    setBlocks((prev) => prev.filter((b) => b.id !== id));
  };

  const moveBlock = (id: string, direction: "up" | "down") => {
    resetMessages();
    setBlocks((prev) => {
      const index = prev.findIndex((b) => b.id === id);
      if (index === -1) return prev;
      const nextIndex = direction === "up" ? index - 1 : index + 1;
      if (nextIndex < 0 || nextIndex >= prev.length) return prev;
      const copy = [...prev];
      const [item] = copy.splice(index, 1);
      copy.splice(nextIndex, 0, item);
      return copy;
    });
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    resetMessages();
    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        id: form.id.trim(),
        title: form.title.trim(),
        summary: form.summary.trim() || undefined,
        parentId: form.parentId || undefined,
      };

      if (blocks.length > 0) {
        payload.content = blocks.map((block) => {
          if (block.type === "paragraph") {
            return { type: "paragraph", text: block.text.trim() };
          }
          if (block.type === "list") {
            const items = block.itemsText
              .split("\n")
              .map((s) => s.trim())
              .filter(Boolean);
            return {
              type: "list",
              title: block.title.trim() || undefined,
              items,
            };
          }
          if (block.type === "code") {
            return {
              type: "code",
              title: block.title.trim() || undefined,
              language: block.language.trim() || undefined,
              value: block.value,
            };
          }
          if (block.type === "image") {
            return {
              type: "image",
              alt: block.alt,
              src: block.src,
              caption: block.caption.trim() || undefined,
            };
          }
          return {
            type: "video",
            title: block.title.trim() || undefined,
            youtubeId: block.youtubeId.trim(),
          };
        });
      }

      const response = await fetch("/api/sections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        const message =
          body?.error?.message ||
          body?.error?.formErrors?.join?.(", ") ||
          body?.error ||
          "Nu s-a putut crea sectiunea.";
        setError(typeof message === "string" ? message : "Nu s-a putut crea sectiunea.");
        return;
      }

      setSuccess("Sectiunea a fost creata.");
      setForm({
        id: "",
        title: "",
        summary: "",
        parentId: "",
      });
      setBlocks([]);
      router.refresh();
    } catch {
      setError("Eroare neasteptata. Incearca din nou.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-sm backdrop-blur">
      <div className="mb-4 space-y-1">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--accent)]">
          Adauga sectiune
        </p>
        <p className="text-sm text-slate-300">
          Creeaza rapid un nod nou. Daca alegi un parinte cu continut, backend-ul va respinge cererea.
        </p>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm text-slate-200">
            ID (slug)
            <input
              required
              value={form.id}
              onChange={handleChange("id")}
              className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-[color:var(--accent)]"
              placeholder="ex: backend"
            />
            <span className="text-xs text-slate-500">trebuie sa fie unic</span>
          </label>

          <label className="flex flex-col gap-1 text-sm text-slate-200">
            Titlu
            <input
              required
              value={form.title}
              onChange={handleChange("title")}
              className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-[color:var(--accent)]"
              placeholder="Titlu afisat"
            />
          </label>
        </div>

        <label className="flex flex-col gap-1 text-sm text-slate-200">
          Rezumat (optional)
          <input
            value={form.summary}
            onChange={handleChange("summary")}
            className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-[color:var(--accent)]"
            placeholder="Scurta descriere"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-slate-200">
          Parinte (optional)
          <select
            value={form.parentId}
            onChange={handleChange("parentId")}
            className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-[color:var(--accent)]"
          >
            <option value="">Fara parinte (nivel radacina)</option>
            {parentOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
          <span className="text-xs text-slate-500">
            Poti lega de orice nod. Backend-ul va respinge doar cazuri invalide.
          </span>
        </label>

        <div className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
              Continut (opțional)
            </p>
            <div className="flex flex-wrap gap-2 text-xs">
              {(["paragraph", "list", "code", "image", "video"] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => addBlock(type)}
                  className="rounded-full border border-slate-700 px-3 py-1 text-slate-200 transition hover:border-[color:var(--accent)] hover:text-white"
                >
                  + {type}
                </button>
              ))}
            </div>
          </div>

          {blocks.length === 0 ? (
            <p className="text-xs text-slate-500">Niciun bloc adaugat inca.</p>
          ) : (
            <div className="space-y-3">
              {blocks.map((block, index) => (
                <div
                  key={block.id}
                  className="rounded-xl border border-slate-800 bg-slate-950/70 p-3 text-sm text-slate-100"
                >
                  <div className="mb-2 flex items-center justify-between text-xs text-slate-400">
                    <span>
                      {index + 1}. {block.type}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => moveBlock(block.id, "up")}
                        className="rounded-full px-2 py-1 hover:bg-slate-800"
                        disabled={index === 0}
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        onClick={() => moveBlock(block.id, "down")}
                        className="rounded-full px-2 py-1 hover:bg-slate-800"
                        disabled={index === blocks.length - 1}
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        onClick={() => removeBlock(block.id)}
                        className="rounded-full px-2 py-1 text-rose-300 hover:bg-rose-500/10"
                      >
                        Sterge
                      </button>
                    </div>
                  </div>

                  {block.type === "paragraph" ? (
                    <textarea
                      value={block.text}
                      onChange={(e) =>
                        updateBlock(block.id, (b) => ({ ...b, text: e.target.value }))
                      }
                      className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm outline-none transition focus:border-[color:var(--accent)]"
                      placeholder="Text paragraf"
                    />
                  ) : null}

                  {block.type === "list" ? (
                    <div className="space-y-2">
                      <input
                        value={block.title}
                        onChange={(e) =>
                          updateBlock(block.id, (b) => ({ ...b, title: e.target.value }))
                        }
                        className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm outline-none transition focus:border-[color:var(--accent)]"
                        placeholder="Titlu (optional)"
                      />
                      <textarea
                        value={block.itemsText}
                        onChange={(e) =>
                          updateBlock(block.id, (b) => ({ ...b, itemsText: e.target.value }))
                        }
                        className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm outline-none transition focus:border-[color:var(--accent)]"
                        placeholder="Un item pe linie"
                      />
                    </div>
                  ) : null}

                  {block.type === "code" ? (
                    <div className="grid gap-2 sm:grid-cols-2">
                      <input
                        value={block.title}
                        onChange={(e) =>
                          updateBlock(block.id, (b) => ({ ...b, title: e.target.value }))
                        }
                        className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm outline-none transition focus:border-[color:var(--accent)]"
                        placeholder="Titlu (optional)"
                      />
                      <input
                        value={block.language}
                        onChange={(e) =>
                          updateBlock(block.id, (b) => ({ ...b, language: e.target.value }))
                        }
                        className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm outline-none transition focus:border-[color:var(--accent)]"
                        placeholder="Limbaj (ex: ts, js, sql)"
                      />
                      <textarea
                        value={block.value}
                        onChange={(e) =>
                          updateBlock(block.id, (b) => ({ ...b, value: e.target.value }))
                        }
                        className="sm:col-span-2 min-h-[120px] rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm outline-none transition focus:border-[color:var(--accent)]"
                        placeholder="Cod"
                      />
                    </div>
                  ) : null}

                  {block.type === "image" ? (
                    <div className="grid gap-2 sm:grid-cols-2">
                      <input
                        value={block.alt}
                        onChange={(e) =>
                          updateBlock(block.id, (b) => ({ ...b, alt: e.target.value }))
                        }
                        className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm outline-none transition focus:border-[color:var(--accent)]"
                        placeholder="Alt text"
                      />
                      <input
                        value={block.caption}
                        onChange={(e) =>
                          updateBlock(block.id, (b) => ({ ...b, caption: e.target.value }))
                        }
                        className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm outline-none transition focus:border-[color:var(--accent)]"
                        placeholder="Caption (optional)"
                      />
                      <input
                        value={block.src}
                        onChange={(e) =>
                          updateBlock(block.id, (b) => ({ ...b, src: e.target.value }))
                        }
                        className="sm:col-span-2 w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm outline-none transition focus:border-[color:var(--accent)]"
                        placeholder="URL imagine"
                      />
                    </div>
                  ) : null}

                  {block.type === "video" ? (
                    <div className="grid gap-2 sm:grid-cols-2">
                      <input
                        value={block.title}
                        onChange={(e) =>
                          updateBlock(block.id, (b) => ({ ...b, title: e.target.value }))
                        }
                        className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm outline-none transition focus:border-[color:var(--accent)]"
                        placeholder="Titlu (optional)"
                      />
                      <input
                        value={block.youtubeId}
                        onChange={(e) =>
                          updateBlock(block.id, (b) => ({ ...b, youtubeId: e.target.value }))
                        }
                        className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm outline-none transition focus:border-[color:var(--accent)]"
                        placeholder="YouTube ID"
                      />
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>

        {error ? <p className="text-sm text-rose-400">{error}</p> : null}
        {success ? <p className="text-sm text-emerald-400">{success}</p> : null}

        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center justify-center rounded-xl border border-[color:var(--accent)] bg-[color:var(--accent-soft)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[color:var(--accent)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "Se salveaza..." : "Creeaza sectiunea"}
        </button>
      </form>
    </div>
  );
}
