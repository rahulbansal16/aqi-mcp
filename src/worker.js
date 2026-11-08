// Cloudflare Worker entry: remote MCP server over Streamable HTTP (stateless).
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { createServer } from "./server.js";
import { homePage, privacyPage, ICON_SVG } from "./pages.js";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Accept, Mcp-Session-Id, Mcp-Protocol-Version, Authorization",
  "Access-Control-Expose-Headers": "Mcp-Session-Id",
};

function withCors(res) {
  const out = new Response(res.body, res);
  for (const [k, v] of Object.entries(CORS)) out.headers.set(k, v);
  return out;
}

const html = (body) => new Response(body, { headers: { "Content-Type": "text/html; charset=utf-8" } });

export default {
  async fetch(request) {
    const { pathname, origin } = new URL(request.url);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });

    if (pathname === "/mcp") {
      if (request.method !== "POST") {
        return withCors(
          Response.json(
            { jsonrpc: "2.0", error: { code: -32000, message: "Method not allowed. This stateless server accepts POST only." }, id: null },
            { status: 405, headers: { Allow: "POST, OPTIONS" } },
          ),
        );
      }
      const server = createServer();
      const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
      await server.connect(transport);
      return withCors(await transport.handleRequest(request));
    }
    if (pathname === "/" || pathname === "/docs") return html(homePage(origin));
    if (pathname === "/privacy") return html(privacyPage(origin));
    if (pathname === "/icon.svg") return new Response(ICON_SVG, { headers: { "Content-Type": "image/svg+xml", "Cache-Control": "public, max-age=86400" } });
    if (pathname === "/health") return new Response("ok");
    return new Response("Not found", { status: 404 });
  },
};
