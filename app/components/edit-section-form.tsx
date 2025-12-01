"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { collectSectionPaths, findSectionById, Section, ContentBlock } from "../lib/wiki";

type Props = {
  sections: Section[];
};

type FormState = {
  title: string;
  summary: string;
  parentId: string;
};

type ParagraphBlock = { id: string; type: "paragraph"; text: string };
type ListBlock = { id: string; type: "list"; title?: string; itemsText: string };
type CodeBlock = { id: string; type: "code"; title?: string; language?: string; value: string };
type ImageBlock = { id: string; type: "image"; alt: string; src: string; caption?: string };
type VideoBlock = { id: string; type: "video"; title?: string; youtubeId: string };
type BlockForm = ParagraphBlock | ListBlock | CodeBlock | ImageBlock | VideoBlock;

const newId = () => `${Date.now().toString(36)}-${Math.random().toString(16).slice(2, 8)}`;

export function EditSectionForm({ sections }: Props) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string>("");
  const [selected, setSelected] = useState<Section | null>(null);
  const [form, setForm] = useState<FormState>({ title: "", summary: "", parentId: "" });
  const [blocks, setBlocks] = useState<BlockForm[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const parentOptions = useMemo(
    () => collectSectionPaths(sections).map(({ ids, section }) => ({ id: section.id, label: ids.join(" / ") })),
    [sections],
  );

  const resetMessages = () => {
    setError(null);
    setSuccess(null);
  };

  useEffect(() => {
    if (!selectedId) {
      setSelected(null);
      setBlocks([]);
      setForm({ title: "", summary: "", parentId: "" });
      return;
    }
    const section = findSectionById(selectedId, sections);
    setSelected(section);
    setForm({
      title: section?.title ?? "",
      summary: section?.summary ?? "",
      parentId: section ? findParentId(sections, selectedId) ?? "" : "",
    });
    if (section && section.content) {
      setBlocks(section.content.map(toBlockForm));
    } else {
      setBlocks([]);
    }
  }, [selectedId, sections]);

  const handleChange = (key: keyof FormState) => (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    resetMessages();
    setForm((prev) => ({ ...prev, [key]: event.target.value }));
  };

  const addBlock = (type: BlockForm["type"]) => {
    resetMessages();
    const defaults: Record<BlockForm["type"], BlockForm> = {
      paragraph: { id: newId(), type: "paragraph", text: "" },
      list: { id: newId(), type: "list", title: "", itemsText: "" },
      code: { id: newId(), type: "code", title: "", language: "ts", value: "" },
      image: { id: newId(), type: "image", alt: "", src: "", caption: "" },
      video: { id: newId(), type: "video", title: "", youtubeId: "" },
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
    if (!selectedId) {
      setError("Selecteaza o sectiune.");
      return;
    }
    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = {};
      if (form.title.trim()) payload.title = form.title.trim();
      payload.summary = form.summary.trim();
      payload.parentId = form.parentId ? form.parentId : null;

      const isLeaf = selected && (!selected.children || selected.children.length === 0);
      if (isLeaf) {
        payload.content = blocks.map((block) => {
          switch (block.type) {
            case "paragraph":
              return { type: "paragraph", text: block.text };
            case "list": {
              const items = block.itemsText
                .split("\n")
                .map((s) => s.trim())
                .filter(Boolean);
              return { type: "list", title: block.title || undefined, items };
            }
            case "code":
              return {
                type: "code",
                title: block.title || undefined,
                language: block.language || undefined,
                value: block.value,
              };
            case "image":
              return {
                type: "image",
                alt: block.alt,
                src: block.src,
                caption: block.caption || undefined,
              };
            case "video":
            default:
              return { type: "video", title: block.title || undefined, youtubeId: block.youtubeId };
          }
        });
      }

      const res = await fetch(`/api/sections/${encodeURIComponent(selectedId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body?.error || "Nu s-a putut actualiza sectiunea.");
        return;
      }

      setSuccess("Sectiunea a fost actualizata.");
      router.refresh();
    } catch {
      setError("Eroare neasteptata. Incearca din nou.");
    } finally {
      setSubmitting(false);
    }
  };

  const contentDisabled = selected ? selected.children && selected.children.length > 0 : false;

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-sm backdrop-blur">
      <div className="mb-4 space-y-1">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--accent, #60a5fa)]">
          Editeaza sectiune
        </p>
        <p className="text-sm text-slate-300">
          Modifica titlul, rezumatul, parintele si continutul (doar pentru frunze).
        </p>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <label className="flex flex-col gap-1 text-sm text-slate-200">
          Alege sectiunea
          <select
            value={selectedId}
            onChange={(e) => {
              resetMessages();
              setSelectedId(e.target.value);
            }}
            className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-[color:var(--accent, #60a5fa)]"
          >
            <option value="">Selecteaza...</option>
            {parentOptions.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm text-slate-200">
            Titlu
            <input
              required
              value={form.title}
              onChange={handleChange("title")}
              className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-[color:var(--accent, #60a5fa)]"
              placeholder="Titlu"
              disabled={!selectedId}
            />
          </label>

          <label className="flex flex-col gap-1 text-sm text-slate-200">
            Rezumat
            <input
              value={form.summary}
              onChange={handleChange("summary")}
              className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-[color:var(--accent, #60a5fa)]"
              placeholder="Scurta descriere"
              disabled={!selectedId}
            />
          </label>
        </div>

        <label className="flex flex-col gap-1 text-sm text-slate-200">
          Parinte
          <select
            value={form.parentId}
            onChange={handleChange("parentId")}
            className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-[color:var(--accent, #60a5fa)]"
            disabled={!selectedId}
          >
            <option value="">Fara parinte (nivel radacina)</option>
            {parentOptions.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
              </option>
            ))}
          </select>
          <span className="text-xs text-slate-500">Poti muta sectiunea sub alt parinte.</span>
        </label>

        <div className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Continut</p>
              {contentDisabled ? (
                <p className="text-xs text-amber-300">
                  Sectiunea are copii; poti edita doar continutul frunzelor. Mutati sau stergeti copiii pentru a edita
                  continutul aici.
                </p>
              ) : (
                <p className="text-xs text-slate-500">Editeaza blocurile pentru aceasta frunza.</p>
              )}
            </div>
            {!contentDisabled ? (
              <div className="flex flex-wrap gap-2 text-xs">
                {(["paragraph", "list", "code", "image", "video"] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => addBlock(type)}
                    className="rounded-full border border-slate-700 px-3 py-1 text-slate-200 transition hover:border-[color:var(--accent, #60a5fa)] hover:text-white"
                    disabled={!selectedId}
                  >
                    + {type}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          {contentDisabled ? (
            <p className="text-xs text-slate-500">Continutul nu poate fi editat aici.</p>
          ) : blocks.length === 0 ? (
            <p className="text-xs text-slate-500">Niciun bloc inca.</p>
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
                      className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm outline-none transition focus:border-[color:var(--accent, #60a5fa)]"
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
                        className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm outline-none transition focus:border-[color:var(--accent, #60a5fa)]"
                        placeholder="Titlu (optional)"
                      />
                      <textarea
                        value={block.itemsText}
                        onChange={(e) =>
                          updateBlock(block.id, (b) => ({ ...b, itemsText: e.target.value }))
                        }
                        className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm outline-none transition focus:border-[color:var(--accent, #60a5fa)]"
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
                        className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm outline-none transition focus:border-[color:var(--accent, #60a5fa)]"
                        placeholder="Titlu (optional)"
                      />
                      <input
                        value={block.language}
                        onChange={(e) =>
                          updateBlock(block.id, (b) => ({ ...b, language: e.target.value }))
                        }
                        className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm outline-none transition focus:border-[color:var(--accent, #60a5fa)]"
                        placeholder="Limbaj (ts, js, sql)"
                      />
                      <textarea
                        value={block.value}
                        onChange={(e) =>
                          updateBlock(block.id, (b) => ({ ...b, value: e.target.value }))
                        }
                        className="sm:col-span-2 min-h-[120px] rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm outline-none transition focus:border-[color:var(--accent, #60a5fa)]"
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
                        className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm outline-none transition focus:border-[color:var(--accent, #60a5fa)]"
                        placeholder="Alt text"
                      />
                      <input
                        value={block.caption}
                        onChange={(e) =>
                          updateBlock(block.id, (b) => ({ ...b, caption: e.target.value }))
                        }
                        className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm outline-none transition focus:border-[color:var(--accent, #60a5fa)]"
                        placeholder="Caption (optional)"
                      />
                      <input
                        value={block.src}
                        onChange={(e) =>
                          updateBlock(block.id, (b) => ({ ...b, src: e.target.value }))
                        }
                        className="sm:col-span-2 w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm outline-none transition focus:border-[color:var(--accent, #60a5fa)]"
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
                        className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm outline-none transition focus:border-[color:var(--accent, #60a5fa)]"
                        placeholder="Titlu (optional)"
                      />
                      <input
                        value={block.youtubeId}
                        onChange={(e) =>
                          updateBlock(block.id, (b) => ({ ...b, youtubeId: e.target.value }))
                        }
                        className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm outline-none transition focus:border-[color:var(--accent, #60a5fa)]"
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
          disabled={submitting || !selectedId}
          className="inline-flex items-center justify-center rounded-xl border border-[color:var(--accent, #60a5fa)] bg-[color:var(--accent-soft, rgba(96,165,250,0.2))] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[color:var(--accent, #60a5fa)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "Se actualizeaza..." : "Salveaza modificarile"}
        </button>
      </form>
    </div>
  );
}

function findParentId(sections: Section[], id: string, parent: string | null = null): string | null {
  for (const section of sections) {
    if (section.id === id) return parent;
    if (section.children) {
      const found = findParentId(section.children, id, section.id);
      if (found !== null) return found;
    }
  }
  return null;
}

function toBlockForm(block: ContentBlock): BlockForm {
  if (block.type === "paragraph") {
    return { id: newId(), type: "paragraph", text: block.text };
  }
  if (block.type === "list") {
    return { id: newId(), type: "list", title: block.title ?? "", itemsText: (block.items || []).join("\n") };
  }
  if (block.type === "code") {
    return {
      id: newId(),
      type: "code",
      title: block.title ?? "",
      language: block.language ?? "",
      value: block.value,
    };
  }
  if (block.type === "image") {
    return {
      id: newId(),
      type: "image",
      alt: block.alt,
      src: block.src,
      caption: block.caption ?? "",
    };
  }
  return {
    id: newId(),
    type: "video",
    title: block.title ?? "",
    youtubeId: block.youtubeId,
  };
}
