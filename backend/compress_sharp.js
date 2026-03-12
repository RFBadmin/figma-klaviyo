const sharp = require('sharp');

async function compressSlice(imageBuffer, settings) {
  const { quality = 82, max_size_kb = 200, format = 'auto' } = settings;
  const maxBytes = max_size_kb * 1024;

  const metadata = await sharp(imageBuffer).metadata();
  const hasAlpha = metadata.hasAlpha;

  // Determine actual output format
  let outFormat = format;
  if (outFormat === 'auto') {
    outFormat = hasAlpha ? 'png' : 'jpeg';
  }

  // PNG — lossless, no quality stepping
  if (outFormat === 'png') {
    const buf = await sharp(imageBuffer).png({ compressionLevel: 9 }).toBuffer();
    const m = await sharp(buf).metadata();
    return { buffer: buf, format: 'png', width: m.width, height: m.height };
  }

  // WebP — quality-controlled, supports transparency
  if (outFormat === 'webp') {
    let q = Math.min(100, Math.max(50, quality));
    let buf, m;
    for (let attempt = 0; attempt < 6; attempt++) {
      buf = await sharp(imageBuffer).webp({ quality: q, lossless: false }).toBuffer();
      m = await sharp(buf).metadata();
      if (buf.length <= maxBytes) break;
      q = Math.max(50, q - 8);
    }
    return { buffer: buf, format: 'webp', finalQuality: q, width: m.width, height: m.height };
  }

  // JPEG — flatten transparency, quality-controlled
  let q = Math.min(100, Math.max(50, quality));
  let buf, m;
  for (let attempt = 0; attempt < 6; attempt++) {
    buf = await sharp(imageBuffer)
      .flatten({ background: { r: 255, g: 255, b: 255 } })
      .jpeg({ quality: q, progressive: true, optimizeCoding: true, chromaSubsampling: '4:2:0' })
      .toBuffer();
    m = await sharp(buf).metadata();
    if (buf.length <= maxBytes) break;
    q = Math.max(50, q - 8);
  }
  return { buffer: buf, format: 'jpeg', finalQuality: q, width: m.width, height: m.height };
}

async function main() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  const { slices, settings } = JSON.parse(Buffer.concat(chunks).toString());

  const results = [];
  for (const slice of slices) {
    const imageBuffer = Buffer.from(slice.image_base64, 'base64');
    const originalSize = imageBuffer.length;
    const result = await compressSlice(imageBuffer, settings);
    results.push({
      id: slice.id,
      name: slice.name,
      original_size: originalSize,
      compressed_data: result.buffer.toString('base64'),
      compressed_size: result.buffer.length,
      format: result.format,
      final_quality: result.finalQuality ?? null,
      width: result.width,
      height: result.height,
    });
  }

  process.stdout.write(JSON.stringify({ results }));
}

main().catch(err => { process.stderr.write(err.message); process.exit(1); });
