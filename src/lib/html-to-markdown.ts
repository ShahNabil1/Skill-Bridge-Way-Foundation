// Lightweight HTML → Markdown for AI agents sending `Accept: text/markdown`.
// Edge-safe (no DOM, no Node APIs).

const decode = (s: string) =>
  s
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#x27;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)));

export function htmlToMarkdown(html: string, origin: string): string {
  const title = decode(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "").trim();
  const desc = decode(
    html.match(/<meta[^>]+name="description"[^>]+content="([^"]*)"/i)?.[1] ?? "",
  ).trim();

  let body = html.match(/<main[\s\S]*?<\/main>/i)?.[0] ?? html.match(/<body[\s\S]*<\/body>/i)?.[0] ?? html;

  body = body
    .replace(/<(script|style|noscript|svg|template|iframe)[\s\S]*?<\/\1>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi, (_, l, t) => `\n\n${"#".repeat(Number(l))} ${t}\n\n`)
    .replace(/<a[^>]+href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, (_, href: string, t: string) => {
      const text = t.replace(/<[^>]+>/g, "").trim();
      if (!text) return "";
      const url = href.startsWith("/") ? origin + href : href;
      return `[${text}](${url})`;
    })
    .replace(/<img[^>]+alt="([^"]+)"[^>]*>/gi, " $1 ")
    .replace(/<li[^>]*>/gi, "\n- ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|section|article|ul|ol|li|tr|header|footer|blockquote)>/gi, "\n")
    .replace(/<(strong|b)[^>]*>([\s\S]*?)<\/\1>/gi, "**$2**")
    .replace(/<[^>]+>/g, "");

  body = decode(body)
    .split("\n")
    .map((l) => l.replace(/[ \t]+/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  const head = [title && `# ${title}`, desc && `> ${desc}`].filter(Boolean).join("\n\n");
  return `${head}\n\n${body}\n`;
}
