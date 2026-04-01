const sharp = require('sharp');

const KLAVIYO_MAX_BYTES = 5 * 1024 * 1024; // 5 MB — Klaviyo image API hard limit

async function compressSlice(imageBuffer, settings) {
  const metadata = await sharp(imageBuffer).metadata();
  const { quality = 82, format = 'auto', max_size_kb = 500 } = settings;

  // Respect user's max size, but never exceed Klaviyo's 5 MB hard limit
  const targetMax = Math.min(max_size_kb * 1024, KLAVIYO_MAX_BYTES);

  // If already within the user's target limit, return original unchanged
  if (imageBuffer.length <= targetMax) {
    return {
      buffer: imageBuffer,
      format: metadata.format || 'png',
      width: metadata.width,
      height: metadata.height,
    };
  }

  // Need to compress below targetMax
  const hasAlpha = metadata.hasAlpha;

  // PNG is lossless — can't compress a large complex image below the target with PNG.
  // Force lossy: webp (preserves alpha) or jpeg.
  let outFormat = format === 'auto' || format === 'png'
    ? (hasAlpha ? 'webp' : 'jpeg')
    : format;

  const encode = (q) => outFormat === 'webp'
    ? sharp(imageBuffer).webp({ quality: q, lossless: false }).toBuffer()
    : sharp(imageBuffer)
        .flatten({ background: { r: 255, g: 255, b: 255 } })
        .jpeg({ quality: q, progressive: true, optimizeCoding: true, chromaSubsampling: '4:2:0' })
        .toBuffer();

  let q = Math.min(100, Math.max(1, quality));
  let buf = await encode(q);

  // Reduce quality by 8 per step (finer grain than 12) until within target
  while (buf.length > targetMax && q > 1) {
    q = Math.max(1, q - 8);
    buf = await encode(q);
  }

  // Safety: never return something larger than the original
  if (buf.length >= imageBuffer.length) {
    return { buffer: imageBuffer, format: metadata.format || 'png', width: metadata.width, height: metadata.height };
  }

  const m = await sharp(buf).metadata();
  return { buffer: buf, format: outFormat, finalQuality: q, width: m.width, height: m.height };
}

async function main() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  const { slices, settings } = JSON.parse(Buffer.concat(chunks).toString());

  // Compress all slices in parallel — avoids N sequential awaits
  const results = await Promise.all(slices.map(async (slice) => {
    const imageBuffer = Buffer.from(slice.image_base64, 'base64');
    const originalSize = imageBuffer.length;
    const result = await compressSlice(imageBuffer, settings);
    return {
      id: slice.id,
      name: slice.name,
      original_size: originalSize,
      compressed_data: result.buffer.toString('base64'),
      compressed_size: result.buffer.length,
      format: result.format,
      final_quality: result.finalQuality ?? null,
      width: result.width,
      height: result.height,
    };
  }));

  process.stdout.write(JSON.stringify({ results }));
}

main().catch(err => { process.stderr.write(err.message); process.exit(1); });
