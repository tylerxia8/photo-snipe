import { createReadStream, existsSync, statSync } from "node:fs";
import { extname, join, normalize } from "node:path";
import type { IncomingMessage, ServerResponse } from "node:http";
import { fileURLToPath } from "node:url";
import path from "node:path";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
);

const WEB_ROOT = join(repoRoot, "client", "web", "dist");

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
};

export function webClientAvailable(): boolean {
  return existsSync(join(WEB_ROOT, "index.html"));
}

export function serveWebClient(req: IncomingMessage, res: ServerResponse): boolean {
  if (!webClientAvailable()) {
    return false;
  }

  const urlPath = (req.url ?? "/").split("?")[0] ?? "/";
  let filePath = urlPath === "/" ? "/index.html" : urlPath;
  filePath = normalize(join(WEB_ROOT, filePath));

  if (!filePath.startsWith(normalize(WEB_ROOT))) {
    res.writeHead(403);
    res.end("Forbidden");
    return true;
  }

  if (!existsSync(filePath) || statSync(filePath).isDirectory()) {
    filePath = join(WEB_ROOT, "index.html");
  }

  const ext = extname(filePath);
  const headers: Record<string, string> = {
    "Content-Type": MIME[ext] ?? "application/octet-stream",
  };
  if (ext === ".html") {
    headers["Cache-Control"] = "no-cache";
  }
  res.writeHead(200, headers);
  createReadStream(filePath).pipe(res);
  return true;
}
