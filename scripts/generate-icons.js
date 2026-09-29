const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// Minimal PNG generator using Node built-in zlib
function createPng(width, height, r, g, b) {
  const bytesPerPixel = 4;
  const rawData = Buffer.alloc(height * (1 + width * bytesPerPixel));
  
  for (let y = 0; y < height; y++) {
    const rowOffset = y * (1 + width * bytesPerPixel);
    rawData[rowOffset] = 0; // Filter byte: None
    
    // Gradient calculations
    const ratio = y / height;
    const curR = Math.round(r * (1 - ratio * 0.2));
    const curG = Math.round(g * (1 - ratio * 0.1));
    const curB = Math.round(b + (255 - b) * (ratio * 0.15));
    
    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * bytesPerPixel;
      
      // Rounded corner logic
      const radius = width * 0.22;
      let inCorner = false;
      const cornerDists = [
        [radius - x, radius - y], // top-left
        [x - (width - radius), radius - y], // top-right
        [radius - x, y - (height - radius)], // bottom-left
        [x - (width - radius), y - (height - radius)], // bottom-right
      ];
      
      for (const [dx, dy] of cornerDists) {
        if (dx > 0 && dy > 0 && Math.sqrt(dx * dx + dy * dy) > radius) {
          inCorner = true;
          break;
        }
      }
      
      if (inCorner) {
        rawData[pxOffset] = 0;
        rawData[pxOffset + 1] = 0;
        rawData[pxOffset + 2] = 0;
        rawData[pxOffset + 3] = 0; // Transparent
      } else {
        rawData[pxOffset] = curR;
        rawData[pxOffset + 1] = curG;
        rawData[pxOffset + 2] = curB;
        rawData[pxOffset + 3] = 255;
      }
    }
  }

  const deflated = zlib.deflateSync(rawData);
  
  // PNG Header
  const header = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  
  // IHDR Chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // 8 bits per channel
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0; // Deflate
  ihdr[11] = 0; // Filter
  ihdr[12] = 0; // No interlace
  
  const ihdrChunk = makeChunk('IHDR', ihdr);
  const idatChunk = makeChunk('IDAT', deflated);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));
  
  return Buffer.concat([header, ihdrChunk, idatChunk, iendChunk]);
}

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const len = data.length;
  const chunk = Buffer.alloc(8 + len + 4);
  chunk.writeUInt32BE(len, 0);
  chunk.write(type, 4, 4, 'ascii');
  data.copy(chunk, 8);
  const crc = crc32(chunk.subarray(4, 8 + len));
  chunk.writeUInt32BE(crc, 8 + len);
  return chunk;
}

const publicDir = path.join(process.cwd(), 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

const logoPath = path.join(publicDir, 'logo.png');
if (fs.existsSync(logoPath)) {
  fs.copyFileSync(logoPath, path.join(publicDir, 'icon-192.png'));
  fs.copyFileSync(logoPath, path.join(publicDir, 'icon-512.png'));
  fs.copyFileSync(logoPath, path.join(publicDir, 'apple-touch-icon.png'));
  console.log('Successfully copied logo.png to icon-192.png, icon-512.png, and apple-touch-icon.png in public/');
} else {
  const png192 = createPng(192, 192, 79, 70, 229);
  fs.writeFileSync(path.join(publicDir, 'icon-192.png'), png192);

  const png512 = createPng(512, 512, 79, 70, 229);
  fs.writeFileSync(path.join(publicDir, 'icon-512.png'), png512);

  const appleIcon = createPng(180, 180, 79, 70, 229);
  fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), appleIcon);

  console.log('Successfully generated icon-192.png, icon-512.png, and apple-touch-icon.png in public/');
}
