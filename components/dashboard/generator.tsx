"use client";

import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import {
  ArrowUpRight01Icon,
  CheckmarkCircle02Icon,
  CircleIcon,
  InformationCircleIcon,
  Loading03Icon,
} from "@hugeicons/core-free-icons";
import { CopyButton } from "@/components/dashboard/copy-button";
import { FootballTiers, isTiered, NoSafeSlip } from "@/components/dashboard/football-tiers";
import { HttpError, postJson } from "@/lib/http";
import { SPORTS, type GenerateRequest, type GenerateResult, type Sport } from "@/lib/sporty/schemas";
import { QUEST_SPECIAL, SPORT_META, type Service } from "@/lib/sporty/sports";
import { QuestSpecial } from "@/components/dashboard/quest-special";

type Results = Partial<Record<Sport, GenerateResult>>;

/** The four selectable services, in display order. */
const OPTIONS: { id: Service; name: string; icon: IconSvgElement }[] = [
  ...SPORTS.map((s) => ({ id: s as Service, name: SPORT_META[s].name, icon: SPORT_META[s].icon })),
  { id: QUEST_SPECIAL.id, name: QUEST_SPECIAL.name, icon: QUEST_SPECIAL.icon },
];

/** A fresh football run can take 30-90 seconds, so the browser waits well past that. */
const GENERATE_TIMEOUT_MS = 180_000;
/** After a "busy" reply, hold the button for a moment instead of letting people hammer retry. */
const BUSY_RETRY_SECONDS = 10;

function progressMessage(seconds: number, sport: Sport): string {
  if (sport === "football") return "Analysing today's matches. This can take up to 2 minutes.";
  if (seconds < 10) return "Scanning fixtures…";
  if (seconds < 45) return "Ranking legs and minting codes. This can take a minute or more.";
  return "Still working. The service may be waking up or waiting out SportyBet's rate limit.";
}

export function Generator({ initialService }: { initialService: Service }) {
  const [service, setService] = useState<Service>(initialService);
  // Tabs for Quest Special keep the last sport selected so switching back feels stable.
  const [lastSport, setLastSport] = useState<Sport>(
    initialService === QUEST_SPECIAL.id ? "football" : initialService,
  );
  const sport = service === QUEST_SPECIAL.id ? lastSport : service;
  const setSport = (s: Sport) => {
    setLastSport(s);
    setService(s);
  };
  const [results, setResults] = useState<Results>({});
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState(0);
  // Seconds left before another try is allowed after "another generation is running".
  const [busyWait, setBusyWait] = useState(0);

  const generate = useMutation({
    mutationFn: (req: GenerateRequest) =>
      postJson<GenerateResult>("/api/generate", req, { timeoutMs: GENERATE_TIMEOUT_MS }),
    onMutate: () => {
      setStartedAt(Date.now());
      setBusyWait(0);
    },
    onSuccess: (data, req) => setResults((r) => ({ ...r, [req.sport]: data })),
    onError: (err: Error) => {
      if (err instanceof HttpError && err.status === 429) setBusyWait(BUSY_RETRY_SECONDS);
      else toast.error(err.message);
    },
    onSettled: () => setStartedAt(null),
  });

  useEffect(() => {
    if (busyWait <= 0) return;
    const id = setTimeout(() => setBusyWait((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [busyWait]);

  useEffect(() => {
    if (startedAt === null) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [startedAt]);

  const busy = generate.isPending;
  const elapsed = startedAt === null ? 0 : Math.max(0, Math.floor((now - startedAt) / 1000));
  const meta = SPORT_META[sport];
  const result = results[sport];
  const tiered = result?.success === true && sport === "football" && (result.codes.length === 0 || isTiered(result.codes));

  return (
    <div className="qo-gen">
      <div className="qo-tabs" role="radiogroup" aria-label="Service">
        {OPTIONS.map((o) => {
          const selected = o.id === service;
          return (
            <button
              key={o.id}
              type="button"
              role="radio"
              aria-checked={selected}
              className={`qo-tab${selected ? " is-active" : ""}`}
              disabled={busy}
              onClick={() => (o.id === QUEST_SPECIAL.id ? setService(o.id) : setSport(o.id))}
            >
              <HugeiconsIcon icon={o.icon} size={20} aria-hidden="true" />
              <span className="qo-tab-name">{o.name}</span>
              <HugeiconsIcon
                icon={selected ? CheckmarkCircle02Icon : CircleIcon}
                size={20}
                className="qo-tab-check"
                aria-hidden="true"
              />
            </button>
          );
        })}
      </div>

      {service === QUEST_SPECIAL.id ? (
        <QuestSpecial />
      ) : (
        <>
      <div className="qo-card qo-gen-card">
        <div className="qo-card-top">
          <span className="qo-icon-badge" aria-hidden="true">
            <HugeiconsIcon icon={meta.icon} size={22} />
          </span>
        </div>
        <h3>{meta.name}</h3>
        <p>{meta.blurb}</p>

        <button
          type="button"
          className="qo-btn-primary qo-gen-btn"
          disabled={busy || busyWait > 0}
          onClick={() => generate.mutate({ sport })}
        >
          {busy ? (
            <>
              <HugeiconsIcon icon={Loading03Icon} size={18} className="qo-spin" aria-hidden="true" />
              Generating… {elapsed}s
            </>
          ) : busyWait > 0 ? (
            `Try again in ${busyWait}s`
          ) : (
            `Generate ${meta.name} codes`
          )}
        </button>
        {busy && (
          <p className="qo-progress-note" role="status">
            {progressMessage(elapsed, sport)}
          </p>
        )}
        {!busy && busyWait > 0 && (
          <p className="qo-progress-note" role="status">
            Another generation is already running for you. Give it a moment, then try again.
          </p>
        )}
      </div>

      {result && !busy && (
        <section aria-live="polite" className="qo-results">
          {result.success ? (
            <>
              <div className="qo-results-head">
                <h2>
                  {tiered
                    ? "Football slips"
                    : `${result.codes.length} code${result.codes.length === 1 ? "" : "s"}`}
                </h2>
                {result.cached && <span className="qo-badge is-pending">Cached</span>}
                {result.cached && (
                  <button
                    type="button"
                    className="qo-text-btn"
                    onClick={() => generate.mutate({ sport, fresh: true })}
                  >
                    Generate fresh
                  </button>
                )}
              </div>
              {tiered ? (
                <FootballTiers codes={result.codes} lines={result.lines} noSafeSlip={result.noSafeSlip} />
              ) : (
                result.codes.map((c) => (
                  <article className="qo-code-card" key={c.code}>
                    <div className="qo-code-main">
                      <span className="qo-code-label">Booking code</span>
                      <strong className="qo-code-value">{c.code}</strong>
                      <span className="qo-code-meta">
                        {c.odds.toFixed(2)} odds · {c.legsCount} legs
                      </span>
                    </div>
                    <div className="qo-code-actions">
                      <CopyButton value={c.code} />
                      <a href={c.url} target="_blank" rel="noopener noreferrer" className="qo-btn-ghost">
                        Open on SportyBet
                        <HugeiconsIcon icon={ArrowUpRight01Icon} size={16} aria-hidden="true" />
                      </a>
                    </div>
                  </article>
                ))
              )}
            </>
          ) : result.noSafeSlip ? (
            <NoSafeSlip message={result.message} noSafeSlip={result.noSafeSlip} />
          ) : (
            <div className="qo-card qo-notice" role="status">
              <HugeiconsIcon icon={InformationCircleIcon} size={20} aria-hidden="true" />
              <p>
                {result.message ?? result.error ?? `${meta.name}: nothing qualified right now.`} Check
                back shortly.
              </p>
            </div>
          )}
        </section>
      )}

      <p className="qo-fine">{meta.note} Codes are suggestions, not guarantees. Bet responsibly.</p>
        </>
      )}
    </div>
  );
}
