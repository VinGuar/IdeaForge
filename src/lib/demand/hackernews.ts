import type { RawDemandSnippet } from "./types";

type HnHit = {
  objectID?: string;
  story_title?: string;
  story_url?: string;
  comment_text?: string;
  author?: string;
  points?: number;
  url?: string;
};

export async function fetchHnCommentSignals(
  query: string,
): Promise<RawDemandSnippet[]> {
  const q = encodeURIComponent(query.trim());
  const url = `https://hn.algolia.com/api/v1/search?query=${q}&tags=comment&hitsPerPage=25`;

  try {
    const res = await fetch(url, { next: { revalidate: 0 } });
    if (!res.ok) {
      console.error(`[hackernews] HTTP ${res.status}`);
      return [];
    }

    const data = (await res.json()) as { hits?: HnHit[] };
    const hits = data.hits ?? [];
    console.log(`[hackernews] raw hits: ${hits.length}`);
    const out: RawDemandSnippet[] = [];

    for (const h of hits) {
      const text = (h.comment_text ?? "").replace(/<[^>]+>/g, "").trim();
      if (text.length < 32) continue;
      const title = h.story_title ?? "HN comment";
      const permalink =
        h.objectID != null
          ? `https://news.ycombinator.com/item?id=${h.objectID}`
          : h.url;

      out.push({
        source: "hackernews",
        title,
        text: `${title}\n\n${text}`.slice(0, 1200),
        url: permalink,
        score: h.points,
      });
    }

    return out;
  } catch (e) {
    console.error("[hackernews] fetch error:", e);
    return [];
  }
}
