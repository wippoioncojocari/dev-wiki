"use client";

import React, { useMemo, useRef, useState } from "react";
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

type StyleState = {
  fontSize: "sm" | "base" | "lg" | "xl";
  fontWeight: "normal" | "medium" | "semibold" | "bold";
  accent: boolean;
  highlight: boolean;
};

type ParagraphBlock = { id: string; type: "paragraph"; text: string; style: StyleState };
type ListItem = { id: string; text: string; style: StyleState };
type ListBlock = { id: string; type: "list"; title: string; items: ListItem[] };
type CodeBlock = { id: string; type: "code"; title: string; language: string; value: string };
type ImageBlock = { id: string; type: "image"; alt: string; src: string; caption: string };
type VideoBlock = { id: string; type: "video"; title: string; youtubeId: string };
type BlockForm = ParagraphBlock | ListBlock | CodeBlock | ImageBlock | VideoBlock;
type BlockType = BlockForm["type"];
type BlockByType<T extends BlockType> = Extract<BlockForm, { type: T }>;

const newId = () => `${Date.now().toString(36)}-${Math.random().toString(16).slice(2, 8)}`;

const defaultStyle = (): StyleState => ({
  fontSize: "base",
  fontWeight: "normal",
  accent: false,
  highlight: false,
});

const newListItem = (): ListItem => ({
  id: newId(),
  text: "",
  style: defaultStyle(),
});

function createBlock<T extends BlockType>(type: T): BlockByType<T> {
  const id = newId();
  switch (type) {
    case "paragraph":
      return { id, type, text: "", style: defaultStyle() } as BlockByType<T>;
    case "list":
      return { id, type, title: "", items: [newListItem()] } as BlockByType<T>;
    case "code":
      return { id, type, title: "", language: "ts", value: "" } as BlockByType<T>;
    case "image":
      return { id, type, alt: "", src: "", caption: "" } as BlockByType<T>;
    case "video":
      return { id, type, title: "", youtubeId: "" } as BlockByType<T>;
    default: {
      const _exhaustive: never = type;
      return _exhaustive;
    }
  }
}

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
  const selectionRef = useRef<Record<string, { start: number; end: number }>>({});
  const [linkInputs, setLinkInputs] = useState<Record<string, { href: string; label: string }>>({});

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

  const addBlock = (type: BlockType) => {
    resetMessages();
    setBlocks((prev) => [...prev, createBlock(type)]);
  };

  const addListItem = (blockId: string) => {
    resetMessages();
    setBlocks((prev) =>
      prev.map((block) =>
        block.id === blockId && block.type === "list"
          ? { ...block, items: [...block.items, newListItem()] }
          : block,
      ),
    );
  };

  const updateListItem = (
    blockId: string,
    itemId: string,
    updater: (item: ListItem) => ListItem,
  ) => {
    resetMessages();
    setBlocks((prev) =>
      prev.map((block) => {
        if (block.id !== blockId || block.type !== "list") return block;
        return {
          ...block,
          items: block.items.map((item) => (item.id === itemId ? updater(item) : item)),
        };
      }),
    );
  };

  const removeListItem = (blockId: string, itemId: string) => {
    resetMessages();
    setBlocks((prev) =>
      prev.map((block) => {
        if (block.id !== blockId || block.type !== "list") return block;
        const next = block.items.filter((item) => item.id !== itemId);
        return { ...block, items: next.length > 0 ? next : [newListItem()] };
      }),
    );
  };

  const recordSelection = (key: string, target: HTMLTextAreaElement | HTMLInputElement) => {
    selectionRef.current[key] = {
      start: target.selectionStart || 0,
      end: target.selectionEnd || 0,
    };
  };

  const setLinkField = (key: string, field: "href" | "label", value: string) => {
    setLinkInputs((prev) => ({
      ...prev,
      [key]: { href: prev[key]?.href ?? "", label: prev[key]?.label ?? "", [field]: value },
    }));
  };

  const applyLink = (key: string, current: string, onChange: (value: string) => void) => {
    const { href = "", label = "" } = linkInputs[key] || {};
    const trimmedHref = href.trim();
    const trimmedLabel = label.trim();
    if (!trimmedHref || !trimmedLabel) return;

    const selection = selectionRef.current[key];
    if (selection && selection.end > selection.start) {
      const before = current.slice(0, selection.start);
      const selected = current.slice(selection.start, selection.end);
      const after = current.slice(selection.end);
      const next = `${before}<a href="${trimmedHref}">${selected || trimmedLabel}</a>${after}`;
      onChange(next);
      return;
    }
    onChange(`${current}<a href="${trimmedHref}">${trimmedLabel}</a>`);
  };

  const updateBlock = <T extends BlockType>(
    id: string,
    type: T,
    updater: (block: BlockByType<T>) => BlockByType<T>,
  ) => {
    resetMessages();
    setBlocks((prev) =>
      prev.map((b) => (b.id === id && b.type === type ? updater(b as BlockByType<T>) : b)),
    );
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
        let listError = false;
        payload.content = blocks.map((block) => {
          if (block.type === "paragraph") {
            return {
              type: "paragraph",
              text: block.text.trim(),
              style: {
                fontSize: block.style.fontSize,
                fontWeight: block.style.fontWeight,
                accent: block.style.accent,
                highlight: block.style.highlight,
              },
            };
          }
          if (block.type === "list") {
            const items = block.items
              .map((item) => ({
                text: item.text.trim(),
                style: {
                  fontSize: item.style.fontSize,
                  fontWeight: item.style.fontWeight,
                  accent: item.style.accent,
                  highlight: item.style.highlight,
                },
              }))
              .filter((item) => item.text.length > 0);
            if (items.length === 0) {
              listError = true;
              return null as never;
            }
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

        if (listError) {
          setError("Adauga cel putin un item in fiecare lista.");
          setSubmitting(false);
          return;
        }
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
            Poti lega de orice nod.
          </span>
        </label>

        <div className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
          <div className="sticky top-3 z-10 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800/80 bg-slate-900/95 px-4 py-3 shadow-sm backdrop-blur">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                Continut (opțional)
              </p>
              <p className="text-[11px] text-slate-500">Adauga rapid blocuri fara a derula.</p>
            </div>
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
                    <div className="space-y-2">
                      <div className="grid gap-2 sm:grid-cols-4">
                        <label className="flex flex-col gap-1 text-xs text-slate-300">
                          Dimensiune
                          <select
                            value={block.style.fontSize}
                            onChange={(e) =>
                              updateBlock(block.id, "paragraph", (b) => ({
                                ...b,
                                style: { ...b.style, fontSize: e.target.value as StyleState["fontSize"] },
                              }))
                            }
                            className="rounded-lg border border-slate-800 bg-slate-900 px-2 py-1 text-xs outline-none transition focus:border-[color:var(--accent)]"
                          >
                            <option value="sm">Mic</option>
                            <option value="base">Normal</option>
                            <option value="lg">Mare</option>
                            <option value="xl">Foarte mare</option>
                          </select>
                        </label>
                        <label className="flex flex-col gap-1 text-xs text-slate-300">
                          Grosime
                          <select
                            value={block.style.fontWeight}
                            onChange={(e) =>
                              updateBlock(block.id, "paragraph", (b) => ({
                                ...b,
                                style: { ...b.style, fontWeight: e.target.value as StyleState["fontWeight"] },
                              }))
                            }
                            className="rounded-lg border border-slate-800 bg-slate-900 px-2 py-1 text-xs outline-none transition focus:border-[color:var(--accent)]"
                          >
                            <option value="normal">Normal</option>
                            <option value="medium">Mediu</option>
                            <option value="semibold">Semi-bold</option>
                            <option value="bold">Bold</option>
                          </select>
                        </label>
                        <label className="flex items-center gap-2 text-xs text-slate-300">
                          <input
                            type="checkbox"
                            checked={block.style.accent}
                            onChange={(e) =>
                              updateBlock(block.id, "paragraph", (b) => ({
                                ...b,
                                style: { ...b.style, accent: e.target.checked },
                              }))
                            }
                            className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-[color:var(--accent)]"
                          />
                          Foloseste culoarea de accent
                        </label>
                        <label className="flex items-center gap-2 text-xs text-slate-300">
                          <input
                            type="checkbox"
                            checked={block.style.highlight}
                            onChange={(e) =>
                              updateBlock(block.id, "paragraph", (b) => ({
                                ...b,
                                style: { ...b.style, highlight: e.target.checked },
                              }))
                            }
                            className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-[color:var(--accent)]"
                          />
                          Evidentiaza fundal
                        </label>
                      </div>
                      <textarea
                        value={block.text}
                        onChange={(e) =>
                          updateBlock(block.id, "paragraph", (b) => ({ ...b, text: e.target.value }))
                        }
                        onSelect={(e) => recordSelection(block.id, e.target as HTMLTextAreaElement)}
                        onClick={(e) => recordSelection(block.id, e.target as HTMLTextAreaElement)}
                        onKeyUp={(e) => recordSelection(block.id, e.target as HTMLTextAreaElement)}
                        className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm outline-none transition focus:border-[color:var(--accent)]"
                        placeholder="Text paragraf"
                      />
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <input
                          value={linkInputs[block.id]?.href ?? ""}
                          onChange={(e) => setLinkField(block.id, "href", e.target.value)}
                          className="w-40 rounded-lg border border-slate-800 bg-slate-900 px-2 py-1 outline-none transition focus:border-[color:var(--accent)]"
                          placeholder="URL (ex: /backend)"
                        />
                        <input
                          value={linkInputs[block.id]?.label ?? ""}
                          onChange={(e) => setLinkField(block.id, "label", e.target.value)}
                          className="w-32 rounded-lg border border-slate-800 bg-slate-900 px-2 py-1 outline-none transition focus:border-[color:var(--accent)]"
                          placeholder="Text link"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            applyLink(block.id, block.text, (value) =>
                              updateBlock(block.id, "paragraph", (b) => ({ ...b, text: value })),
                            )
                          }
                          className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-200 transition hover:border-[color:var(--accent)] hover:text-white"
                        >
                          Insereaza link
                        </button>
                        <span className="text-[11px] text-slate-500">
                          Selecteaza un text in textarea pentru a-l transforma in link.
                        </span>
                      </div>
                    </div>
                  ) : null}

                  {block.type === "list" ? (
                    <div className="space-y-3">
                      <input
                        value={block.title}
                        onChange={(e) =>
                          updateBlock(block.id, "list", (b) => ({ ...b, title: e.target.value }))
                        }
                        className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm outline-none transition focus:border-[color:var(--accent)]"
                        placeholder="Titlu (optional)"
                      />
                      <div className="space-y-2">
                        {block.items.map((item) => (
                          <div
                            key={item.id}
                            className="rounded-lg border border-slate-800 bg-slate-900/60 p-3"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <input
                                value={item.text}
                                onChange={(e) =>
                                  updateListItem(block.id, item.id, (it) => ({ ...it, text: e.target.value }))
                                }
                                onSelect={(e) =>
                                  recordSelection(`${block.id}:${item.id}`, e.target as HTMLTextAreaElement)
                                }
                                onClick={(e) =>
                                  recordSelection(`${block.id}:${item.id}`, e.target as HTMLTextAreaElement)
                                }
                                onKeyUp={(e) =>
                                  recordSelection(`${block.id}:${item.id}`, e.target as HTMLTextAreaElement)
                                }
                                className="min-w-0 flex-1 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm outline-none transition focus:border-[color:var(--accent)]"
                                placeholder="Text item"
                              />
                              <div className="flex gap-2">
                                <input
                                  value={linkInputs[`${block.id}:${item.id}`]?.href ?? ""}
                                  onChange={(e) =>
                                    setLinkField(`${block.id}:${item.id}`, "href", e.target.value)
                                  }
                                  className="w-32 rounded-lg border border-slate-800 bg-slate-900 px-2 py-1 text-xs outline-none transition focus:border-[color:var(--accent)]"
                                  placeholder="URL"
                                />
                                <input
                                  value={linkInputs[`${block.id}:${item.id}`]?.label ?? ""}
                                  onChange={(e) =>
                                    setLinkField(`${block.id}:${item.id}`, "label", e.target.value)
                                  }
                                  className="w-28 rounded-lg border border-slate-800 bg-slate-900 px-2 py-1 text-xs outline-none transition focus:border-[color:var(--accent)]"
                                  placeholder="Text"
                                />
                                <button
                                  type="button"
                                  onClick={() =>
                                    applyLink(`${block.id}:${item.id}`, item.text, (value) =>
                                      updateListItem(block.id, item.id, (it) => ({ ...it, text: value })),
                                    )
                                  }
                                  className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-200 transition hover:border-[color:var(--accent)] hover:text-white"
                                >
                                  Link
                                </button>
                                <button
                                  type="button"
                                  onClick={() => removeListItem(block.id, item.id)}
                                  className="rounded-full border border-rose-500/60 px-3 py-1 text-xs text-rose-200 transition hover:bg-rose-500/10"
                                >
                                  Sterge
                                </button>
                              </div>
                            </div>
                            <div className="mt-2 grid gap-2 sm:grid-cols-4">
                              <label className="flex flex-col gap-1 text-xs text-slate-300">
                                Dimensiune
                                <select
                                  value={item.style.fontSize}
                                  onChange={(e) =>
                                    updateListItem(block.id, item.id, (it) => ({
                                      ...it,
                                      style: {
                                        ...it.style,
                                        fontSize: e.target.value as StyleState["fontSize"],
                                      },
                                    }))
                                  }
                                  className="rounded-lg border border-slate-800 bg-slate-900 px-2 py-1 text-xs outline-none transition focus:border-[color:var(--accent)]"
                                >
                                  <option value="sm">Mic</option>
                                  <option value="base">Normal</option>
                                  <option value="lg">Mare</option>
                                  <option value="xl">Foarte mare</option>
                                </select>
                              </label>
                              <label className="flex flex-col gap-1 text-xs text-slate-300">
                                Grosime
                                <select
                                  value={item.style.fontWeight}
                                  onChange={(e) =>
                                    updateListItem(block.id, item.id, (it) => ({
                                      ...it,
                                      style: {
                                        ...it.style,
                                        fontWeight: e.target.value as StyleState["fontWeight"],
                                      },
                                    }))
                                  }
                                  className="rounded-lg border border-slate-800 bg-slate-900 px-2 py-1 text-xs outline-none transition focus:border-[color:var(--accent)]"
                                >
                                  <option value="normal">Normal</option>
                                  <option value="medium">Mediu</option>
                                  <option value="semibold">Semi-bold</option>
                                  <option value="bold">Bold</option>
                                </select>
                              </label>
                              <label className="flex items-center gap-2 text-xs text-slate-300">
                                <input
                                  type="checkbox"
                                  checked={item.style.accent}
                                  onChange={(e) =>
                                    updateListItem(block.id, item.id, (it) => ({
                                      ...it,
                                      style: { ...it.style, accent: e.target.checked },
                                    }))
                                  }
                                  className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-[color:var(--accent)]"
                                />
                                Foloseste culoarea de accent
                              </label>
                              <label className="flex items-center gap-2 text-xs text-slate-300">
                                <input
                                  type="checkbox"
                                  checked={item.style.highlight}
                                  onChange={(e) =>
                                    updateListItem(block.id, item.id, (it) => ({
                                      ...it,
                                      style: { ...it.style, highlight: e.target.checked },
                                    }))
                                  }
                                  className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-[color:var(--accent)]"
                                />
                                Evidentiaza fundal
                              </label>
                            </div>
                          </div>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={() => addListItem(block.id)}
                        className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-200 transition hover:border-[color:var(--accent)] hover:text-white"
                      >
                        + Adauga item
                      </button>
                    </div>
                  ) : null}

                  {block.type === "code" ? (
                    <div className="grid gap-2 sm:grid-cols-2">
                      <input
                        value={block.title}
                        onChange={(e) =>
                          updateBlock(block.id, "code", (b) => ({ ...b, title: e.target.value }))
                        }
                        className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm outline-none transition focus:border-[color:var(--accent)]"
                        placeholder="Titlu (optional)"
                      />
                      <input
                        value={block.language}
                        onChange={(e) =>
                          updateBlock(block.id, "code", (b) => ({ ...b, language: e.target.value }))
                        }
                        className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm outline-none transition focus:border-[color:var(--accent)]"
                        placeholder="Limbaj (ex: ts, js, sql)"
                      />
                      <textarea
                        value={block.value}
                        onChange={(e) =>
                          updateBlock(block.id, "code", (b) => ({ ...b, value: e.target.value }))
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
                          updateBlock(block.id, "image", (b) => ({ ...b, alt: e.target.value }))
                        }
                        className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm outline-none transition focus:border-[color:var(--accent)]"
                        placeholder="Alt text"
                      />
                      <input
                        value={block.caption}
                        onChange={(e) =>
                          updateBlock(block.id, "image", (b) => ({ ...b, caption: e.target.value }))
                        }
                        className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm outline-none transition focus:border-[color:var(--accent)]"
                        placeholder="Caption (optional)"
                      />
                      <input
                        value={block.src}
                        onChange={(e) =>
                          updateBlock(block.id, "image", (b) => ({ ...b, src: e.target.value }))
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
                          updateBlock(block.id, "video", (b) => ({ ...b, title: e.target.value }))
                        }
                        className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm outline-none transition focus:border-[color:var(--accent)]"
                        placeholder="Titlu (optional)"
                      />
                      <input
                        value={block.youtubeId}
                        onChange={(e) =>
                          updateBlock(block.id, "video", (b) => ({ ...b, youtubeId: e.target.value }))
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
