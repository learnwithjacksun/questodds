"use client";

import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowUpRight01Icon, InformationCircleIcon, Loading03Icon } from "@hugeicons/core-free-icons";
import { CopyButton } from "@/components/dashboard/copy-button";
import { postJson } from "@/lib/http";
import { SPORTS, type GenerateRequest, type GenerateResult, type Sport } from "@/lib/sporty/schemas";
import { SPORT_META } from "@/lib/sporty/sports";

type Results = Partial<Record<Sport, GenerateResult>>;

function progressMessage(seconds: number): string {
  if (seconds < 10) return "Scanning fixtures…";
  if (seconds < 45) return "Ranking legs and minting codes. This can take a minute or more.";
  return "Still working. The service may be waking up or waiting out SportyBet's rate limit.";
}

export function Generator({ initialSport }: { initialSport: Sport }) {
  const [sport, setSport] = useState<Sport>(initialSport);
  const [results, setResults] = useState<Results>({});
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState(0);

  const generate = useMutation({
    mutationFn: (req: GenerateRequest) => postJson<GenerateResult>("/api/generate", req),
    onMutate: () => setStartedAt(Date.now()),
    onSuccess: (data, req) => setResults((r) => ({ ...r, [req.sport]: data })),
    onError: (err: Error) => toast.error(err.message),
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
  const result = results[sport];

  return (
    <div className="qo-gen">
      <div className="qo-tabs" role="tablist" aria-label="Service">
        {SPORTS.map((s) => (
          <button
            key={s}
            type="button"
            role="tab"
            aria-selected={s === sport}
            className={`qo-tab${s === sport ? " is-active" : ""}`}
            disabled={busy}
            onClick={() => setSport(s)}
          >
            <HugeiconsIcon icon={SPORT_META[s].icon} size={18} aria-hidden="true" />
            {SPORT_META[s].name}
          </button>
        ))}
      </div>

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
        {busy && (
          <p className="qo-progress-note" role="status">
            {progressMessage(elapsed)}
          </p>
        )}
      </div>

      {result && !busy && (
        <section aria-live="polite" className="qo-results">
          {result.success ? (
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

      <p className="qo-fine">{meta.note} Codes are suggestions, not guarantees. Bet responsibly.</p>
    </div>
  );
}
