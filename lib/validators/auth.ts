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

/** Whole years between a YYYY-MM-DD date of birth and today. Returns null if the date is invalid. */
export function ageFromDob(dob: string, now: Date = new Date()): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dob)) return null;
  const [y, m, d] = dob.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  // Reject rollovers such as 2001-02-31.
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return null;
  if (y < 1900) return null;

  let age = now.getUTCFullYear() - y;
  const hadBirthday =
    now.getUTCMonth() > m - 1 || (now.getUTCMonth() === m - 1 && now.getUTCDate() >= d);
  if (!hadBirthday) age -= 1;
  return age;
}

export const dobSchema = z
  .string()
  .min(1, "Select your date of birth")
  .superRefine((v, ctx) => {
    const age = ageFromDob(v);
    if (age === null || age < 0) {
      ctx.addIssue({ code: "custom", message: "Enter a valid date of birth" });
    } else if (age < MIN_AGE) {
      ctx.addIssue({ code: "custom", message: `You must be at least ${MIN_AGE} years old` });
    }
  });

export const loginFormSchema = z.object({ email: emailSchema });
export const registerFormSchema = z.object({
  email: emailSchema,
  username: usernameSchema,
  dateOfBirth: dobSchema,
});

export const requestCodeSchema = z.object({
  mode: z.enum(["register", "login"]),
  email: emailSchema,
  username: usernameSchema.optional(),
  dateOfBirth: z.string().optional(),
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
