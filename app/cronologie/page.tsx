import { collectLeafPaths, findSectionByPath } from "../lib/wiki";
import { TimelinePageClient } from "../components/timeline-page-client";
import { loadWikiData } from "../lib/wiki-source";

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

  return <TimelinePageClient items={leaves} />;
}
