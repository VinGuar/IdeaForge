import type { RawDemandSnippet } from "./types";

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

export async function fetchStackOverflowSignals(query: string): Promise<RawDemandSnippet[]> {
  const q = encodeURIComponent(query.trim());
  const key = process.env.STACK_APPS_KEY ? `&key=${process.env.STACK_APPS_KEY}` : "";
  const url = `https://api.stackexchange.com/2.3/search/advanced?q=${q}&site=stackoverflow&pagesize=15&sort=votes&filter=withbody${key}`;

  try {
    const res = await fetch(url, { next: { revalidate: 0 } });
    if (!res.ok) {
      console.error(`[stackoverflow] HTTP ${res.status}`, await res.text().catch(() => ""));
      return [];
    }

    const data = (await res.json()) as {
      items?: Array<{
        title?: string;
        body?: string;
        link?: string;
        score?: number;
        answer_count?: number;
      }>;
    };

    console.log(`[stackoverflow] raw items: ${data.items?.length ?? 0}`);
    const out: RawDemandSnippet[] = [];
    for (const item of data.items ?? []) {
      const body = item.body ? stripHtml(item.body).slice(0, 800) : "";
      const text = [item.title, body].filter(Boolean).join("\n").trim();
      if (text.length < 24) continue;
      out.push({
        source: "stackoverflow",
        title: item.title,
        text: text.slice(0, 1200),
        url: item.link,
        score: item.score,
      });
    }
    return out;
  } catch (e) {
    console.error("[stackoverflow] fetch threw:", e);
    return [];
  }
}
