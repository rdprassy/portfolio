import { cp, mkdir, readdir, rm } from "node:fs/promises";
import { extname, join } from "node:path";

const root = process.cwd();
const dist = join(root, "dist");
const client = join(dist, "client");
const publicDirectories = ["images", "img", "js", "stylesheets"];
const publicExtensions = new Set([".html", ".ico"]);

await rm(dist, { recursive: true, force: true });
await mkdir(client, { recursive: true });

for (const directory of publicDirectories) {
  await cp(join(root, directory), join(client, directory), { recursive: true });
}

for (const entry of await readdir(root, { withFileTypes: true })) {
  if (entry.isFile() && publicExtensions.has(extname(entry.name))) {
    await cp(join(root, entry.name), join(client, entry.name));
  }
}

await mkdir(join(dist, "server"), { recursive: true });
await cp(join(root, "worker", "index.js"), join(dist, "server", "index.js"));

console.log("Portfolio build complete.");
