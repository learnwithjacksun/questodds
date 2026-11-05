import { readdirSync } from "node:fs";
import path from "node:path";
import Image from "next/image";

const DIR = path.join(process.cwd(), "public", "gallery");
const IMAGE = /\.(png|jpe?g|webp|avif)$/i;
/** Enough cards per row that one copy is wider than any screen, so the loop has no gap. */
const MIN_PER_ROW = 10;

/** Every image in public/gallery, so adding or removing a file needs no code change (rebuild to apply). */
function listImages(): string[] {
  try {
    return readdirSync(DIR).filter((f) => IMAGE.test(f)).sort();
  } catch {
    return [];
  }
}

function fill(items: string[]): string[] {
  const out = [...items];
  while (out.length < MIN_PER_ROW) out.push(...items);
  return out;
}

function Set({ items, hidden }: { items: string[]; hidden?: boolean }) {
  return (
    <div className="qo-marquee-set" aria-hidden={hidden || undefined}>
      {items.map((file, i) => (
        <figure className="qo-shot" key={`${file}-${i}`}>
          <Image
            src={`/gallery/${encodeURIComponent(file)}`}
            alt={hidden ? "" : "Screenshot of a SportyBet ticket"}
            fill
            sizes="(max-width: 809px) 150px, 210px"
            quality={70}
            loading="eager"
            fetchPriority="low"
            decoding="async"
            draggable={false}
          />
        </figure>
      ))}
    </div>
  );
}

function Row({ items, reverse = false, seconds }: { items: string[]; reverse?: boolean; seconds: number }) {
  return (
    <div
      className={`qo-marquee-row${reverse ? " is-reverse" : ""}`}
      style={{ "--dur": `${seconds}s` } as React.CSSProperties}
    >
      <Set items={items} />
      <Set items={items} hidden />
    </div>
  );
}

export function Gallery() {
  const files = listImages();
  if (files.length < 3) return null;

  // Second row starts halfway through the list, so the two rows never show the same card together.
  const half = Math.floor(files.length / 2);
  const rowA = fill(files);
  const rowB = fill([...files.slice(half), ...files.slice(0, half)]);

  return (
    <section id="gallery" className="qo-gallery" aria-label="Gallery of ticket screenshots">
      <div className="qo-gallery-head">
        <h2 className="qo-h2">Gallery</h2>
        <p>Screenshots of SportyBet tickets from our users.</p>
      </div>

      <div className="qo-marquee">
        <Row items={rowA} seconds={70} />
        <Row items={rowB} seconds={86} reverse />
      </div>

      <p className="qo-gallery-note">
        Past results. Individual outcomes vary and don&apos;t predict future ones. Quest Codes is not
        affiliated with SportyBet.
      </p>
    </section>
  );
}
