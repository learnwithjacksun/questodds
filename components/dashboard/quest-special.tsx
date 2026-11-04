"use client";

import { useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowUpRight01Icon,
  InformationCircleIcon,
  Loading03Icon,
  StopIcon,
} from "@hugeicons/core-free-icons";
import { CopyButton } from "@/components/dashboard/copy-button";
import { formatOdds, formatWhen } from "@/lib/format";
import { getJson, postJson } from "@/lib/http";
import { isQuestSignal, type QuestSpecialStart, type QuestSpecialStatus } from "@/lib/sporty/schemas";
import { QUEST_SPECIAL } from "@/lib/sporty/sports";

const STATUS_KEY = ["quest-special-status"] as const;
const POLL_MS = 4000;

export function QuestSpecial() {
  const queryClient = useQueryClient();

  // The server is the source of truth, so a page refresh mid-scan picks the session back up.
  const status = useQuery({
    queryKey: STATUS_KEY,
    queryFn: () => getJson<QuestSpecialStatus>("/api/quest-special/status"),
    refetchInterval: (q) => (q.state.data?.active ? POLL_MS : false),
    retry: false,
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: STATUS_KEY });

  const start = useMutation({
    mutationFn: () => postJson<QuestSpecialStart>("/api/quest-special/start"),
    onSuccess: () => refresh(),
    onError: (err: Error) => toast.error(err.message),
  });
  const stop = useMutation({
    mutationFn: () => postJson("/api/quest-special/stop"),
    onSuccess: () => {
      toast.info("Scan stopped.");
      return refresh();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const data = status.data;
  const active = !!data?.active;

  // Cancel a running scan if the user leaves the page (the service asks for this).
  const activeRef = useRef(false);
  useEffect(() => {
    activeRef.current = active;
  }, [active]);
  useEffect(
    () => () => {
      if (activeRef.current) void fetch("/api/quest-special/stop", { method: "POST", keepalive: true });
    },
    [],
  );

  const used = data?.dailyUsed ?? 0;
  const max = data?.maxDaily ?? 20;
  const quotaReached = used >= max;
  const last = data?.lastResult;

  return (
    <div className="qo-gen">
      <div className="qo-card qo-gen-card">
        <div className="qo-card-top">
          <span className="qo-icon-badge" aria-hidden="true">
            <HugeiconsIcon icon={QUEST_SPECIAL.icon} size={22} />
          </span>
          <span className="qo-badge is-pending">
            {used}/{max} today
          </span>
        </div>
        <h3>{QUEST_SPECIAL.name}</h3>
        <p>
          Scans live vFootball rounds for about a match (3–4 minutes). Around the 38th and 80th minutes,
          if a match fits its rules, it mints a single-leg booking code for you.
        </p>

        {active ? (
          <>
            <div className="qo-scan-row" role="status">
              <HugeiconsIcon icon={Loading03Icon} size={18} className="qo-spin" aria-hidden="true" />
              <span>
                Scanning live games… {data?.runningFor ?? 0}s · {data?.scans ?? 0} scans
              </span>
            </div>
            <button
              type="button"
              className="qo-btn-ghost qo-scan-stop"
              disabled={stop.isPending}
              onClick={() => stop.mutate()}
            >
              <HugeiconsIcon icon={StopIcon} size={16} aria-hidden="true" />
              {stop.isPending ? "Stopping…" : "Stop scanning"}
            </button>
          </>
        ) : (
          <button
            type="button"
            className="qo-btn-primary qo-gen-btn"
            disabled={start.isPending || status.isPending || quotaReached}
            onClick={() => start.mutate()}
          >
            {start.isPending
              ? "Starting…"
              : quotaReached
                ? "Daily limit reached"
                : "Start scanning"}
          </button>
        )}
        {quotaReached && !active && (
          <p className="qo-progress-note">You&apos;ve used all {max} scans for today. They reset at 00:00 UTC.</p>
        )}
        {status.isError && (
          <p className="qo-progress-note" role="alert">
            {status.error.message}
          </p>
        )}
      </div>

      {!active && isQuestSignal(last) && (
        <section className="qo-results" aria-live="polite">
          <div className="qo-results-head">
            <h2>Signal found</h2>
            <span className="qo-badge is-pending">{formatWhen(new Date(last.timestamp).toISOString())}</span>
          </div>
          <article className="qo-code-card">
            <div className="qo-code-main">
              <span className="qo-code-label">
                {last.home} {last.homeScore}–{last.awayScore} {last.away} · {last.minute}&apos;
                {last.league ? ` · ${last.league}` : ""}
              </span>
              {last.code ? (
                <strong className="qo-code-value">{last.code}</strong>
              ) : (
                <strong className="qo-code-value qo-code-missing">No code minted</strong>
              )}
              <span className="qo-code-meta">
                {last.analysis.description} · {formatOdds(last.analysis.odds)} odds
              </span>
            </div>
            {last.code && (
              <div className="qo-code-actions">
                <CopyButton value={last.code} />
                {last.url && (
                  <a href={last.url} target="_blank" rel="noopener noreferrer" className="qo-btn-ghost">
                    Open on SportyBet
                    <HugeiconsIcon icon={ArrowUpRight01Icon} size={16} aria-hidden="true" />
                  </a>
                )}
              </div>
            )}
          </article>
        </section>
      )}

      {!active && last && !isQuestSignal(last) && (
        <div className="qo-card qo-notice" role="status" style={{ marginTop: 24 }}>
          <HugeiconsIcon icon={InformationCircleIcon} size={20} aria-hidden="true" />
          <p>
            No live match qualified during the last scan ({formatWhen(new Date(last.timestamp).toISOString())}).
            Start another when you&apos;re ready.
          </p>
        </div>
      )}

      <p className="qo-fine">
        {QUEST_SPECIAL.note} Codes are suggestions, not guarantees. Codes expire quickly, so use them
        straight away. Bet responsibly.
      </p>
    </div>
  );
}
