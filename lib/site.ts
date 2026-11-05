import { existsSync } from "node:fs";
import path from "node:path";

/** Public origin, used for absolute social-preview URLs. Set APP_URL per environment. */
export const SITE_URL = process.env.APP_URL?.trim().replace(/\/$/, "") || "https://questcodes.top";

export const SITE_NAME = "Quest Codes";
export const SITE_TITLE = "Quest Codes – SportyBet booking code automation";
export const SITE_DESCRIPTION =
  "Generate SportyBet booking codes from the web dashboard or Telegram. Independent third-party platform, not affiliated with SportyBet.";

/**
 * Social preview image (Open Graph + Twitter card): public/og.png, ideally 1200×630.
 * Omitted while the file doesn't exist, so link previews never point at a broken URL.
 */
export const OG_IMAGE = existsSync(path.join(process.cwd(), "public", "og.png"))
  ? [{ url: "/og.png", width: 1200, height: 630, alt: "Quest Codes: smarter booking codes on demand" }]
  : undefined;
