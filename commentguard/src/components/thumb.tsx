export function Thumb({ url, className = "h-20 w-16" }: { url: string | null; className?: string }) {
  return url ? (
    // Instagram CDN URLs expire; they are refreshed on every media sync.
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt="" loading="lazy" referrerPolicy="no-referrer" className={`${className} rounded-lg bg-zinc-800 object-cover`} />
  ) : (
    <div className={`${className} rounded-lg bg-zinc-800`} />
  );
}
