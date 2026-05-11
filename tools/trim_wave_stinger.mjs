import { readFile, writeFile } from "node:fs/promises";

const sourcePath = new URL("../assets/audio/stinger_wave_start.wav", import.meta.url);
const outputPath = new URL("../assets/audio/stinger_wave_start_short.wav", import.meta.url);
const durationSeconds = 8;
const fadeSeconds = 0.65;

const source = await readFile(sourcePath);
const riff = source.toString("ascii", 0, 4);
const wave = source.toString("ascii", 8, 12);
if (riff !== "RIFF" || wave !== "WAVE") {
  throw new Error("Expected a WAV file.");
}

let offset = 12;
let fmt = null;
let dataStart = 0;
let dataSize = 0;
while (offset + 8 <= source.length) {
  const id = source.toString("ascii", offset, offset + 4);
  const size = source.readUInt32LE(offset + 4);
  const chunkStart = offset + 8;
  if (id === "fmt ") {
    fmt = {
      audioFormat: source.readUInt16LE(chunkStart),
      channels: source.readUInt16LE(chunkStart + 2),
      sampleRate: source.readUInt32LE(chunkStart + 4),
      byteRate: source.readUInt32LE(chunkStart + 8),
      blockAlign: source.readUInt16LE(chunkStart + 12),
      bitsPerSample: source.readUInt16LE(chunkStart + 14),
      bytes: source.subarray(chunkStart, chunkStart + size)
    };
  }
  if (id === "data") {
    dataStart = chunkStart;
    dataSize = size;
    break;
  }
  offset = chunkStart + size + (size % 2);
}

if (!fmt || !dataStart || fmt.audioFormat !== 1 || fmt.bitsPerSample !== 16) {
  throw new Error("Expected 16-bit PCM WAV.");
}

const targetBytes = Math.min(dataSize, Math.floor(durationSeconds * fmt.byteRate / fmt.blockAlign) * fmt.blockAlign);
const audioData = Buffer.from(source.subarray(dataStart, dataStart + targetBytes));
const fadeBytes = Math.min(audioData.length, Math.floor(fadeSeconds * fmt.byteRate / fmt.blockAlign) * fmt.blockAlign);
const fadeStart = audioData.length - fadeBytes;

for (let index = fadeStart; index < audioData.length; index += 2) {
  const frameProgress = (index - fadeStart) / Math.max(1, fadeBytes);
  const gain = Math.cos(frameProgress * Math.PI * 0.5);
  const sample = audioData.readInt16LE(index);
  audioData.writeInt16LE(Math.round(sample * gain), index);
}

const fmtSize = fmt.bytes.length;
const totalSize = 44 + audioData.length;
const output = Buffer.alloc(totalSize);
output.write("RIFF", 0);
output.writeUInt32LE(totalSize - 8, 4);
output.write("WAVE", 8);
output.write("fmt ", 12);
output.writeUInt32LE(fmtSize, 16);
fmt.bytes.copy(output, 20);
const dataHeader = 20 + fmtSize;
output.write("data", dataHeader);
output.writeUInt32LE(audioData.length, dataHeader + 4);
audioData.copy(output, dataHeader + 8);

await writeFile(outputPath, output);
console.log(`Wrote ${outputPath.pathname}`);
