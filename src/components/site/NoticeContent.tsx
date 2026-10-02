import sanitize from "sanitize-html";
import { descriptionHtml } from "@/lib/course-content";

/** The same markup is used in the editor preview and the published notice. */
export function NoticeContent({ body }: { body?: string | null }) {
  if (!body) return null;
  const html = sanitize(descriptionHtml(body), {
    allowedTags: ["p", "br", "h1", "h2", "h3", "strong", "em", "u", "s", "ul", "ol", "li", "blockquote", "pre", "code", "hr", "a", "img", "table", "thead", "tbody", "tr", "th", "td", "span", "mark", "div"],
    allowedAttributes: {
      a: ["href", "target", "rel"], img: ["src", "alt", "loading"],
      p: ["style"], h1: ["style"], h2: ["style"], h3: ["style"], span: ["style"], mark: ["style"],
      th: ["colspan", "rowspan"], td: ["colspan", "rowspan"],
    },
    allowedStyles: {
      "*": { "text-align": [/^(left|right|center|justify)$/], color: [/^#[0-9a-fA-F]{3,8}$/], "background-color": [/^#[0-9a-fA-F]{3,8}$/] },
    },
    allowedSchemes: ["https", "http", "mailto", "tel"],
    allowedSchemesByTag: { img: ["https"] },
    transformTags: { a: sanitize.simpleTransform("a", { rel: "noopener noreferrer" }) },
  });
  return <div className="rich-content" dangerouslySetInnerHTML={{ __html: html }} />;
}