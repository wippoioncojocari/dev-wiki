import { Metadata } from "next";
import { notFound } from "next/navigation";
import { collectLeafPaths, findSectionByPath, findFirstLeafPathFromSection } from "../lib/wiki";
import { WikiPageClient } from "../components/wiki-page-client";
import { loadWikiData } from "../lib/wiki-source";

type Params = { slug?: string[] };

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const data = await loadWikiData();
  const { slug = [] } = await params;
  const section = findSectionByPath(slug, data.sections);
  const title = section ? `${section.title} | ${data.title}` : data.title;
  const description =
    section?.summary || "Wiki pentru dezvoltatori cu documentatie editabila prin JSON.";

  return {
    title,
    description,
  };
}

export default async function Page({ params }: { params: Promise<Params> }) {
  const data = await loadWikiData();
  const { slug = [] } = await params;
  const section = findSectionByPath(slug, data.sections);
  if (!section) {
    return notFound();
  }

  const leafPath =
    (section.children && section.children.length > 0
      ? findFirstLeafPathFromSection(section, slug)
      : slug) || collectLeafPaths(data.sections)[0]?.ids || [];

  return <WikiPageClient data={data} activeSlug={leafPath} />;
}
