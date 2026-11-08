import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const url = new URL(process.env.MCP_URL || "http://localhost:8787/mcp");
console.log("testing", url.href);

const client = new Client({ name: "smoke", version: "0" });
await client.connect(new StreamableHTTPClientTransport(url));
const { tools } = await client.listTools();
console.log("tools:", tools.map((t) => `${t.name} [title=${t.title ?? t.annotations?.title}, readOnly=${t.annotations?.readOnlyHint}]`).join("\n  "));
const { prompts } = await client.listPrompts();
console.log("prompts:", prompts.map((p) => p.name).join(", "));

const end = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
const start = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
const calls = [
  ["get_current_air_quality", { location: "Delhi" }],
  ["get_current_air_quality", { location: "Paris, France" }],
  ["get_current_air_quality", { location: "-33.87,151.21" }],
  ["get_air_quality_forecast", { location: "Beijing", days: 2 }],
  ["get_air_quality_history", { location: "Lagos, Nigeria", start_date: start, end_date: end }],
  ["compare_air_quality", { locations: ["Delhi", "London", "São Paulo", "Lahore", "Reykjavik", "Nowhereville Zzz"] }],
  ["get_current_air_quality", { location: "Nowhereville Zzz" }],
];
let failed = 0;
for (const [name, args] of calls) {
  const r = await client.callTool({ name, arguments: args });
  const text = r.content[0].text;
  const expectError = JSON.stringify(args) === JSON.stringify({ location: "Nowhereville Zzz" });
  if (!!r.isError !== expectError) failed++;
  console.log(`\n== ${name} ${JSON.stringify(args)} ${r.isError ? "(error)" : ""}\n${text.slice(0, 700)}`);
}
await client.close();
console.log(failed ? `\nFAILED: ${failed}` : "\nALL PASSED");
process.exit(failed ? 1 : 0);
