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
  type QuestMode,
  type QuestSpecialStart,
  type QuestSpecialStatus,
} from "@/lib/sporty/schemas";
import { QUEST_SPECIAL } from "@/lib/sporty/sports";

const STATUS_KEY = ["quest-special-status"] as const;
const POLL_MS = 4000;

const MODES: { id: QuestMode; label: string; hint: string }[] = [
  { id: "any", label: "Mixed", hint: "Handicap first, with safer fallbacks" },
  { id: "handicap", label: "Handicap", hint: "Handicap and double chance only" },
  { id: "ou", label: "Under", hint: "Under lines only" },
];
const LEG_OPTIONS = [1, 2, 3, 5] as const;

type TimedOut = Extract<NonNullable<QuestSpecialStatus["lastResult"]>, { timedOut: true }>;

const percent = (value: number | undefined) => (value === undefined ? null : `${Math.round(value * 100)}%`);

/** Plain-language explanation of why a scan ended without a slip. */
function NoSafeSlipNote({ result }: { result: TimedOut }) {
  const info = result.noSafeSlip;
  const when = formatWhen(new Date(result.timestamp).toISOString());
  return (
    <div className="qo-card qo-notice" role="status" style={{ marginTop: 24 }}>
      <HugeiconsIcon icon={InformationCircleIcon} size={20} aria-hidden="true" />
      <div>
        <p>
          No safe slip this round ({when}). Quest Codes doesn&apos;t lower its safety bar, so no code was
          minted.
        </p>
        {info ? (
          <p className="qo-fine">
            {info.reasons.length > 0 && <>{info.reasons.join(". ")}. </>}
            {info.inWindow !== undefined && <>{info.inWindow} legs were inside the time window</>}
            {info.considered !== undefined && <>, {info.considered} passed the filters</>}
            {info.inWindow !== undefined && "."}
          </p>
        ) : (
          <p className="qo-fine">
            No match reached a scan window (around minutes 40–43 and 80–86) while this ran. Try again
            in a few minutes.
          </p>
        )}
      </div>
    </div>
  );
}

function LegRow({ leg }: { leg: QuestLeg }) {
  const description = leg.description ?? leg.analysis?.description;
  const odds = leg.odds ?? leg.analysis?.odds;
  const prob = percent(leg.prob);
  return (
    <li className="qo-qs-leg">
      <span className="qo-code-label">
        {leg.home} {leg.homeScore}–{leg.awayScore} {leg.away} · {leg.minute}&apos;
        {leg.league ? ` · ${leg.league}` : ""}
      </span>
      <span className="qo-code-meta">
        {description}
        {odds !== undefined && ` · ${formatOdds(odds)} odds`}
        {prob && ` · ${prob} chance`}
        {leg.safetyScore !== undefined && ` · safety ${leg.safetyScore}/100`}
      </span>
    </li>
  );
}

export function QuestSpecial() {
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<QuestMode>("any");
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
    mutationFn: () => postJson<QuestSpecialStart>("/api/quest-special/start", { mode, legs }),
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
        <p>
          Scans live vFootball rounds for up to 10 minutes and mints a booking code only when a match
          clears its safety rules, using half-time markets around the 40th minute and full-time markets
          around the 80th. If nothing is safe you get no code, and that scan isn&apos;t counted.
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
          <>
            <fieldset className="qo-qs-opts">
              <legend>Style</legend>
              <div role="radiogroup" aria-label="Selection style">
                {MODES.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    role="radio"
                    aria-checked={mode === m.id}
                    title={m.hint}
                    className="qo-qs-opt"
                    onClick={() => setMode(m.id)}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </fieldset>
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
            {legs >= 5 && (
              <p className="qo-fine">
                Five-leg slips rarely clear the safety bar, so &ldquo;no safe slip&rdquo; is the usual
                result. That&apos;s intentional.
              </p>
            )}
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
              <span className="qo-code-meta">
                {last.isMultiLeg && last.totalOdds !== undefined && `${formatOdds(last.totalOdds)} total odds`}
                {last.isMultiLeg && last.totalOdds !== undefined && last.jointProb !== undefined && " · "}
                {last.jointProb !== undefined && `${percent(last.jointProb)} combined chance, never guaranteed`}
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

      {!active && last && !isQuestSignal(last) && <NoSafeSlipNote result={last} />}

      <p className="qo-fine">
        {QUEST_SPECIAL.note} Codes are suggestions, not guarantees. Codes expire quickly, so use them
        straight away. Bet responsibly.
      </p>
    </div>
  );
}
