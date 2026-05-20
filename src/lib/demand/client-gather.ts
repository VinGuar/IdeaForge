"use client";

import { stripHtml } from "./strip-html";

export type ClientSnippet = {
  source: string;
  title?: string;
  text: string;
  url?: string;
};

async function fetchReddit(query: string): Promise<ClientSnippet[]> {
  try {
    const q = encodeURIComponent(query.trim());
    const res = await fetch(
      `https://www.reddit.com/search.json?q=${q}&sort=relevance&limit=20&t=all`,
    );
    if (!res.ok) return [];
    const data = await res.json() as {
      data?: { children?: Array<{ data?: { title?: string; selftext?: string; permalink?: string; url?: string } }> };
    };
    return (data.data?.children ?? []).flatMap((c) => {
      const d = c.data;
      if (!d) return [];
      const text = [d.title, d.selftext].filter(Boolean).join("\n").trim();
      if (text.length < 24) return [];
      return [{
        source: "reddit",
        title: d.title,
        text: text.slice(0, 1200),
        url: d.permalink ? `https://www.reddit.com${d.permalink}` : d.url,
      }];
    });
  } catch {
    return [];
  }
}

async function fetchHN(query: string): Promise<ClientSnippet[]> {
  try {
    const q = encodeURIComponent(query.trim());
    const res = await fetch(
      `https://hn.algolia.com/api/v1/search?query=${q}&tags=comment&hitsPerPage=25`,
    );
    if (!res.ok) return [];
    const data = await res.json() as {
      hits?: Array<{ objectID?: string; story_title?: string; comment_text?: string; points?: number }>;
    };
    return (data.hits ?? []).flatMap((h) => {
      const text = (h.comment_text ?? "").replace(/<[^>]+>/g, "").trim();
      if (text.length < 32) return [];
      const title = h.story_title ?? "HN comment";
      return [{
        source: "hackernews",
        title,
        text: `${title}\n\n${text}`.slice(0, 1200),
        url: h.objectID ? `https://news.ycombinator.com/item?id=${h.objectID}` : undefined,
      }];
    });
  } catch {
    return [];
  }
}

async function fetchGitHub(query: string): Promise<ClientSnippet[]> {
  try {
    const q = encodeURIComponent(`${query.trim()} type:issue`);
    const res = await fetch(
      `https://api.github.com/search/issues?q=${q}&per_page=15&sort=reactions&order=desc`,
      { headers: { Accept: "application/vnd.github+json" } },
    );
    if (!res.ok) return [];
    const data = await res.json() as {
      items?: Array<{ title?: string; body?: string; html_url?: string; reactions?: { total_count?: number } }>;
    };
    return (data.items ?? []).flatMap((item) => {
      const body = item.body ? stripHtml(item.body).slice(0, 800) : "";
      const text = [item.title, body].filter(Boolean).join("\n").trim();
      if (text.length < 24) return [];
      return [{
        source: "github",
        title: item.title,
        text: text.slice(0, 1200),
        url: item.html_url,
      }];
    });
  } catch {
    return [];
  }
}

async function fetchStackOverflow(query: string): Promise<ClientSnippet[]> {
  try {
    const q = encodeURIComponent(query.trim());
    const res = await fetch(
      `https://api.stackexchange.com/2.3/search/advanced?q=${q}&site=stackoverflow&pagesize=15&sort=votes&filter=withbody`,
    );
    if (!res.ok) return [];
    const data = await res.json() as {
      items?: Array<{ title?: string; body?: string; link?: string; score?: number }>;
    };
    return (data.items ?? []).flatMap((item) => {
      const body = item.body ? stripHtml(item.body).slice(0, 800) : "";
      const text = [item.title, body].filter(Boolean).join("\n").trim();
      if (text.length < 24) return [];
      return [{
        source: "stackoverflow",
        title: item.title,
        text: text.slice(0, 1200),
        url: item.link,
      }];
    });
  } catch {
    return [];
  }
}

function dedup(snippets: ClientSnippet[]): ClientSnippet[] {
  const seen = new Set<string>();
  return snippets.filter((s) => {
    const key = s.text.toLowerCase().replace(/\s+/g, " ").slice(0, 280);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function formatDigest(snippets: ClientSnippet[]): string {
  if (snippets.length === 0) {
    return "NO LIVE SNIPPETS were retrieved. Clearly state low confidence and instruct the user to paste URLs or raw complaints.";
  }
  return snippets
    .map((s, i) => {
      const head = `[${i + 1}] ${s.source}${s.title ? ` — ${s.title}` : ""}${s.url ? ` (${s.url})` : ""}`;
      return `${head}\n${s.text}`;
    })
    .join("\n\n---\n\n");
}

export type GatherProgress = {
  source: string;
  count: number;
};

export async function gatherSignalsClient(
  topic: string,
  onProgress?: (p: GatherProgress) => void,
): Promise<string> {
  const fetchers: Array<[string, (q: string) => Promise<ClientSnippet[]>]> = [
    ["Reddit", fetchReddit],
    ["Hacker News", fetchHN],
    ["GitHub", fetchGitHub],
    ["Stack Overflow", fetchStackOverflow],
  ];

  const all = await Promise.all(
    fetchers.map(async ([source, fn]) => {
      const results = await fn(topic);
      onProgress?.({ source, count: results.length });
      return results;
    }),
  );

  const snippets = dedup(all.flat()).slice(0, 70);
  return formatDigest(snippets);
}
