const http = require("http");
const fs = require("fs");
const path = require("path");
function loadEnv() {
  const envPath = path.join(__dirname, ".env");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i === -1) continue;
    const k = t.slice(0, i).trim();
    const v = t.slice(i + 1).trim();
    if (!process.env[k]) process.env[k] = v;
  }
}
loadEnv();
const MODEL = process.env.MODEL || "grok-4";
const API_KEY = process.env.XAI_API_KEY;
const PORT = Number(process.env.PORT || 8787);
const PUBLIC = path.join(__dirname, "public");
const SYSTEM = "You are Project Rehearsal. Stay in character. Hidden motives. Force named owners. Debrief on /debrief.";
const MIME = {".html":"text/html; charset=utf-8",".css":"text/css; charset=utf-8",".js":"application/javascript; charset=utf-8"};
function send(res, code, body, headers) {
  res.writeHead(code, headers || { "Content-Type": "application/json; charset=utf-8" });
  res.end(body);
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}
async function handleChat(req, res) {
  if (!API_KEY) return send(res, 500, JSON.stringify({ error: "Missing XAI_API_KEY" }));
  let body;
  try { body = JSON.parse((await readBody(req)) || "{}"); } catch { return send(res, 400, JSON.stringify({ error: "Invalid JSON" })); }
  const { messages, scenario, artefacts, timebox } = body;
  const prelude = [];
  if (scenario) prelude.push({ role: "system", content: `SCENARIO: ${JSON.stringify(scenario)} Time box: ${timebox}` });
  if (artefacts) prelude.push({ role: "system", content: `ARTEFACTS:\n${String(artefacts).slice(0,12000)}` });
  const r = await fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: MODEL, temperature: 0.7, messages: [{ role: "system", content: SYSTEM }, ...prelude, ...(messages || [])] }),
  });
  const data = await r.json();
  if (!r.ok) return send(res, r.status, JSON.stringify({ error: data.error?.message || data.error }));
  send(res, 200, JSON.stringify({ text: data.choices?.[0]?.message?.content || "", model: MODEL }));
}
function serveStatic(req, res) {
  let urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
  if (urlPath === "/") urlPath = "/index.html";
  const file = path.normalize(path.join(PUBLIC, urlPath));
  if (!file.startsWith(PUBLIC)) return send(res, 403, "Forbidden", { "Content-Type": "text/plain" });
  fs.readFile(file, (err, buf) => {
    if (err) return send(res, 404, "Not found", { "Content-Type": "text/plain" });
    send(res, 200, buf, { "Content-Type": MIME[path.extname(file)] || "application/octet-stream" });
  });
}
http.createServer((req, res) => {
  if (req.method === "GET" && req.url.startsWith("/api/health")) return send(res, 200, JSON.stringify({ ok: true, model: MODEL, hasKey: Boolean(API_KEY) }));
  if (req.method === "POST" && req.url.startsWith("/api/chat")) return handleChat(req, res);
  if (req.method === "GET") return serveStatic(req, res);
  send(res, 404, JSON.stringify({ error: "not found" }));
}).listen(PORT, "0.0.0.0", () => console.log("http://127.0.0.1:" + PORT));
