"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { postJson } from "@/lib/http";

type Props = {
  userId: string;
  username: string;
  status: "active" | "suspended";
  hasTelegram: boolean;
  note: string;
  /** What the viewing admin may do to this account. */
  canModify: boolean;
  isOwnerViewer: boolean;
  role: "user" | "admin" | "owner";
};

/** Everything an admin can do to one user. The server re-checks each action; this only hides what can't work. */
export function UserActions({ userId, username, status, hasTelegram, note, canModify, isOwnerViewer, role }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [noteText, setNoteText] = useState(note);
  const [confirmText, setConfirmText] = useState("");

  async function run(body: Record<string, unknown>, done: string, question?: string) {
    if (question && !window.confirm(question)) return;
    setBusy(true);
    try {
      await postJson(`/api/admin/users/${userId}`, body);
      toast.success(done);
      if (body.action === "delete") router.replace("/admin/users");
      else router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="qo-admin-actions">
      <section className="qo-card">
        <h3>Private note</h3>
        <p className="qo-fine">Only staff see this. Good for payment disputes and support context.</p>
        <textarea
          className="qo-input qo-admin-note"
          value={noteText}
          maxLength={2000}
          rows={4}
          onChange={(e) => setNoteText(e.target.value)}
        />
        <button
          type="button"
          className="qo-btn-ghost qo-btn-sm"
          disabled={busy || noteText === note}
          onClick={() => run({ action: "set_note", note: noteText }, "Note saved")}
        >
          Save note
        </button>
      </section>

      {canModify && (
        <section className="qo-card">
          <h3>Account actions</h3>
          <div className="qo-admin-btns">
            {status === "active" ? (
              <button
                type="button"
                className="qo-btn-ghost qo-btn-sm"
                disabled={busy}
                onClick={() => {
                  const reason = window.prompt("Reason for suspending (optional, staff only):");
                  if (reason === null) return;
                  void run({ action: "suspend", reason }, "Account suspended");
                }}
              >
                Suspend
              </button>
            ) : (
              <button
                type="button"
                className="qo-btn-ghost qo-btn-sm"
                disabled={busy}
                onClick={() => run({ action: "unsuspend" }, "Account restored")}
              >
                Restore account
              </button>
            )}
            <button
              type="button"
              className="qo-btn-ghost qo-btn-sm"
              disabled={busy}
              onClick={() =>
                run({ action: "force_logout" }, "Signed out everywhere", `Sign ${username} out of every device?`)
              }
            >
              Sign out everywhere
            </button>
            {hasTelegram && (
              <button
                type="button"
                className="qo-btn-ghost qo-btn-sm"
                disabled={busy}
                onClick={() =>
                  run(
                    { action: "unlink_telegram" },
                    "Telegram unlinked",
                    `Unlink Telegram from ${username}? They lose VIP access on the website until they link again.`,
                  )
                }
              >
                Unlink Telegram
              </button>
            )}
            {isOwnerViewer && role !== "owner" && (
              <button
                type="button"
                className="qo-btn-ghost qo-btn-sm"
                disabled={busy}
                onClick={() =>
                  run(
                    { action: "set_role", role: role === "admin" ? "user" : "admin" },
                    role === "admin" ? "Admin removed" : "Made admin",
                    role === "admin"
                      ? `Remove admin access from ${username}?`
                      : `Give ${username} admin access? They still need Telegram linked and an emailed code to enter.`,
                  )
                }
              >
                {role === "admin" ? "Remove admin" : "Make admin"}
              </button>
            )}
          </div>
        </section>
      )}

      {canModify && isOwnerViewer && (
        <section className="qo-card qo-admin-danger">
          <h3>Delete account</h3>
          <p className="qo-fine">
            Permanently removes this user. Their payment records and the audit trail are kept. Type{" "}
            <strong>{username}</strong> to confirm.
          </p>
          <input
            className="qo-input"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            aria-label="Type the username to confirm deletion"
            autoComplete="off"
          />
          <button
            type="button"
            className="qo-btn-danger qo-btn-sm"
            disabled={busy || confirmText !== username}
            onClick={() => run({ action: "delete", confirm: confirmText }, "Account deleted")}
          >
            Delete account
          </button>
        </section>
      )}
    </div>
  );
}
