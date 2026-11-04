import { Suspense } from "react";
import { redirect } from "next/navigation";
import { connectDB } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { User } from "@/lib/models/user";
import { LogoutButton } from "@/components/auth/logout-button";

async function DashboardContent() {
  const session = await getSession();
  if (!session) redirect("/login");

  await connectDB();
  const user = await User.findById(session.userId).select("username email").lean();
  if (!user) redirect("/login");

  return (
    <div className="qo-section">
      <h1 className="qo-h2">Hi, {user.username}</h1>
      <p style={{ color: "var(--muted)", marginBottom: 24 }}>
        Signed in as {user.email}. The dashboard is coming in the next phase.
      </p>
      <LogoutButton />
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={null}>
      <DashboardContent />
    </Suspense>
  );
}
