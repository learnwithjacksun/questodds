"use client";

import { useEffect, useRef, useState } from "react";
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
import {
  isQuestSignal,
  type QuestLeg,
  type QuestSpecialStart,
  type QuestSpecialStatus,
} from "@/lib/sporty/schemas";
import { QUEST_SPECIAL } from "@/lib/sporty/sports";

const STATUS_KEY = ["quest-special-status"] as const;
const POLL_MS = 4000;

const LEG_OPTIONS = [1, 2, 3, 5] as const;

type TimedOut = Extract<NonNullable<QuestSpecialStatus["lastResult"]>, { timedOut: true }>;

/** A scan that ends without a slip is a normal outcome. Nothing about why is shown. */
function NoSafeSlipNote({ result }: { result: TimedOut }) {
  const when = formatWhen(new Date(result.timestamp).toISOString());
  return (
    <div className="qo-card qo-notice" role="status" style={{ marginTop: 24 }}>
      <HugeiconsIcon icon={InformationCircleIcon} size={20} aria-hidden="true" />
      <p>No code this round ({when}). Try again in a few minutes.</p>
    </div>
  );
}

function LegRow({ leg }: { leg: QuestLeg }) {
  const description = leg.description ?? leg.analysis?.description;
  const odds = leg.odds ?? leg.analysis?.odds;
  return (
    <li className="qo-qs-leg">
      <span className="qo-code-label">
        {leg.home} {leg.homeScore}–{leg.awayScore} {leg.away} · {leg.minute}&apos;
        {leg.league ? ` · ${leg.league}` : ""}
      </span>
      <span className="qo-code-meta">
        {description}
        {odds !== undefined && ` · ${formatOdds(odds)} odds`}
      </span>
    </li>
  );
}

export function QuestSpecial() {
  const queryClient = useQueryClient();
  const [legs, setLegs] = useState<number>(1);

  // The server is the source of truth, so a page refresh mid-scan picks the session back up.
  const status = useQuery({
    queryKey: STATUS_KEY,
    queryFn: () => getJson<QuestSpecialStatus>("/api/quest-special/status"),
    refetchInterval: (q) => (q.state.data?.active ? POLL_MS : false),
    retry: false,
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: STATUS_KEY });

  const start = useMutation({
    mutationFn: () => postJson<QuestSpecialStart>("/api/quest-special/start", { mode: "any", legs }),
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
  const unlimited = !!data?.isUnlimited || data?.maxDaily === "Unlimited";
  const max = typeof data?.maxDaily === "number" ? data.maxDaily : 20;
  const quotaReached = !unlimited && used >= max;
  const last = data?.lastResult;

  return (
    <div className="qo-gen">
      <div className="qo-card qo-gen-card">
        <div className="qo-card-top">
          <span className="qo-icon-badge" aria-hidden="true">
            <HugeiconsIcon icon={QUEST_SPECIAL.icon} size={22} />
          </span>
          <span className="qo-badge is-pending">{unlimited ? "Unlimited" : `${used}/${max} today`}</span>
        </div>
        <h3>{QUEST_SPECIAL.name}</h3>
        <p>{QUEST_SPECIAL.blurb}</p>

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
          <>
            <fieldset className="qo-qs-opts">
              <legend>Legs</legend>
              <div role="radiogroup" aria-label="Number of legs">
                {LEG_OPTIONS.map((n) => (
                  <button
                    key={n}
                    type="button"
                    role="radio"
                    aria-checked={legs === n}
                    className="qo-qs-opt"
                    onClick={() => setLegs(n)}
                  >
                    {n === 1 ? "Single" : n}
                  </button>
                ))}
              </div>
            </fieldset>
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
          </>
        )}
        {quotaReached && !active && (
          <p className="qo-progress-note">
            You&apos;ve used all {max} activations for today. They reset at 00:00 UTC.
          </p>
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
            <h2>{last.isMultiLeg ? `${last.legs.length}-leg slip found` : "Signal found"}</h2>
            <span className="qo-badge is-pending">{formatWhen(new Date(last.timestamp).toISOString())}</span>
          </div>
          <article className="qo-code-card">
            <div className="qo-code-main">
              {last.isMultiLeg ? (
                <ul className="qo-qs-legs">
                  {last.legs.map((leg, i) => (
                    <LegRow key={`${leg.home}-${leg.away}-${i}`} leg={leg} />
                  ))}
                </ul>
              ) : (
                <ul className="qo-qs-legs">
                  <LegRow leg={last} />
                </ul>
              )}
              {last.code ? (
                <strong className="qo-code-value">{last.code}</strong>
              ) : (
                <strong className="qo-code-value qo-code-missing">No code minted</strong>
              )}
              {last.isMultiLeg && last.totalOdds !== undefined && (
                <span className="qo-code-meta">{formatOdds(last.totalOdds)} total odds</span>
              )}
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

      {!active && last && !isQuestSignal(last) && <NoSafeSlipNote result={last} />}

      <p className="qo-fine">
        {QUEST_SPECIAL.note} Bet responsibly.
      </p>
    </div>
  );
}
