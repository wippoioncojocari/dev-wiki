import { redirect } from "next/navigation";
import { collectLeafPaths } from "./lib/wiki";
import { loadWikiData } from "./lib/wiki-source";

export const dynamic = "force-dynamic";

export default async function Page() {
  const data = await loadWikiData();
  const paths = collectLeafPaths(data.sections);
  const firstPath = paths[0]?.ids ?? [];
  const href = `/${firstPath.join("/")}`;
  redirect(href || "/");
}
