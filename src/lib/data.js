export const WA_NUMBER = "919382290197";
export const WA_DEFAULT_TEXT =
  "Hi Ranojoy, I saw your portfolio and want to discuss a video project.";
export const waLink = (text) =>
  `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(text || WA_DEFAULT_TEXT)}`;

// Optional form backup (Google Apps Script → Google Sheet + email).
// Set REACT_APP_GOOGLE_SCRIPT_URL in frontend/.env — see /app/apps-script/SETUP.md.
export const GOOGLE_SCRIPT_URL = process.env.REACT_APP_GOOGLE_SCRIPT_URL || "";

export const SOCIALS = [
  { name: "Instagram", handle: "@ranojoyghosh_", url: "https://www.instagram.com/ranojoyghosh_" },
  { name: "Email", handle: "ranojoyghosh9999@gmail.com", url: "mailto:ranojoyghosh9999@gmail.com" },
  { name: "WhatsApp", handle: "+91 93822 90197", url: waLink() },
  { name: "Facebook", handle: "@RanojoyGhoshh", url: "https://www.facebook.com/RanojoyGhoshh/" },
  { name: "YouTube", handle: "@Ranojoy-Ghosh", url: "https://www.youtube.com/@Ranojoy-Ghosh" },
];

const pub = (p) => `${process.env.PUBLIC_URL}${p}`;

export const PROJECTS = [
  {
    id: "work-01",
    num: "01",
    title: "Podcast Clips",
    category: "Podcast / Talking-head edit",
    desc: "Punchy cuts, dynamic captions, retention-first pacing.",
    poster: pub("/assets/posters/work-01.jpg"),
    preview: pub("/assets/videos/work-01-podcast-clips.mp4"),
    full: pub("/assets/videos/work-01-podcast-clips-full.mp4"),
    type: "Podcast / Talking-head edit",
    platform: "Instagram Reels · YouTube Shorts",
    did: "Sharp pacing, dynamic word-by-word captions, clean cuts and sound design that hold attention to the last second.",
  },
  {
    id: "work-02",
    num: "02",
    title: "Color Grading",
    category: "Color grading / cinematic look",
    desc: "A cinematic grade that makes footage feel premium.",
    poster: pub("/assets/posters/work-02.jpg"),
    preview: pub("/assets/videos/work-02-color-grading.mp4"),
    full: pub("/assets/videos/work-02-color-grading-full.mp4"),
    type: "Color grading / cinematic look",
    platform: "Reels · YouTube",
    did: "A consistent cinematic grade — balanced contrast, polished skin tones and a premium finish across every shot.",
  },
  {
    id: "work-03",
    num: "03",
    title: "AI Video Editing",
    category: "AI-assisted creative edit",
    desc: "AI-assisted visuals blended into a hand-edited cut.",
    poster: pub("/assets/posters/work-03.jpg"),
    preview: pub("/assets/videos/work-03-ai-video-editing.mp4"),
    full: pub("/assets/videos/work-03-ai-video-editing-full.mp4"),
    type: "AI-assisted creative edit",
    platform: "Social · Promo",
    did: "AI-assisted visuals blended with hand edits — creative compositing, rhythm-matched cuts and a bold final look.",
  },
];

export const SERVICES = [
  { icon: "smartphone", title: "Instagram Reels", desc: "Scroll-proof edits with a hook in the first second, clean captions and rhythm that fits the trend.", ideal: "Creators & small brands" },
  { icon: "play", title: "YouTube Shorts", desc: "Snackable cuts pulled from your long videos that push viewers straight to your channel.", ideal: "YouTubers" },
  { icon: "film", title: "YouTube Videos (Long-form)", desc: "Tight long-form edits with clean pacing, B-roll and sound design that hold attention to the end.", ideal: "Creators & educators" },
  { icon: "mic", title: "Podcast Clips", desc: "One conversation becomes a week of clips — punchy cuts, dynamic captions, zero filler.", ideal: "Podcasters & coaches" },
  { icon: "megaphone", title: "Promotional Videos", desc: "Promos that make your product or event feel unmissable — built to convert, not just look nice.", ideal: "Businesses & agencies" },
  { icon: "palette", title: "Color Grading", desc: "A consistent cinematic look that makes raw footage feel premium and on-brand.", ideal: "Anyone with raw footage" },
];

export const AUDIENCES = [
  {
    who: "Creators & YouTubers",
    pain: "You're sitting on hours of footage and no time to edit it.",
    result: "I turn it into reels, shorts and long-form videos that keep viewers watching and grow your channel.",
  },
  {
    who: "Brands & Businesses",
    pain: "Your product is great — but your videos don't stop the scroll.",
    result: "Promos and ads that look professional, tell a clear story and make people care.",
  },
  {
    who: "Podcasters & Coaches",
    pain: "Long episodes full of gold — but nobody finds the best moments.",
    result: "Clips that surface your sharpest insights with captions and pacing built for retention.",
  },
];

export const PROCESS = [
  { title: "Brief", desc: "You share your footage and goals on WhatsApp — that's it, we start." },
  { title: "Edit", desc: "First cut with pacing, transitions, captions and sound." },
  { title: "Revise", desc: "Feedback rounds until the edit feels right." },
  { title: "Deliver", desc: "Final export optimised for your platform — ready to post." },
];

export const FAQS = [
  { q: "What do you need from me to start?", a: "Your footage (Google Drive, WhatsApp or Telegram), a short brief on the video's goal and platform, and any references you like. I take it from there." },
  { q: "Which platforms do you edit for?", a: "Instagram Reels, YouTube Shorts, long-form YouTube, podcast clips and promotional videos — vertical 9:16 or horizontal 16:9, always optimised for where it will be posted." },
  { q: "Do you add captions, music & sound effects?", a: "Yes — clean captions, music and SFX wherever they strengthen the edit. <!-- CONFIRM: licensed music library -->" },
  { q: "How do revisions work?", a: "We agree on the plan first, then you give feedback in rounds until the edit feels right — no surprises mid-project. <!-- CONFIRM: number of revision rounds -->" },
  { q: "How do we start?", a: "Message me on WhatsApp with what you need. I'll reply with a simple plan, a timeline and the next steps — usually within a few hours." },
];
