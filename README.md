# Ranojoy Ghosh — Video Editor Portfolio

Premium single-page portfolio. Built with React, GSAP + ScrollTrigger, Lenis and framer-motion. Static output — deployable to GitHub Pages.

## Run locally

```
cd Ranojoy_VideoEditor
yarn install
yarn start          # http://localhost:3000
```

## Edit content

- All copy lives in one place: `content.md` (repo root) — find the matching component in `src/components/` and edit the text there.
- Services, FAQs, projects and social links: `src/lib/data.js`.
- Colours & fonts (design tokens): top of `src/index.css`.

## Replace a project video

1. Compress your new video (H.264 MP4, 720x1280, no audio for the preview loop):
   `ffmpeg -i input.mp4 -vf "scale=720:1280,fps=24" -an -c:v libx264 -crf 27 -movflags +faststart output.mp4`
2. Preview (muted loop): `public/assets/videos/work-0X-....mp4`
3. Full version with audio (lightbox): `public/assets/videos/work-0X-...-full.mp4`
4. Poster (first-frame thumbnail):
   `ffmpeg -ss 5 -i input.mp4 -frames:v 1 -q:v 4 poster.jpg` → `public/assets/posters/`
5. Update the file paths in `src/lib/data.js` if names change.

## Update the WhatsApp number

One place: `src/lib/data.js` → `WA_NUMBER` (international format, no `+`, e.g. `919382290197`).

## Deploy to GitHub Pages

1. `cd Ranojoy_VideoEditor && yarn build`
2. Push the repo; set the `homepage` field in `package.json` to `https://ranojoyghosh.github.io/Ranojoy_VideoEditor` so asset paths resolve.
3. Serve the `build` folder via GitHub Pages (GitHub Actions workflow or `gh-pages` branch).

## Notes

- Testimonials section is built but hidden (`src/components/Testimonials.jsx`) — enable only with real client quotes.
- FAQ answers marked `CONFIRM` need Ranojoy's confirmation (music licensing, revision rounds).
- "Usually replies within a few hours" in Contact is marked CONFIRM too.
