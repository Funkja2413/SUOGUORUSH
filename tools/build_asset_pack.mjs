import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const assetsRoot = path.join(root, "assets");
const outputDir = assetsRoot;
const packPrefix = "preload-pack-";
const manifestName = "preload-pack.manifest.json";
const maxPackBytes = 8 * 1024 * 1024;

const includeExtensions = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".svg",
  ".ogg",
  ".wav",
  ".mp3"
]);

const excluded = new Set([
  "assets/audio/bgm_hulaoguan_ambient.mp3",
  "assets/audio/bgm_hulaoguan_boss_loop.wav"
]);

const mimeByExtension = new Map([
  [".png", "image/png"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".svg", "image/svg+xml"],
  [".ogg", "audio/ogg"],
  [".wav", "audio/wav"],
  [".mp3", "audio/mpeg"]
]);

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await walk(fullPath));
    } else if (entry.isFile()) {
      files.push(fullPath);
    }
  }
  return files;
}

const files = (await walk(assetsRoot))
  .map((file) => ({
    fullPath: file,
    key: path.relative(root, file).split(path.sep).join("/")
  }))
  .filter(({ key }) => {
    const ext = path.extname(key).toLowerCase();
    return includeExtensions.has(ext) && !excluded.has(key);
  })
  .sort((a, b) => a.key.localeCompare(b.key));

let offset = 0;
let packIndex = 0;
const chunks = [];
const packs = [];
const manifest = {
  version: new Date().toISOString(),
  packs: [],
  assets: {}
};

await mkdir(outputDir, { recursive: true });

async function flushPack() {
  if (!chunks.length) return;
  const file = `${packPrefix}${String(packIndex + 1).padStart(2, "0")}.bin`;
  const bytes = Buffer.concat(chunks);
  await writeFile(path.join(outputDir, file), bytes);
  packs.push({ file, size: bytes.byteLength });
  manifest.packs.push({ file, size: bytes.byteLength });
  chunks.length = 0;
  offset = 0;
  packIndex += 1;
}

for (const file of files) {
  const bytes = await readFile(file.fullPath);
  if (chunks.length && offset + bytes.byteLength > maxPackBytes) {
    await flushPack();
  }
  const ext = path.extname(file.key).toLowerCase();
  manifest.assets[file.key] = {
    pack: packIndex,
    offset,
    size: bytes.byteLength,
    type: mimeByExtension.get(ext) || "application/octet-stream"
  };
  chunks.push(bytes);
  offset += bytes.byteLength;
}

await flushPack();
await writeFile(path.join(outputDir, manifestName), `${JSON.stringify(manifest, null, 2)}\n`);

const totalBytes = packs.reduce((sum, pack) => sum + pack.size, 0);
const mb = (totalBytes / 1024 / 1024).toFixed(2);
console.log(`Packed ${files.length} assets into ${packs.length} files (${mb} MB)`);
