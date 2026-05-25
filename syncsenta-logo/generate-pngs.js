import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

// Check if sharp is available
let sharp;
try {
  sharp = (await import('sharp')).default;
} catch (e) {
  console.log('Sharp not installed. Installing...');
  execSync('npm install sharp', { stdio: 'inherit', cwd: process.cwd() });
  sharp = (await import('sharp')).default;
}

const exports = [
  // Master logo exports
  { input: 'logo-master.svg', output: 'logo-1024.png', size: 1024 },
  { input: 'logo-master.svg', output: 'logo-512.png', size: 512 },
  { input: 'logo-master.svg', output: 'logo-256.png', size: 256 },
  { input: 'logo-master.svg', output: 'logo-128.png', size: 128 },
  { input: 'logo-master.svg', output: 'logo-64.png', size: 64 },
  
  // Favicon exports
  { input: 'favicon-16x16.svg', output: 'favicon-16x16.png', size: 16 },
  { input: 'favicon-32x32.svg', output: 'favicon-32x32.png', size: 32 },
  
  // iOS app icon exports
  { input: 'app-icon-ios.svg', output: 'app-icon-ios-1024.png', size: 1024 },
  { input: 'app-icon-ios.svg', output: 'app-icon-ios-180.png', size: 180 },
  { input: 'app-icon-ios.svg', output: 'app-icon-ios-167.png', size: 167 },
  { input: 'app-icon-ios.svg', output: 'app-icon-ios-152.png', size: 152 },
  { input: 'app-icon-ios.svg', output: 'app-icon-ios-120.png', size: 120 },
  
  // Android app icon exports
  { input: 'app-icon-ios.svg', output: 'app-icon-android-512.png', size: 512 },
  { input: 'app-icon-ios.svg', output: 'app-icon-android-192.png', size: 192 },
  { input: 'app-icon-ios.svg', output: 'app-icon-android-144.png', size: 144 },
  { input: 'app-icon-ios.svg', output: 'app-icon-android-96.png', size: 96 },
  { input: 'app-icon-ios.svg', output: 'app-icon-android-72.png', size: 72 },
  { input: 'app-icon-ios.svg', output: 'app-icon-android-48.png', size: 48 },
  
  // Monochrome exports
  { input: 'logo-monochrome.svg', output: 'logo-monochrome-1024.png', size: 1024 },
  { input: 'logo-monochrome.svg', output: 'logo-monochrome-512.png', size: 512 },
  
  // Wordmark export
  { input: 'logo-with-wordmark.svg', output: 'logo-with-wordmark.png', width: 2048, height: 512 }
];

async function exportLogos() {
  console.log('Starting PNG export process...\n');
  
  let successCount = 0;
  let failCount = 0;
  
  for (const exp of exports) {
    try {
      const svgBuffer = fs.readFileSync(exp.input);
      
      if (exp.width && exp.height) {
        await sharp(svgBuffer)
          .resize(exp.width, exp.height)
          .png()
          .toFile(exp.output);
      } else {
        await sharp(svgBuffer)
          .resize(exp.size, exp.size)
          .png()
          .toFile(exp.output);
      }
      
      console.log(`✓ Exported ${exp.output}`);
      successCount++;
    } catch (error) {
      console.error(`✗ Failed to export ${exp.output}:`, error.message);
      failCount++;
    }
  }
  
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`Export complete!`);
  console.log(`✓ Success: ${successCount} files`);
  if (failCount > 0) {
    console.log(`✗ Failed: ${failCount} files`);
  }
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
}

exportLogos().catch(console.error);

// Made with Bob
