import sharp from 'sharp';
import path from 'path';
import fs from 'fs';

const WIDTH = 1284;
const HEIGHT = 2778;

async function generateSplash() {
  console.log('Generating native splash screen...');
  
  const logoPath = path.join(process.cwd(), 'assets/images/roachy-logo.png');
  
  if (!fs.existsSync(logoPath)) {
    console.error('Logo not found at:', logoPath);
    process.exit(1);
  }

  const logoBuffer = await sharp(logoPath)
    .resize(400, 400, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();

  const titleSvg = `
    <svg width="${WIDTH}" height="200">
      <defs>
        <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#FFD700;stop-opacity:1" />
          <stop offset="50%" style="stop-color:#F59E0B;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#D97706;stop-opacity:1" />
        </linearGradient>
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      <text x="${WIDTH/2}" y="100" 
            font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" 
            font-size="96" 
            font-weight="800" 
            fill="url(#goldGrad)" 
            text-anchor="middle"
            filter="url(#glow)">Roachy Games</text>
      <text x="${WIDTH/2}" y="170" 
            font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" 
            font-size="42" 
            font-weight="500" 
            fill="#c4955e" 
            text-anchor="middle"
            letter-spacing="8">Play. Earn. Collect.</text>
    </svg>
  `;

  const footerSvg = `
    <svg width="${WIDTH}" height="100">
      <circle cx="${WIDTH/2 - 120}" cy="50" r="8" fill="#22C55E"/>
      <text x="${WIDTH/2 - 95}" y="60" 
            font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" 
            font-size="36" 
            font-weight="500" 
            fill="#888888">Powered by Solana</text>
    </svg>
  `;

  const bgTop = { r: 26, g: 15, b: 8 };
  const bgBot = { r: 10, g: 5, b: 3 };

  const gradientSvg = `
    <svg width="${WIDTH}" height="${HEIGHT}">
      <defs>
        <radialGradient id="centerGlow" cx="50%" cy="40%" r="60%">
          <stop offset="0%" style="stop-color:rgba(245,158,11,0.15);stop-opacity:1" />
          <stop offset="100%" style="stop-color:rgba(0,0,0,0);stop-opacity:1" />
        </radialGradient>
        <linearGradient id="bgGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style="stop-color:rgb(${bgTop.r},${bgTop.g},${bgTop.b});stop-opacity:1" />
          <stop offset="100%" style="stop-color:rgb(${bgBot.r},${bgBot.g},${bgBot.b});stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#bgGrad)"/>
      <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#centerGlow)"/>
    </svg>
  `;

  const titleBuffer = await sharp(Buffer.from(titleSvg)).png().toBuffer();
  const footerBuffer = await sharp(Buffer.from(footerSvg)).png().toBuffer();

  const logoTop = Math.floor(HEIGHT * 0.32);
  const titleTop = logoTop + 400 + 60;
  const footerTop = HEIGHT - 200;

  const splash = await sharp(Buffer.from(gradientSvg))
    .composite([
      {
        input: logoBuffer,
        top: logoTop,
        left: Math.floor((WIDTH - 400) / 2),
      },
      {
        input: titleBuffer,
        top: titleTop,
        left: 0,
      },
      {
        input: footerBuffer,
        top: footerTop,
        left: 0,
      }
    ])
    .png()
    .toBuffer();

  const outputPath = path.join(process.cwd(), 'assets/images/splash-native.png');
  await sharp(splash).toFile(outputPath);
  
  console.log('Splash screen generated at:', outputPath);
  console.log('Dimensions:', WIDTH, 'x', HEIGHT);
}

generateSplash().catch(console.error);
