import type { RawDemandSnippet } from "./types";

const UA =
  "IdeaForge/1.0 (+https://ideaforge.local; startup validation research bot)";

export async function fetchRedditSignals(query: string): Promise<RawDemandSnippet[]> {
  const q = encodeURIComponent(query.trim());
  const url = `https://www.reddit.com/search.json?q=${q}&sort=relevance&limit=20&t=all`;

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA },
      next: { revalidate: 0 },
    });
    if (!res.ok) {
      console.error(`[reddit] HTTP ${res.status}`);
      return [];
    }

    const data = (await res.json()) as {
      data?: {
        children?: Array<{
          data?: {
            title?: string;
            selftext?: string;
            url?: string;
            permalink?: string;
            score?: number;
          };
        }>;
      };
    };

    const children = data.data?.children ?? [];
    console.log(`[reddit] raw children: ${children.length}`);
    const out: RawDemandSnippet[] = [];

    for (const c of children) {
      const d = c.data;
      if (!d) continue;
      const text = [d.title, d.selftext].filter(Boolean).join("\n").trim();
      if (text.length < 24) continue;
      const link = d.permalink
        ? `https://www.reddit.com${d.permalink}`
        : d.url;
      out.push({
        source: "reddit",
        title: d.title,
        text: text.slice(0, 1200),
        url: link,
        score: d.score,
      });
    }

    return out;
  } catch (e) {
    console.error("[reddit] fetch error:", e);
    return [];
  }
}
