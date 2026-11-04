import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { User } from "@/lib/models/user";
import { verifyCode } from "@/lib/auth/otp";
import { createSession } from "@/lib/auth/session";
import { dobSchema, verifyCodeSchema } from "@/lib/validators/auth";

export async function POST(req: Request) {
  const parsed = verifyCodeSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter the 4-digit code" }, { status: 400 });
  }
  const { email, code } = parsed.data;

  try {
    await connectDB();
    const result = await verifyCode(email, code);

    if (!result.ok) {
      return NextResponse.json(
        {
          error:
            result.reason === "locked"
              ? "Too many attempts. Request a new code."
              : "Invalid or expired code",
        },
        { status: result.reason === "locked" ? 429 : 400 },
      );
    }

    let user = await User.findOne({ email });
    if (!user) {
      // A new account can only come from a registration code that carried a valid, adult DOB.
      if (!result.username || !result.dateOfBirth || !dobSchema.safeParse(result.dateOfBirth).success) {
        return NextResponse.json({ error: "Invalid or expired code" }, { status: 400 });
      }
      try {
        user = await User.create({
          email,
          username: result.username,
          dateOfBirth: new Date(`${result.dateOfBirth}T00:00:00.000Z`),
          emailVerifiedAt: new Date(),
        });
      } catch (err) {
        if ((err as { code?: number }).code === 11000) {
          return NextResponse.json(
            { error: "That username was just taken. Go back and pick another." },
            { status: 409 },
          );
        }
        throw err;
      }
    } else if (!user.emailVerifiedAt) {
      user.emailVerifiedAt = new Date();
      await user.save();
    }

    await createSession(user.id);
    return NextResponse.json({ ok: true, username: user.username });
  } catch (err) {
    console.error("[auth] verify failed", err);
    return NextResponse.json({ error: "Something went wrong. Try again." }, { status: 500 });
  }
}
