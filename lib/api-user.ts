/**
 * The one id sent to the code service for an account: the Mongo _id as a string.
 * The service resolves it to the same subscriber as the account's email, username and linked
 * Telegram ID, so email-only and Telegram-linked users share one subscription. Use this for EVERY
 * call (subscription, payment, generate, Quest Special). Never mix in an email or a Telegram ID.
 */
export const getApiUserId = (user: { id: string }): string => String(user.id);
