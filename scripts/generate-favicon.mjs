import sharp from "sharp";
import { writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#07040a"/>
  <g transform="translate(256 256) scale(15.5) translate(-12 -12)" fill="none" stroke="#e11d48" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
    <path d="M12 8V4H8"/>
    <rect width="16" height="12" x="4" y="8" rx="2"/>
    <path d="M2 14h2"/>
    <path d="M20 14h2"/>
    <path d="M15 13v2"/>
    <path d="M9 13v2"/>
  </g>
</svg>`;

const buf = Buffer.from(svg);

await sharp(buf).png().toFile(join(root, "src/app/icon.png"));
await sharp(buf).resize(180, 180).png().toFile(join(root, "src/app/apple-icon.png"));

const sizes = [16, 32, 48];
const pngBuffers = await Promise.all(
  sizes.map((size) => sharp(buf).resize(size, size).png().toBuffer())
);

let pngToIco;
try {
  pngToIco = (await import("png-to-ico")).default;
} catch {
  console.error("Installez png-to-ico : npm install --no-save png-to-ico");
  process.exit(1);
}

const ico = await pngToIco(pngBuffers);
writeFileSync(join(root, "src/app/favicon.ico"), ico);
writeFileSync(join(root, "public/favicon.ico"), ico);

console.log("Favicons générés (icon.png, apple-icon.png, favicon.ico).");
