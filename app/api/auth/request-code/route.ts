import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { User } from "@/lib/models/user";
import { cooldownRemaining, issueCode } from "@/lib/auth/otp";
import { MIN_AGE, requestCodeSchema } from "@/lib/validators/auth";

export async function POST(req: Request) {
  const parsed = requestCodeSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  const { mode, email, username, ageConfirmed } = parsed.data;

  try {
    await connectDB();
    const existing = await User.findOne({ email }).select("_id").lean();

    // Don't reveal whether an account exists: unknown emails on login look like success.
    if (!existing && mode === "login") return NextResponse.json({ ok: true });

    if (!existing) {
      if (!username) {
        return NextResponse.json({ error: "Username is required", field: "username" }, { status: 400 });
      }
      if (ageConfirmed !== true) {
        return NextResponse.json(
          { error: `You must confirm you are ${MIN_AGE} or older`, field: "ageConfirmed" },
          { status: 400 },
        );
      }
      if (await User.exists({ username })) {
        return NextResponse.json({ error: "That username is taken", field: "username" }, { status: 409 });
      }
    }

    const wait = await cooldownRemaining(email);
    if (wait > 0) {
      return NextResponse.json(
        { error: `Please wait ${wait}s before requesting another code`, retryAfter: wait },
        { status: 429 },
      );
    }

    // Registering with an email that already exists simply sends a sign-in code.
    await issueCode(email, existing || !username || !ageConfirmed ? undefined : { username, ageConfirmed });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[auth] request-code failed", err);
    return NextResponse.json({ error: "Something went wrong. Try again." }, { status: 500 });
  }
}
