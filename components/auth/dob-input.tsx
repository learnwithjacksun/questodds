"use client";

import { useRef, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowDown01Icon } from "@hugeicons/core-free-icons";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

type Parts = { d: string; m: string; y: string };

type Props = {
  /** YYYY-MM-DD, or "" while incomplete. */
  value: string;
  onChange: (value: string) => void;
  invalid?: boolean;
  autoFocus?: boolean;
};

function split(value: string): Parts {
  const [y = "", m = "", d = ""] = value ? value.split("-") : [];
  return { d: d ? String(Number(d)) : "", m: m ? String(Number(m)) : "", y };
}

function compose({ d, m, y }: Parts): string {
  const day = Number(d);
  const month = Number(m);
  if (y.length !== 4 || !(day >= 1 && day <= 31) || !(month >= 1 && month <= 12)) return "";
  return `${y}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function DobInput({ value, onChange, invalid, autoFocus }: Props) {
  const [parts, setParts] = useState<Parts>(() => split(value));
  const monthRef = useRef<HTMLSelectElement>(null);
  const yearRef = useRef<HTMLInputElement>(null);

  const update = (patch: Partial<Parts>) => {
    const next = { ...parts, ...patch };
    setParts(next);
    onChange(compose(next));
  };

  const cls = `qo-dob-control${invalid ? " is-invalid" : ""}`;

  return (
    <div className="qo-dob" role="group" aria-label="Date of birth">
      <div className="qo-dob-field qo-dob-day">
        <label htmlFor="dob-day">Day</label>
        <input
          id="dob-day"
          className={cls}
          type="text"
          inputMode="numeric"
          autoComplete="bday-day"
          placeholder="DD"
          maxLength={2}
          autoFocus={autoFocus}
          value={parts.d}
          onChange={(e) => {
            const d = e.target.value.replace(/\D/g, "").slice(0, 2);
            update({ d });
            // Move on once the day can't take another digit (e.g. "12", or "4" -> 04).
            if (d.length === 2 || Number(d) > 3) monthRef.current?.focus();
          }}
        />
      </div>

      <div className="qo-dob-field qo-dob-month">
        <label htmlFor="dob-month">Month</label>
        <div className="qo-select">
          <select
            id="dob-month"
            ref={monthRef}
            className={cls}
            autoComplete="bday-month"
            value={parts.m}
            onChange={(e) => {
              update({ m: e.target.value });
              if (e.target.value) yearRef.current?.focus();
            }}
          >
            <option value="">Month</option>
            {MONTHS.map((name, i) => (
              <option key={name} value={String(i + 1)}>
                {name}
              </option>
            ))}
          </select>
          <HugeiconsIcon icon={ArrowDown01Icon} size={18} aria-hidden="true" />
        </div>
      </div>

      <div className="qo-dob-field qo-dob-year">
        <label htmlFor="dob-year">Year</label>
        <input
          id="dob-year"
          ref={yearRef}
          className={cls}
          type="text"
          inputMode="numeric"
          autoComplete="bday-year"
          placeholder="YYYY"
          maxLength={4}
          value={parts.y}
          onChange={(e) => update({ y: e.target.value.replace(/\D/g, "").slice(0, 4) })}
        />
      </div>
    </div>
  );
}
