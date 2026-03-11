/**
 * Squoosh compression script using @squoosh/lib.
 * Called by Python backend via subprocess.
 *
 * Input (stdin): JSON { image_base64, format, quality }
 *   format: 'mozjpeg' | 'oxipng'
 *   quality: number
 *
 * Output (stdout): JSON { data_base64, extension, size }
 * On error: exits with code 1, stderr has message
 */

import { ImagePool } from '@squoosh/lib';
import { cpus } from 'os';

let inputData = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => { inputData += chunk; });
process.stdin.on('end', async () => {
  let parsed;
  try {
    parsed = JSON.parse(inputData);
  } catch (e) {
    process.stderr.write('Invalid JSON input\n');
    process.exit(1);
  }

  const { image_base64, format, quality } = parsed;
  const imageBuffer = Buffer.from(image_base64, 'base64');

  const imagePool = new ImagePool(cpus().length);
  try {
    const image = imagePool.ingestImage(imageBuffer);

    const encodeOptions = {};
    if (format === 'mozjpeg') {
      encodeOptions.mozjpeg = { quality, progressive: true };
    } else {
      encodeOptions.oxipng = { level: quality };
    }

    await image.encode(encodeOptions);

    const encodedImage = format === 'mozjpeg'
      ? await image.encodedWith.mozjpeg
      : await image.encodedWith.oxipng;

    const result = {
      data_base64: Buffer.from(encodedImage.binary).toString('base64'),
      extension: encodedImage.extension,
      size: encodedImage.size
    };

    process.stdout.write(JSON.stringify(result) + '\n');
  } finally {
    await imagePool.close();
  }
});
