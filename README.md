# Ranojoy Ghosh: Video Editor Portfolio

A single-page portfolio built with **Vite + vanilla HTML/CSS/JS**, **GSAP** (ScrollTrigger, SplitText) and **Lenis** smooth scrolling.
It is a fully static site, made for GitHub Pages.

## Run it on your computer

You need [Node.js](https://nodejs.org) 20.19 or newer.

```bash
npm install
npm run dev
```

Open **http://localhost:5173**.
To open it on your phone (same Wi-Fi): run `npm run dev -- --host` and open the "Network" address it prints (e.g. `http://192.168.1.5:5173`).

## Change text

All words are in `index.html`. `content.md` has the same copy in an easy-to-read layout.
Search `index.html` for the sentence you want to change and edit it. Lines marked `<!-- CONFIRM -->` still need your confirmation.

## Add or replace project videos and your photo

1. Put your **original** files in `media-src/` with these names:
   `work-01.mp4` (Podcast Clips), `work-02.mp4` (Color Grading), `work-03.mp4` (AI Video Editing), `profile.jpg` (portrait).
2. Run `npm run media` (needs [ffmpeg](https://ffmpeg.org/download.html)).
   This creates small silent preview loops, full versions with sound for the pop-up player, posters and responsive photos in `public/assets/`.
3. Optional: `node scripts/og/render.mjs` regenerates the social share image with the new posters.

**Adding a 4th project:** copy one `<article class="work-card">…</article>` block in `index.html`, change the number, title, tag, text and the `work-04` file names, then add `media-src/work-04.mp4` and the `04` entry to the loop in `scripts/process-media.sh`.

## Change the WhatsApp number

Edit `WHATSAPP_NUMBER` in `src/js/config.js` (digits only, with country code, e.g. `919382290197`).
Then search `index.html` for `wa.me/919382290197` and replace the number in those links too.

## Build & deploy

```bash
npm run build      # outputs the site to dist/
npm run preview    # check the production build locally
```

The build uses the base path `/Ranojoy_VideoEditor/` (see `vite.config.js`) so it works at
`https://ranojoyghosh.github.io/Ranojoy_VideoEditor/`.
Deployment through GitHub Actions is set up in Phase 4.

## Project structure

```
index.html              all page content
content.md              copy in a readable layout
src/main.js             entry: loads fonts, styles and features
src/styles/             one CSS file per section (tokens.css = colours, fonts, spacing)
src/js/                 one JS file per feature (nav, lenis, animations, cursor, work-lightbox, contact-whatsapp, …)
public/assets/          images, videos, posters (served as-is)
scripts/process-media.sh  compresses your videos/photos for the web
media-src/              your original files (not committed)
```

## Accessibility & motion
- Visitors who turn on "reduce motion" in their phone or computer settings get no preloader, smooth scroll, pinning or text animations. Content simply fades in.
- Keyboard: skip link, visible focus, ESC closes the video and the menu, and the arrow keys move between FAQ questions.
