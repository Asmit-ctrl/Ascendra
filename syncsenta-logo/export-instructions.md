# Syncsenta Logo Export Instructions

## Converting SVG to PNG

To generate PNG files from the SVG sources, use one of the following methods:

### Method 1: Using ImageMagick (Command Line)

```bash
# Install ImageMagick if not already installed
# Ubuntu/Debian: sudo apt-get install imagemagick
# macOS: brew install imagemagick
# Windows: Download from https://imagemagick.org/

# Navigate to the logo directory
cd syncsenta-logo

# Export master logo at various sizes
convert -background none logo-master.svg -resize 1024x1024 logo-1024.png
convert -background none logo-master.svg -resize 512x512 logo-512.png
convert -background none logo-master.svg -resize 256x256 logo-256.png
convert -background none logo-master.svg -resize 128x128 logo-128.png

# Export favicons
convert -background none favicon-16x16.svg favicon-16x16.png
convert -background none favicon-32x32.svg favicon-32x32.png

# Export iOS app icon
convert -background none app-icon-ios.svg app-icon-ios-1024.png

# Export monochrome version
convert -background none logo-monochrome.svg logo-monochrome-1024.png

# Export wordmark version
convert -background none logo-with-wordmark.svg logo-with-wordmark.png
```

### Method 2: Using Inkscape (Command Line)

```bash
# Install Inkscape if not already installed
# Ubuntu/Debian: sudo apt-get install inkscape
# macOS: brew install inkscape
# Windows: Download from https://inkscape.org/

# Navigate to the logo directory
cd syncsenta-logo

# Export master logo
inkscape logo-master.svg --export-type=png --export-filename=logo-1024.png -w 1024 -h 1024
inkscape logo-master.svg --export-type=png --export-filename=logo-512.png -w 512 -h 512
inkscape logo-master.svg --export-type=png --export-filename=logo-256.png -w 256 -h 256

# Export favicons
inkscape favicon-16x16.svg --export-type=png --export-filename=favicon-16x16.png -w 16 -h 16
inkscape favicon-32x32.svg --export-type=png --export-filename=favicon-32x32.png -w 32 -h 32

# Export iOS app icon
inkscape app-icon-ios.svg --export-type=png --export-filename=app-icon-ios-1024.png -w 1024 -h 1024

# Export monochrome
inkscape logo-monochrome.svg --export-type=png --export-filename=logo-monochrome-1024.png -w 1024 -h 1024

# Export wordmark
inkscape logo-with-wordmark.svg --export-type=png --export-filename=logo-with-wordmark.png -w 2048 -h 512
```

### Method 3: Using Online Tools

1. **Cloudconvert** (https://cloudconvert.com/svg-to-png)
   - Upload SVG file
   - Set desired dimensions
   - Download PNG

2. **SVG to PNG Converter** (https://svgtopng.com/)
   - Upload SVG
   - Choose size
   - Download result

### Method 4: Using Node.js (Automated Script)

Create a file named `export-logos.js`:

```javascript
const sharp = require('sharp');
const fs = require('fs');

const exports = [
  { input: 'logo-master.svg', output: 'logo-1024.png', size: 1024 },
  { input: 'logo-master.svg', output: 'logo-512.png', size: 512 },
  { input: 'logo-master.svg', output: 'logo-256.png', size: 256 },
  { input: 'logo-master.svg', output: 'logo-128.png', size: 128 },
  { input: 'favicon-16x16.svg', output: 'favicon-16x16.png', size: 16 },
  { input: 'favicon-32x32.svg', output: 'favicon-32x32.png', size: 32 },
  { input: 'app-icon-ios.svg', output: 'app-icon-ios-1024.png', size: 1024 },
  { input: 'logo-monochrome.svg', output: 'logo-monochrome-1024.png', size: 1024 },
  { input: 'logo-with-wordmark.svg', output: 'logo-with-wordmark.png', width: 2048, height: 512 }
];

async function exportLogos() {
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
    } catch (error) {
      console.error(`✗ Failed to export ${exp.output}:`, error.message);
    }
  }
}

exportLogos();
```

Install dependencies and run:
```bash
npm install sharp
node export-logos.js
```

## iOS App Icon Sizes

For complete iOS app icon set, export these sizes from `app-icon-ios.svg`:

- 1024x1024 (App Store)
- 180x180 (iPhone @3x)
- 167x167 (iPad Pro)
- 152x152 (iPad @2x)
- 120x120 (iPhone @2x)
- 87x87 (iPhone @3x Settings)
- 80x80 (iPad @2x Settings)
- 76x76 (iPad)
- 60x60 (iPhone)
- 58x58 (iPhone @2x Settings)
- 40x40 (iPad Settings)
- 29x29 (iPhone Settings)
- 20x20 (Notifications)

## Android App Icon Sizes

For Android, export these sizes from `app-icon-ios.svg`:

- 512x512 (Google Play Store)
- 192x192 (xxxhdpi)
- 144x144 (xxhdpi)
- 96x96 (xhdpi)
- 72x72 (hdpi)
- 48x48 (mdpi)

## Favicon Formats

Generate favicon.ico with multiple sizes:

```bash
# Using ImageMagick
convert favicon-16x16.png favicon-32x32.png favicon.ico
```

## Web Formats

For modern web applications, also consider:

- **WebP format** for better compression
- **AVIF format** for next-gen browsers
- Keep SVG for scalable applications

```bash
# Convert to WebP
convert logo-512.png -quality 90 logo-512.webp

# Convert to AVIF (requires libavif)
convert logo-512.png logo-512.avif
```

## Quality Guidelines

- **PNG exports**: Use lossless compression
- **Transparency**: Always preserve alpha channel
- **Color space**: sRGB for web, Display P3 for iOS
- **Bit depth**: 32-bit RGBA for full quality

## File Naming Convention

- `logo-{size}.png` - Standard logo exports
- `favicon-{size}.png` - Favicon sizes
- `app-icon-ios-{size}.png` - iOS app icons
- `app-icon-android-{size}.png` - Android app icons
- `logo-monochrome-{size}.png` - Monochrome versions
- `logo-with-wordmark.png` - Horizontal wordmark version