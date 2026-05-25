# Syncsenta Logo Brand Guidelines

## Overview

The Syncsenta logo represents the convergence of education, technology, and innovation. This document provides comprehensive guidelines for proper logo usage across all applications and platforms.

---

## Logo Variations

### 1. Primary Logo (`logo-master.svg`)
- **Use case**: Primary brand representation, marketing materials, presentations
- **Format**: Full-color gradient version
- **Minimum size**: 48px × 48px (digital), 0.5 inch (print)
- **Background**: Works best on white or light backgrounds

### 2. Favicon Versions
- **`favicon-16x16.svg`**: Browser tabs, bookmarks
- **`favicon-32x32.svg`**: High-DPI displays, browser UI
- **Minimum size**: Use at exact specified dimensions
- **Background**: Transparent or solid color

### 3. iOS App Icon (`app-icon-ios.svg`)
- **Use case**: iOS App Store, device home screens
- **Format**: 1024×1024px master, scaled to required sizes
- **Background**: Solid gradient (no transparency for iOS)
- **Corner radius**: Applied automatically by iOS

### 4. Monochrome Version (`logo-monochrome.svg`)
- **Use case**: Single-color applications, dark backgrounds, print limitations
- **Colors**: White on dark, dark gray on light
- **Minimum size**: 32px × 32px (digital), 0.375 inch (print)

### 5. Wordmark Version (`logo-with-wordmark.svg`)
- **Use case**: Website headers, email signatures, horizontal layouts
- **Aspect ratio**: 4:1 (width:height)
- **Minimum width**: 200px (digital), 2 inches (print)
- **Spacing**: Maintain 20px clear space around logo

---

## Color Palette

### Primary Colors

**Indigo Gradient**
- Start: `#4F46E5` (Indigo-600)
- Mid: `#6366F1` (Indigo-500)
- End: `#7C3AED` (Purple-600)
- **Usage**: Primary logo background, brand elements

**Cyan-Blue Accent**
- Start: `#06B6D4` (Cyan-500)
- Mid: `#0EA5E9` (Sky-500)
- End: `#3B82F6` (Blue-500)
- **Usage**: Accent circles, interactive elements

### Secondary Colors

**White**
- Hex: `#FFFFFF`
- **Usage**: Logo paths, text on dark backgrounds

**Dark Gray**
- Hex: `#1F2937` (Gray-800)
- **Usage**: Monochrome version, text

**Medium Gray**
- Hex: `#4B5563` (Gray-600)
- **Usage**: Secondary elements, icons

**Light Gray**
- Hex: `#6B7280` (Gray-500)
- **Usage**: Tagline, subtle text

---

## Clear Space & Sizing

### Clear Space Rules
Maintain minimum clear space around the logo equal to the height of the central circle:

```
┌─────────────────────────────┐
│         CLEAR SPACE         │
│   ┌─────────────────────┐   │
│   │                     │   │
│   │    SYNCSENTA LOGO   │   │
│   │                     │   │
│   └─────────────────────┘   │
│         CLEAR SPACE         │
└─────────────────────────────┘
```

### Minimum Sizes

**Digital Applications**
- Icon only: 16px × 16px (favicon)
- Small: 32px × 32px (UI elements)
- Medium: 64px × 64px (cards, thumbnails)
- Large: 128px+ (hero sections, splash screens)
- Wordmark: 200px width minimum

**Print Applications**
- Icon only: 0.25 inch (business cards)
- Small: 0.5 inch (letterhead)
- Medium: 1 inch (brochures)
- Large: 2+ inches (posters, banners)
- Wordmark: 2 inches width minimum

### Maximum Sizes
- No maximum for digital applications
- Print: Maintain aspect ratio, avoid pixelation

---

## Background Usage

### Recommended Backgrounds

**Light Backgrounds** ✓
- White (`#FFFFFF`)
- Light gray (`#F9FAFB`, `#F3F4F6`)
- Subtle gradients (light to lighter)
- **Use**: Primary full-color logo

**Dark Backgrounds** ✓
- Dark gray (`#111827`, `#1F2937`)
- Black (`#000000`)
- Dark gradients
- **Use**: Monochrome white version or full-color logo

**Colored Backgrounds** ⚠️
- Use with caution
- Ensure sufficient contrast (WCAG AA: 4.5:1 minimum)
- Test readability at small sizes
- Consider monochrome version

### Backgrounds to Avoid ✗
- Busy patterns or images
- Low contrast colors
- Gradients that interfere with logo gradient
- Textures that reduce clarity

---

## Incorrect Usage

### DO NOT:

❌ **Stretch or distort** the logo
- Always maintain aspect ratio
- Lock proportions when resizing

❌ **Change colors** arbitrarily
- Use only approved color variations
- Don't apply filters or effects

❌ **Rotate** the logo
- Keep orientation upright
- Exception: Monochrome in specific design contexts

❌ **Add drop shadows** or effects
- Logo has built-in depth
- Keep clean and minimal

❌ **Place on busy backgrounds**
- Ensure logo remains clearly visible
- Use solid backgrounds when possible

❌ **Recreate or modify** the logo
- Use only provided files
- Don't attempt to redraw

❌ **Crowd the logo**
- Respect clear space requirements
- Don't place too close to other elements

❌ **Use low-resolution** versions
- Always use vector (SVG) when possible
- Use appropriate PNG size for application

---

## File Formats & Usage

### Vector Formats (Preferred)

**SVG (Scalable Vector Graphics)**
- **Use for**: Web, digital applications, scalable needs
- **Advantages**: Infinite scaling, small file size, CSS styling
- **Files**: All provided `.svg` files

### Raster Formats

**PNG (Portable Network Graphics)**
- **Use for**: Social media, email, specific size requirements
- **Advantages**: Transparency support, wide compatibility
- **Export**: Follow `export-instructions.md`

**ICO (Icon)**
- **Use for**: Website favicons
- **Sizes**: 16×16, 32×32 combined
- **Export**: Use ImageMagick or online converter

**WebP/AVIF**
- **Use for**: Modern web applications
- **Advantages**: Better compression, smaller files
- **Export**: Convert from PNG using tools

---

## Application-Specific Guidelines

### Web & Digital

**Website Favicon**
- Use `favicon-16x16.svg` and `favicon-32x32.svg`
- Include both sizes in favicon.ico
- Add to HTML: `<link rel="icon" href="favicon.ico">`

**Website Header**
- Use `logo-with-wordmark.svg` for horizontal layouts
- Use `logo-master.svg` for square/icon layouts
- Minimum height: 40px for header logos

**Social Media Profiles**
- Use `logo-master.svg` or `app-icon-ios.svg`
- Export as PNG at platform-specific sizes
- Ensure visibility at thumbnail size

**Email Signatures**
- Use `logo-with-wordmark.svg` or `logo-master.svg`
- Export as PNG: 200px width for wordmark, 64px for icon
- Link to website

### Mobile Applications

**iOS App Icon**
- Use `app-icon-ios.svg`
- Export all required sizes (see export-instructions.md)
- No transparency (iOS adds rounded corners)
- Test on actual devices

**Android App Icon**
- Use `app-icon-ios.svg` as source
- Export adaptive icon layers if needed
- Include all density sizes (mdpi to xxxhdpi)
- Test on various Android versions

**Splash Screens**
- Use `logo-master.svg`
- Center on solid background
- Animate entrance if desired
- Keep duration 1-2 seconds

### Print Materials

**Business Cards**
- Minimum size: 0.5 inch
- Use vector (SVG converted to PDF/EPS)
- CMYK color mode for printing
- 300 DPI minimum

**Letterhead**
- Top left or center placement
- 0.75-1 inch size
- Maintain clear space
- Use vector format

**Marketing Materials**
- Scale appropriately for medium
- Maintain aspect ratio
- Use high-resolution exports
- Test print proofs

---

## Accessibility

### Color Contrast
- Logo meets WCAG AA standards on white background
- Contrast ratio: >4.5:1 for text, >3:1 for graphics
- Test with color blindness simulators

### Alternative Text
When using logo in HTML, provide descriptive alt text:
```html
<img src="logo.svg" alt="Syncsenta - Educational Technology Platform">
```

### Screen Readers
- Ensure logo is properly labeled
- Use semantic HTML (`<img>` with alt, or `<svg>` with `<title>`)

---

## Brand Symbolism

### Design Elements

**Three Curved Paths**
- Represent three pillars of edtech:
  1. **Digital Learning** (book icon)
  2. **Collaboration** (network icon)
  3. **Innovation** (lightbulb icon)

**Central Hub**
- Represents knowledge core
- Symbolizes centralized learning platform
- Connection point for all learning paths

**'S' Shape**
- Syncsenta brand initial
- Represents synchronization
- Flow of information and knowledge

**Orbital Rings**
- Continuous learning cycle
- Interconnected education ecosystem
- Global reach and accessibility

**Color Gradient**
- Indigo to purple: Trust, wisdom, creativity
- Cyan to blue: Technology, innovation, clarity
- Combined: Modern edtech aesthetic

---

## Contact & Support

For questions about logo usage or to request additional formats:
- **Email**: brand@syncsenta.com
- **Design Team**: design@syncsenta.com

For logo files and updates:
- **Repository**: [Internal brand assets repository]
- **Version**: 1.0.0
- **Last Updated**: 2026-05-25

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-05-25 | Initial brand guidelines and logo system |

---

## Legal

© 2026 Syncsenta. All rights reserved.

The Syncsenta logo and brand assets are proprietary and protected by copyright and trademark laws. Unauthorized use, reproduction, or modification is prohibited.

For licensing inquiries: legal@syncsenta.com