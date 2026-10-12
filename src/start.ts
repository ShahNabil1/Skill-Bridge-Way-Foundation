import { createStart, createCsrfMiddleware, createMiddleware } from "@tanstack/react-start";

import { renderErrorPage } from "./lib/error-page";
import { attachSupabaseAuth } from "./integrations/supabase/auth-attacher";

const errorMiddleware = createMiddleware().server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error(error);
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

// Start installs this automatically when src/start.ts is absent; defining the
// file opts out, so re-add it explicitly to keep server functions protected
// from cross-site requests.
const csrfMiddleware = createCsrfMiddleware({
  filter: (ctx) => ctx.handlerType === "serverFn",
});

// AI agents requesting `Accept: text/markdown` get a Markdown version of
// public pages; browsers keep receiving HTML.
const markdownMiddleware = createMiddleware().server(async ({ request, next }) => {
  const result = await next();
  const accept = request.headers.get("accept") ?? "";
  const url = new URL(request.url);
  const wantsMd =
    request.method === "GET" &&
    /text\/markdown/i.test(accept) &&
    !/^\/(admin|auth|application|api|_serverFn)/.test(url.pathname);
  const res = result.response;
  if (!wantsMd || !res?.headers.get("content-type")?.includes("text/html")) return result;
  const { htmlToMarkdown } = await import("./lib/html-to-markdown");
  const md = htmlToMarkdown(await res.text(), url.origin);
  return {
    ...result,
    response: new Response(md, {
      status: res.status,
      headers: {
        "content-type": "text/markdown; charset=utf-8",
        vary: "Accept",
        "x-markdown-tokens": String(Math.ceil(md.length / 4)),
      },
    }),
  };
});

export const startInstance = createStart(() => ({
  requestMiddleware: [errorMiddleware, csrfMiddleware, markdownMiddleware],
  functionMiddleware: [attachSupabaseAuth],
}));
