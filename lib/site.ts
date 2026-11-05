import { existsSync } from "node:fs";
import path from "node:path";

/** Public origin, used for absolute social-preview URLs. Set APP_URL per environment. */
export const SITE_URL = process.env.APP_URL?.trim().replace(/\/$/, "") || "https://questcodes.top";

export const SITE_NAME = "Quest Codes";
export const SITE_TITLE = "Quest Codes – SportyBet booking code automation";
export const SITE_DESCRIPTION =
  "Generate SportyBet booking codes from the web dashboard or Telegram. Independent third-party platform, not affiliated with SportyBet.";

/**
 * Social preview image (Open Graph + Twitter card): public/og.jpg, 1200×630, kept under ~300KB
 * because WhatsApp ignores larger ones. Omitted if the file is missing, so link previews never
 * point at a broken URL. It's read at build time, so redeploy after replacing it.
 */
export const OG_IMAGE = existsSync(path.join(process.cwd(), "public", "og.jpg"))
  ? [
      {
        url: "/og.jpg",
        width: 1200,
        height: 630,
        type: "image/jpeg",
        alt: "Quest Codes: smarter booking codes on demand",
      },
    ]
  : undefined;
