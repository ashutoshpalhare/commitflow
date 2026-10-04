// Renders the SPA shell from the built server bundle into dist/client for GitHub Pages.
import { writeFileSync, copyFileSync, writeFileSync as w } from "node:fs";
const mod = await import(new URL("../dist/server/index.mjs", import.meta.url));
const handler = mod.default?.fetch ?? mod.default;
const res = await handler(new Request("http://localhost/"), {}, { waitUntil() {}, passThroughOnException() {} });
const html = await res.text();
if (!res.ok || !html.includes("<html")) throw new Error(`Shell render failed: ${res.status}\n${html.slice(0, 500)}`);
writeFileSync("dist/client/index.html", html);
copyFileSync("dist/client/index.html", "dist/client/404.html");
w("dist/client/.nojekyll", "");
console.log("Wrote dist/client/index.html, 404.html, .nojekyll");
