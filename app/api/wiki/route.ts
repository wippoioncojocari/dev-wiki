import { NextResponse } from "next/server";
import wikiJson from "@/app/wiki-data.json";
import { getWikiData } from "@/app/lib/wiki-db";

export async function GET() {
  const data = await getWikiData({
    title: process.env.WIKI_TITLE ?? wikiJson.title,
    tagline: process.env.WIKI_TAGLINE ?? wikiJson.tagline,
  });
  return NextResponse.json(data);
}
