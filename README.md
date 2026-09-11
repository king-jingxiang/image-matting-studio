# Image Matting Studio

English | [简体中文](README.zh-CN.md)

A lightweight web-based image matting and sprite splitting tool. It removes solid-color backgrounds, generates soft alpha edges, and splits the result into individual rows/elements for export.

![Vite](https://img.shields.io/badge/vite-5.x-646cff?style=flat&logo=vite)
![React](https://img.shields.io/badge/react-18-61dafb?style=flat&logo=react)
![TypeScript](https://img.shields.io/badge/typescript-5.x-3178c6?style=flat&logo=typescript)

**Live Demo**: [https://king-jingxiang.github.io/image-matting-studio/](https://king-jingxiang.github.io/image-matting-studio/)

**Repository**: [https://github.com/king-jingxiang/image-matting-studio](https://github.com/king-jingxiang/image-matting-studio)

---

## Features

- **Background removal** with estimated background color and adjustable soft-edge thresholds.
- **Alpha matte generation** with smooth transitions for natural edges.
- **Morphological dilation** to fill small holes and connect broken parts.
- **Connected component filtering** to remove noise by minimum area.
- **Row grouping & sprite splitting** for easy layer export as PNG or ZIP.

---

## Parameter Guide

### Overview

| Parameter | Default | Range | Stage |
|---|---|---|---|
| Soft edge low threshold `t0` | 10 | 0 ~ 100 | Foreground / background separation |
| Soft edge high threshold `t1` | 60 | 10 ~ 200 | Foreground / background separation |
| Dilate radius | 1 px | 0 ~ 5 | Mask morphology |
| Minimum area | 50 | 10 ~ 500 | Connected component filtering |
| Row merge gap ratio | 0.60 | 0 ~ 2.0 | Row grouping |

### t0 — Soft Edge Low Threshold

Controls how strictly a pixel is classified as background.

For each pixel, the Euclidean distance `dist` to the estimated background color is computed:

- `dist <= t0` → background, alpha = 0
- `dist >= t1` → foreground, alpha = 255
- `t0 < dist < t1` → alpha transitions linearly

- **Larger t0**: more near-background pixels become transparent; foreground shrinks and edges look tighter.
- **Smaller t0**: more pixels kept as foreground; may include background noise.

### t1 — Soft Edge High Threshold

Controls how strictly a pixel is classified as foreground. Must be greater than `t0`.

- **Larger t1**: only very different pixels are fully opaque; the soft transition band widens.
- **Smaller t1**: more pixels become fully opaque; foreground looks thicker.

### Dilate Radius

Number of iterations for foreground mask dilation (8-neighbor).

- **0**: no dilation.
- **Larger values**: foreground expands to fill small holes and gaps. Too large may merge adjacent elements.

### Minimum Area

Minimum pixel count for a connected region to be kept.

- **Larger**: keeps only big elements; removes noise and fragments.
- **Smaller**: keeps fine details; may keep noise.

### Row Merge Gap Ratio

Controls horizontal tolerance when grouping elements into rows. Two elements are merged into the same row when:

- Vertical overlap ratio >= 0.5 (fixed)
- Horizontal gap < min(height of both elements) × `rowMergeGapRatio`

- **Larger**: farther elements are grouped into the same row.
- **Smaller**: stricter grouping; only close elements share a row.
- **0**: only horizontally adjacent and height-similar elements are merged.

---

## Recommended Tuning Order

1. **Adjust `t0` / `t1`** first to get a clean foreground/background separation.
2. **Adjust dilate radius** to fix broken parts or reduce merging.
3. **Adjust minimum area** to remove small noise fragments.
4. **Adjust row merge gap ratio** to match the layout.

---

## Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build
```

---

## Deploy to GitHub Pages

This repository includes a GitHub Actions workflow (`.github/workflows/deploy.yml`) that automatically builds and deploys to GitHub Pages on every push to `main`.

### Setup

1. Push this repository to GitHub.
2. Go to **Settings → Pages**.
3. Under **Build and deployment → Source**, select **GitHub Actions**.
4. Trigger a build by pushing to `main`.

Your site will be available at:

```
https://king-jingxiang.github.io/image-matting-studio/
```

---

## License

MIT
