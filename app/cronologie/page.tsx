import { Suspense } from "react";
import { collectLeafPaths, findSectionByPath } from "../lib/wiki";
import { TimelinePageClient } from "../components/timeline-page-client";
import { loadWikiData } from "../lib/wiki-source";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function Page() {
  const data = await loadWikiData();
  const leaves = collectLeafPaths(data.sections).map(({ ids, section }) => {
    const rootId = ids[0];
    const rootSection = findSectionByPath([rootId], data.sections);
    return {
      slug: ids,
      title: section.title,
      summary: section.summary,
      addedAt: section.addedAt ?? null,
      updatedAt: section.updatedAt ?? null,
      rootId: rootId,
      rootTitle: rootSection?.title || rootId,
    };
  });

  return (
    <Suspense fallback={<div className="p-6 text-slate-200">Se incarca cronologia...</div>}>
      <TimelinePageClient items={leaves} />
    </Suspense>
  );
}
