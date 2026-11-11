"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import {
  Alert02Icon,
  ArrowUpRight01Icon,
  CheckmarkCircle02Icon,
  CircleIcon,
  InformationCircleIcon,
  Loading03Icon,
} from "@hugeicons/core-free-icons";
import { CopyButton } from "@/components/dashboard/copy-button";
import {
  AllTiersResult,
  deriveTierResult,
  StatsVerifiedBadge,
  StatsVerifiedLeagues,
  TierPicker,
  TierResult,
} from "@/components/dashboard/football-tiers";
import { HttpError, postJson } from "@/lib/http";
import {
  SPORTS,
  type GenerateRequest,
  type GenerateResult,
  type Sport,
  type Tier,
} from "@/lib/sporty/schemas";
import { FOOTBALL_TIERS, QUEST_SPECIAL, SPORT_META, type Service } from "@/lib/sporty/sports";
import { QuestSpecial } from "@/components/dashboard/quest-special";

/** The four selectable services, in display order. */
const OPTIONS: { id: Service; name: string; icon: IconSvgElement }[] = [
  ...SPORTS.map((s) => ({ id: s as Service, name: SPORT_META[s].name, icon: SPORT_META[s].icon })),
  { id: QUEST_SPECIAL.id, name: QUEST_SPECIAL.name, icon: QUEST_SPECIAL.icon },
];

/** A fresh football run can take up to ~3 minutes, so the browser waits past that. */
const GENERATE_TIMEOUT_MS = 200_000;

/** Results are kept per request for the session (component state only): one per football tier, one per other sport. */
const ALL_KEY = "football:all";
const ALL_TIERS: Tier[] = FOOTBALL_TIERS.map((t) => t.slug);
const resultKey = (req: Pick<GenerateRequest, "sport" | "tier" | "tiers">): string =>
  req.sport !== "football" ? req.sport : req.tiers?.length ? ALL_KEY : `football:${req.tier}`;

function progressMessage(seconds: number, req: GenerateRequest | null): string {
  const sport = req?.sport ?? "football";
  if (sport === "football") {
    if (req?.tiers?.length) return "Building all tiers. This can take up to 3 minutes.";
    return req?.tier === "tycoon" || req?.tier === "moonshot"
      ? "Scanning matches over the next 36 / 48 hours. This can take up to 3 minutes."
      : "Checking matches, odds and team stats… This can take up to 3 minutes.";
  }
  if (seconds < 10) return "Scanning fixtures…";
  if (seconds < 45) return "Ranking legs and minting codes. This can take a minute or more.";
  return "Still working. The service may be waking up or waiting out SportyBet's rate limit.";
}

type Problem = "busy" | "failed" | "invalid" | null;

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
  const [tier, setTier] = useState<Tier>("rookie");
  // "all" shows the All tiers run; otherwise the selected tier's result.
  const [view, setView] = useState<"tier" | "all">("tier");
  const [results, setResults] = useState<Partial<Record<string, GenerateResult>>>({});
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState(0);
  const [needsSubscription, setNeedsSubscription] = useState(false);
  const [problem, setProblem] = useState<Problem>(null);
  const [lastRequest, setLastRequest] = useState<GenerateRequest | null>(null);

  const generate = useMutation({
    mutationFn: (req: GenerateRequest) =>
      postJson<GenerateResult>("/api/generate", req, { timeoutMs: GENERATE_TIMEOUT_MS }),
    onMutate: (req) => {
      setStartedAt(Date.now());
      setNeedsSubscription(false);
      setProblem(null);
      setLastRequest(req);
    },
    onSuccess: (data, req) =>
      setResults((r) => {
        const next = { ...r, [resultKey(req)]: data };
        // An All run also fills every tier's own slot, so switching to a tier card keeps its result.
        if (req.sport === "football" && req.tiers?.length) {
          for (const slug of ALL_TIERS) next[`football:${slug}`] = deriveTierResult(data, slug);
        }
        return next;
      }),
    onError: (err: Error) => {
      if (err instanceof HttpError && err.status === 403 && err.data.code === "subscription_required") {
        // No active subscription: send them to pay instead of showing a raw error.
        setNeedsSubscription(true);
      } else if (err instanceof HttpError && err.status === 429) {
        // Busy: say so once. No automatic retrying.
        setProblem("busy");
      } else if (err instanceof HttpError && err.status === 400) {
        // The front end sent a tier the service doesn't know: a bug, not something to explain to users.
        if (process.env.NODE_ENV !== "production") console.warn("[generate] rejected tier", err.data.validTiers);
        setProblem("invalid");
      } else if (!(err instanceof HttpError) || err.status === 408 || err.status >= 500) {
        // Timeout, network failure or server error.
        setProblem("failed");
      } else {
        toast.error(err.message);
      }
    },
    onSettled: () => setStartedAt(null),
  });

  useEffect(() => {
    if (startedAt === null) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [startedAt]);

  const busy = generate.isPending;
  const elapsed = startedAt === null ? 0 : Math.max(0, Math.floor((now - startedAt) / 1000));
  const meta = SPORT_META[sport];
  const isFootball = sport === "football";
  const showAll = isFootball && view === "all";
  const result = results[showAll ? ALL_KEY : resultKey({ sport, tier })];
  const generatedTiers = new Set(ALL_TIERS.filter((slug) => results[`football:${slug}`]));

  // Picking a tier shows its earlier result if there is one; otherwise it starts that tier's run.
  const pickTier = (next: Tier) => {
    if (busy) return;
    setTier(next);
    setView("tier");
    setProblem(null);
    setNeedsSubscription(false);
    if (!results[`football:${next}`]) generate.mutate({ sport: "football", tier: next });
  };

  // The explicit full list, so the response comes back with requestedTiers.
  const runAll = () => generate.mutate({ sport: "football", tiers: ALL_TIERS });
  const pickAll = () => {
    if (busy) return;
    setView("all");
    setProblem(null);
    setNeedsSubscription(false);
    if (!results[ALL_KEY]) runAll();
  };

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

            {isFootball ? (
              <TierPicker
                selected={showAll ? null : tier}
                allSelected={showAll}
                disabled={busy}
                generated={generatedTiers}
                allGenerated={!!results[ALL_KEY]}
                onSelect={pickTier}
                onAll={pickAll}
              />
            ) : (
              <button
                type="button"
                className="qo-btn-primary qo-gen-btn"
                disabled={busy}
                onClick={() => generate.mutate({ sport })}
              >
                {busy ? (
                  <>
                    <HugeiconsIcon icon={Loading03Icon} size={18} className="qo-spin" aria-hidden="true" />
                    Generating… {elapsed}s
                  </>
                ) : (
                  `Generate ${meta.name} codes`
                )}
              </button>
            )}

            {busy && (
              <div className="qo-scan-row" role="status">
                <HugeiconsIcon icon={Loading03Icon} size={18} className="qo-spin" aria-hidden="true" />
                <span>
                  {progressMessage(elapsed, lastRequest)}
                  {isFootball && ` · ${elapsed}s`}
                </span>
              </div>
            )}
            {problem === "busy" && !busy && (
              <p className="qo-progress-note" role="status">
                The system is busy, try again in a moment.
              </p>
            )}
          </div>

          {isFootball && <StatsVerifiedLeagues />}

          {needsSubscription && !busy && (
            <div className="qo-card qo-notice" role="status">
              <HugeiconsIcon icon={InformationCircleIcon} size={20} aria-hidden="true" />
              <p>
                A VIP subscription is required to generate codes.{" "}
                <Link href="/dashboard/upgrade" className="qo-admin-link">
                  Upgrade to VIP
                </Link>
              </p>
            </div>
          )}

          {problem === "invalid" && !busy && (
            <div className="qo-card qo-notice" role="alert">
              <HugeiconsIcon icon={Alert02Icon} size={20} aria-hidden="true" />
              <p>Something went wrong, please refresh.</p>
            </div>
          )}

          {problem === "failed" && !busy && (
            <div className="qo-card qo-notice" role="alert">
              <HugeiconsIcon icon={Alert02Icon} size={20} aria-hidden="true" />
              <div>
                <p>Generation took too long or failed. Try again.</p>
                {lastRequest && (
                  <button
                    type="button"
                    className="qo-btn-ghost qo-btn-sm"
                    style={{ marginTop: 12 }}
                    onClick={() => generate.mutate(lastRequest)}
                  >
                    Try again
                  </button>
                )}
              </div>
            </div>
          )}

          {result && !busy && problem === null && !needsSubscription && (
            <section aria-live="polite" className="qo-results">
              {showAll ? (
                <AllTiersResult result={result} onAgain={runAll} />
              ) : isFootball ? (
                <TierResult
                  tier={tier}
                  result={result}
                  onAgain={() => generate.mutate({ sport: "football", tier })}
                />
              ) : result.success ? (
                <>
                  <div className="qo-results-head">
                    <h2>
                      {result.codes.length} code{result.codes.length === 1 ? "" : "s"}
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
                  {result.codes.map((c) => (
                    <article className="qo-code-card" key={c.code}>
                      <div className="qo-code-main">
                        <span className="qo-tier-head">
                          <span className="qo-code-label">Booking code</span>
                          <StatsVerifiedBadge code={c} />
                        </span>
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
                  ))}
                </>
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

          {isFootball && <p className="qo-fine qo-tier-note">Picks are estimates and not guaranteed.</p>}
          <p className="qo-fine">{meta.note} Bet responsibly.</p>
        </>
      )}
    </div>
  );
}
