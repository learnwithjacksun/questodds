/** Shared by the session helpers and proxy.ts, so it must stay free of server-only imports. */
export const SESSION_COOKIE = "qo_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days
