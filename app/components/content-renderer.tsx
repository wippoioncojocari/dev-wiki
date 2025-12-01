import { ContentBlock } from "../lib/wiki";

export function ContentRenderer({ blocks }: { blocks: ContentBlock[] }) {
  return (
    <div className="space-y-8">
      {blocks.map((block, index) => {
        if (block.type === "paragraph") {
          return (
            <p key={index} className="text-base leading-7 text-slate-200">
              {block.text}
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
                {block.items.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-slate-200">
                    <span
                      className="mt-1 h-2 w-2 rounded-full"
                      style={{ backgroundColor: "var(--accent-strong)" }}
                      aria-hidden
                    />
                    <span>{item}</span>
                  </li>
                ))}
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
              <img
                src={block.src}
                alt={block.alt}
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
