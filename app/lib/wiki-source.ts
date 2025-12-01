import wikiJson from "@/app/wiki-data.json";
import { getWikiData } from "./wiki-db";
import type { WikiData } from "./wiki";

export async function loadWikiData(): Promise<WikiData> {
  return getWikiData({
    title: process.env.WIKI_TITLE ?? wikiJson.title,
    tagline: process.env.WIKI_TAGLINE ?? wikiJson.tagline,
  });
}
