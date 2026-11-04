import { z } from "zod";

export const emailSchema = z
  .email("Enter a valid email address")
  .max(254)
  .transform((v) => v.trim().toLowerCase());

export const usernameSchema = z
  .string()
  .trim()
  .min(3, "At least 3 characters")
  .max(20, "At most 20 characters")
  .regex(/^[a-z0-9_]+$/, "Lowercase letters, numbers and underscores only");

export const MIN_AGE = 18;

/** The user must tick the "I am 18 or older" box. */
export const ageConfirmedSchema = z
  .boolean()
  .refine((v) => v === true, `You must confirm you are ${MIN_AGE} or older`);

export const loginFormSchema = z.object({ email: emailSchema });
export const registerFormSchema = z.object({
  email: emailSchema,
  username: usernameSchema,
  ageConfirmed: ageConfirmedSchema,
});

export const requestCodeSchema = z.object({
  mode: z.enum(["register", "login"]),
  email: emailSchema,
  username: usernameSchema.optional(),
  ageConfirmed: z.boolean().optional(),
});

export const verifyCodeSchema = z.object({
  email: emailSchema,
  code: z.string().regex(/^\d{4}$/, "Enter the 4-digit code"),
});

/** Suggest a username from an email's local part. */
export function usernameFromEmail(email: string): string {
  const local = email.split("@")[0] ?? "";
  const base = local
    .split("+")[0]
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 20);
  return base;
}

export type RegisterFormValues = z.input<typeof registerFormSchema>;
export type LoginFormValues = z.input<typeof loginFormSchema>;
