import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isH3SwallowedErrorBody(body)) return response;

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isH3SwallowedErrorBody(body: string): boolean {
  try {
    const payload = JSON.parse(body) as { unhandled?: unknown; message?: unknown };
    return payload.unhandled === true && payload.message === "HTTPError";
  } catch {
    return false;
  }
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      const handler = await getServerEntry();
      const url = new URL(request.url);
      const wantsMd =
        request.method === "GET" &&
        /text\/markdown/i.test(request.headers.get("accept") ?? "") &&
        !/^\/(admin|auth|application|api|_serverFn|assets)/.test(url.pathname) &&
        !/\.[a-z0-9]+$/i.test(url.pathname);
      if (wantsMd) {
        const headers = new Headers(request.headers);
        headers.set("accept", "text/html");
        const htmlRes = await handler.fetch(new Request(request, { headers }), env, ctx);
        if (!htmlRes.headers.get("content-type")?.includes("text/html")) return htmlRes;
        const { htmlToMarkdown } = await import("./lib/html-to-markdown");
        const md = htmlToMarkdown(await htmlRes.text(), url.origin);
        return new Response(md, {
          status: htmlRes.status,
          headers: {
            "content-type": "text/markdown; charset=utf-8",
            vary: "Accept",
            "x-markdown-tokens": String(Math.ceil(md.length / 4)),
          },
        });
      }
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};
