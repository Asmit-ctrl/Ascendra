# Syncsenta Logo Package

A comprehensive logo design system for Syncsenta, the educational technology platform. This package includes multiple logo variations optimized for various applications, from tiny favicons to large-scale app icons.

## 📦 Package Contents

### Logo Files

| File | Size | Purpose |
|------|------|---------|
| [`logo-master.svg`](./logo-master.svg) | 1024×1024 | Primary full-color logo for general use |
| [`favicon-16x16.svg`](./favicon-16x16.svg) | 16×16 | Browser favicon (small) |
| [`favicon-32x32.svg`](./favicon-32x32.svg) | 32×32 | Browser favicon (retina) |
| [`app-icon-ios.svg`](./app-icon-ios.svg) | 1024×1024 | iOS app icon master |
| [`logo-monochrome.svg`](./logo-monochrome.svg) | 1024×1024 | Single-color version for dark backgrounds |
| [`logo-with-wordmark.svg`](./logo-with-wordmark.svg) | 2048×512 | Horizontal layout with Syncsenta text |

### Documentation

| File | Description |
|------|-------------|
| [`BRAND_GUIDELINES.md`](./BRAND_GUIDELINES.md) | Complete brand usage guidelines |
| [`DESIGN_RATIONALE.md`](./DESIGN_RATIONALE.md) | Detailed design decisions and symbolism |
| [`export-instructions.md`](./export-instructions.md) | How to convert SVG to PNG/other formats |
| `README.md` | This file - quick start guide |

## 🚀 Quick Start

### For Web Developers

```html
<!-- Favicon -->
<link rel="icon" type="image/svg+xml" href="/favicon-32x32.svg">
<link rel="icon" type="image/png" href="/favicon-32x32.png">

<!-- Header Logo -->
<img src="/logo-master.svg" alt="Syncsenta" width="64" height="64">

<!-- Horizontal Wordmark -->
<img src="/logo-with-wordmark.svg" alt="Syncsenta - Educational Technology" width="300" height="75">
```

### For Mobile Developers

**iOS**: Use [`app-icon-ios.svg`](./app-icon-ios.svg) and export to required sizes (see [`export-instructions.md`](./export-instructions.md))

**Android**: Use [`app-icon-ios.svg`](./app-icon-ios.svg) as source and export to density-specific sizes

### For Designers

1. Open SVG files in your preferred vector editor (Figma, Sketch, Illustrator)
2. Maintain aspect ratios when resizing
3. Follow guidelines in [`BRAND_GUIDELINES.md`](./BRAND_GUIDELINES.md)
4. Export to PNG using [`export-instructions.md`](./export-instructions.md)

## 🎨 Design Overview

### Core Concept

The Syncsenta logo merges a triskelion-inspired design with modern edtech symbolism:

- **Three Learning Paths**: Digital Learning, Collaboration, Innovation
- **Central Hub**: Knowledge core connecting all learning
- **'S' Symbol**: Syncsenta brand and synchronization
- **Orbital Rings**: Continuous learning ecosystem

### Color Palette

**Primary Gradient**: Indigo to Purple (`#4F46E5` → `#7C3AED`)  
**Accent Gradient**: Cyan to Blue (`#06B6D4` → `#3B82F6`)  
**Neutral**: White, Dark Gray, Medium Gray

### Key Features

✓ Scales from 16×16px to any size  
✓ Works on light and dark backgrounds  
✓ Includes monochrome version  
✓ Optimized for iOS and Android  
✓ WCAG AA accessible  
✓ Vector-based (infinite scaling)

## 📏 Usage Guidelines

### Minimum Sizes

- **Favicon**: 16×16px (use provided version)
- **UI Elements**: 32×32px minimum
- **Print**: 0.5 inch minimum
- **Wordmark**: 200px width minimum

### Clear Space

Maintain clear space around logo equal to the height of the central circle. See [`BRAND_GUIDELINES.md`](./BRAND_GUIDELINES.md) for details.

### Do's and Don'ts

✅ **DO**:
- Use provided SVG files
- Maintain aspect ratio
- Follow color guidelines
- Respect clear space

❌ **DON'T**:
- Stretch or distort
- Change colors arbitrarily
- Add effects or shadows
- Place on busy backgrounds

## 🔄 Exporting to PNG

Need PNG files? See [`export-instructions.md`](./export-instructions.md) for:

- ImageMagick commands
- Inkscape commands
- Node.js automation script
- Online conversion tools
- iOS/Android specific sizes

Quick command:
```bash
# Using ImageMagick
convert -background none logo-master.svg -resize 512x512 logo-512.png
```

## 📱 Platform-Specific Guides

### iOS App Icon Sizes

Export from [`app-icon-ios.svg`](./app-icon-ios.svg):
- 1024×1024 (App Store)
- 180×180 (iPhone @3x)
- 167×167 (iPad Pro)
- 152×152 (iPad @2x)
- 120×120 (iPhone @2x)
- [See full list in export-instructions.md](./export-instructions.md#ios-app-icon-sizes)

### Android App Icon Sizes

Export from [`app-icon-ios.svg`](./app-icon-ios.svg):
- 512×512 (Google Play)
- 192×192 (xxxhdpi)
- 144×144 (xxhdpi)
- 96×96 (xhdpi)
- 72×72 (hdpi)
- 48×48 (mdpi)

### Web Favicon

Use both sizes for best compatibility:
```html
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
```

## 🎯 Logo Variations Explained

### 1. Master Logo (`logo-master.svg`)
Full-color gradient version with all details. Use for:
- Website headers
- Marketing materials
- Presentations
- Social media profiles

### 2. Favicons (`favicon-16x16.svg`, `favicon-32x32.svg`)
Simplified versions optimized for tiny sizes. Use for:
- Browser tabs
- Bookmarks
- Browser UI elements

### 3. iOS App Icon (`app-icon-ios.svg`)
Enhanced version with premium details. Use for:
- iOS App Store
- iPhone/iPad home screens
- App splash screens

### 4. Monochrome (`logo-monochrome.svg`)
Single-color version. Use for:
- Dark backgrounds
- Print limitations
- Embossing/engraving
- Single-color applications

### 5. Wordmark (`logo-with-wordmark.svg`)
Horizontal layout with text. Use for:
- Website headers
- Email signatures
- Letterhead
- Wide format applications

## 🔍 Symbolism

Each element has meaning:

| Element | Symbolism |
|---------|-----------|
| **Three Paths** | Digital Learning, Collaboration, Innovation |
| **Book Icon** | Educational content and curriculum |
| **Network Icon** | Community and peer learning |
| **Lightbulb Icon** | Ideas and creative thinking |
| **Central Hub** | Knowledge core and platform foundation |
| **'S' Shape** | Syncsenta brand and synchronization |
| **Orbital Rings** | Continuous learning cycle |
| **Indigo-Purple** | Trust, wisdom, creativity |
| **Cyan-Blue** | Technology and innovation |

## 📚 Additional Resources

- **Full Brand Guidelines**: [`BRAND_GUIDELINES.md`](./BRAND_GUIDELINES.md)
- **Design Rationale**: [`DESIGN_RATIONALE.md`](./DESIGN_RATIONALE.md)
- **Export Instructions**: [`export-instructions.md`](./export-instructions.md)

## 🤝 Support

For questions about logo usage:
- **Email**: brand@syncsenta.com
- **Design Team**: design@syncsenta.com

For additional formats or custom sizes:
- **Repository**: [Internal brand assets]
- **Request**: Submit via design team

## 📄 License

© 2026 Syncsenta. All rights reserved.

The Syncsenta logo and brand assets are proprietary. Unauthorized use, reproduction, or modification is prohibited.

## 🔖 Version

**Version**: 1.0.0  
**Date**: May 25, 2026  
**Format**: SVG (primary), PNG (exports)

---

**Need help?** Check the documentation files or contact the design team.

**Ready to implement?** Start with [`BRAND_GUIDELINES.md`](./BRAND_GUIDELINES.md) for complete usage instructions.