"use client";

import { useEffect, useRef } from "react";

const LENGTH = 4;

type Props = {
  value: string[]; // always length 4, "" for empty
  onChange: (next: string[]) => void;
  disabled?: boolean;
  invalid?: boolean;
  autoFocus?: boolean;
};

export const emptyCode = () => Array<string>(LENGTH).fill("");

export function OtpInput({ value, onChange, disabled, invalid, autoFocus }: Props) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (autoFocus) refs.current[0]?.focus();
  }, [autoFocus]);

  const focus = (i: number) => {
    const el = refs.current[Math.max(0, Math.min(LENGTH - 1, i))];
    el?.focus();
    el?.select();
  };

  /** Write digits starting at index `start`, then move focus after the last one. */
  const fill = (start: number, digits: string) => {
    if (!digits) return;
    const next = [...value];
    let i = start;
    for (const d of digits) {
      if (i >= LENGTH) break;
      next[i++] = d;
    }
    onChange(next);
    focus(i);
  };

  return (
    <div className="qo-otp" role="group" aria-label="4-digit verification code">
      {value.map((digit, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          className={`qo-otp-box${invalid ? " is-invalid" : ""}`}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={LENGTH} // lets a browser/SMS autofill drop the whole code in one box
          autoComplete={i === 0 ? "one-time-code" : "off"}
          aria-label={`Digit ${i + 1}`}
          value={digit}
          disabled={disabled}
          onFocus={(e) => e.target.select()}
          onChange={(e) => {
            const digits = e.target.value.replace(/\D/g, "");
            if (!digits) {
              const next = [...value];
              next[i] = "";
              onChange(next);
              return;
            }
            // Typing one digit replaces the box; several (autofill) spread across boxes.
            fill(i, digits.length > 1 ? digits : digits.slice(-1));
          }}
          onPaste={(e) => {
            e.preventDefault();
            const digits = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, LENGTH);
            if (!digits) return;
            // A full code always starts from the first box, wherever the paste landed.
            fill(digits.length === LENGTH ? 0 : i, digits);
          }}
          onKeyDown={(e) => {
            if (e.key === "Backspace") {
              e.preventDefault();
              const next = [...value];
              if (next[i]) {
                next[i] = "";
                onChange(next);
              } else if (i > 0) {
                next[i - 1] = "";
                onChange(next);
                focus(i - 1);
              }
            } else if (e.key === "ArrowLeft") {
              e.preventDefault();
              focus(i - 1);
            } else if (e.key === "ArrowRight") {
              e.preventDefault();
              focus(i + 1);
            }
          }}
        />
      ))}
    </div>
  );
}
