import { createHash } from "node:crypto";
import { readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const assets = [
  ["synthetic-face", "/replay/synthetic-face.jpg"],
  ["synthetic-body", "/replay/synthetic-body.jpg"],
  ["navy-tailoring-result", "/replay/navy-tailoring-result.jpg"],
  ["cocoa-blazer-set-result", "/replay/cocoa-blazer-set-result.jpg"],
  ["graphite-set-result", "/replay/graphite-set-result.jpg"],
];

const manifest = {};
for (const [key, publicPath] of assets) {
  const absolutePath = path.join(repositoryRoot, "public", publicPath.replace(/^\//, ""));
  const fileStat = await stat(absolutePath);
  if (!fileStat.isFile() || fileStat.size === 0) {
    throw new Error(`Replay asset is missing or empty: ${publicPath}`);
  }
  const bytes = await readFile(absolutePath);
  manifest[key] = {
    path: publicPath,
    contentType: "image/jpeg",
    byteLength: bytes.byteLength,
    sha256: createHash("sha256").update(bytes).digest("hex"),
  };
}

const outputPath = path.join(repositoryRoot, "src", "lib", "replay", "assets.generated.json");
await writeFile(outputPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
process.stdout.write(`Wrote ${assets.length} replay asset records.\n`);
