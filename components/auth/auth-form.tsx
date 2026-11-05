"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowLeft01Icon, Mail01Icon, Tick02Icon } from "@hugeicons/core-free-icons";
import { emptyCode, OtpInput } from "@/components/auth/otp-input";
import { TelegramLogin } from "@/components/auth/telegram-login";
import { postJson } from "@/lib/http";
import {
  loginFormSchema,
  MIN_AGE,
  registerFormSchema,
  usernameFromEmail,
  type RegisterFormValues,
} from "@/lib/validators/auth";

type Mode = "register" | "login";
type Step = "email" | "username" | "code";

const RESEND_SECONDS = 60;
const REGISTER_STEPS: Exclude<Step, "code">[] = ["email", "username"];

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const isRegister = mode === "register";

  const [step, setStep] = useState<Step>("email");
  const [sentTo, setSentTo] = useState("");
  const [pending, setPending] = useState<{ username?: string; ageConfirmed?: boolean }>({});
  const [code, setCode] = useState<string[]>(emptyCode);
  const [codeError, setCodeError] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    setError,
    trigger,
    formState: { errors, dirtyFields },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(isRegister ? registerFormSchema : loginFormSchema) as never,
    mode: "onTouched",
    defaultValues: { email: "", username: "", ageConfirmed: false },
  });

  // Suggest a username from the email until the user edits it themselves.
  const email = useWatch({ control, name: "email" });
  useEffect(() => {
    if (isRegister && !dirtyFields.username) {
      setValue("username", usernameFromEmail(email ?? ""), { shouldValidate: false });
    }
  }, [email, isRegister, dirtyFields.username, setValue]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const requestCode = useMutation({
    mutationFn: (v: { email: string; username?: string; ageConfirmed?: boolean }) =>
      postJson("/api/auth/request-code", { mode, ...v }),
    onSuccess: (_d, v) => {
      setSentTo(v.email.trim().toLowerCase());
      setPending({ username: v.username, ageConfirmed: v.ageConfirmed });
      setCode(emptyCode());
      setCodeError(false);
      setCooldown(RESEND_SECONDS);
      setStep("code");
      toast.success("Code sent. Check your inbox.");
    },
    onError: (err: Error & { data?: { field?: string; retryAfter?: number } }) => {
      const field = err.data?.field;
      if (field === "username" || field === "ageConfirmed") {
        setError(field, { message: err.message });
        setStep("username");
      } else {
        toast.error(err.message);
      }
      if (err.data?.retryAfter) setCooldown(err.data.retryAfter);
    },
  });

  const verify = useMutation({
    mutationFn: (digits: string) => postJson("/api/auth/verify", { email: sentTo, code: digits }),
    onSuccess: () => {
      toast.success(isRegister ? "Welcome to Quest Codes!" : "Welcome back!");
      router.replace("/dashboard");
      router.refresh();
    },
    onError: (err: Error) => {
      setCodeError(true);
      setCode(emptyCode());
      toast.error(err.message);
    },
  });

  // Submit automatically once all four digits are in.
  const submitted = useRef("");
  useEffect(() => {
    const digits = code.join("");
    if (digits.length === 4 && submitted.current !== digits && !verify.isPending) {
      submitted.current = digits;
      verify.mutate(digits);
    }
    if (digits.length < 4) submitted.current = "";
  }, [code, verify]);

  const sendCode = handleSubmit((v) =>
    requestCode.mutate({
      email: v.email,
      username: isRegister ? v.username : undefined,
      ageConfirmed: isRegister ? v.ageConfirmed : undefined,
    }),
  );

  /** Validate the email, then move on to the username step (the last step sends the code). */
  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isRegister && step === "email") {
      if (await trigger("email")) setStep("username");
      return;
    }
    return sendCode();
  };

  const back = () => setStep("email");

  /* ---------- Step: verification code ---------- */
  if (step === "code") {
    return (
      <div className="qo-auth-step">
        <button type="button" className="qo-back" onClick={() => setStep("email")}>
          <HugeiconsIcon icon={ArrowLeft01Icon} size={18} aria-hidden="true" />
          Change email
        </button>
        <span className="qo-icon-badge" aria-hidden="true">
          <HugeiconsIcon icon={Mail01Icon} size={22} />
        </span>
        <h1 className="qo-auth-title">Check your email</h1>
        <p className="qo-auth-sub">
          We sent a 4-digit code to <strong>{sentTo}</strong>. Type it or paste it below.
        </p>

        <OtpInput
          value={code}
          onChange={(c) => {
            setCodeError(false);
            setCode(c);
          }}
          disabled={verify.isPending}
          invalid={codeError}
          autoFocus
        />
        {codeError && <p className="qo-field-error" role="alert">That code didn&apos;t work. Try again.</p>}

        <button
          type="button"
          className="qo-btn-primary qo-auth-btn"
          disabled={code.join("").length < 4 || verify.isPending}
          onClick={() => verify.mutate(code.join(""))}
        >
          {verify.isPending ? "Verifying…" : "Verify"}
        </button>

        <button
          type="button"
          className="qo-link-btn"
          disabled={cooldown > 0 || requestCode.isPending}
          onClick={() => requestCode.mutate({ email: sentTo, ...pending })}
        >
          {cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}
        </button>
      </div>
    );
  }

  /* ---------- Steps: email -> username + age confirmation ---------- */
  const stepIndex = REGISTER_STEPS.indexOf(step);
  const isLastStep = !isRegister || step === "username";

  const copy = {
    email: {
      title: isRegister ? "Create your account" : "Welcome back",
      sub: isRegister
        ? "Start with your email. We'll send a 4-digit code to confirm it. No password needed."
        : "Enter your email and we'll send you a 4-digit sign-in code.",
    },
    username: {
      title: "Choose a username",
      sub: "We suggested one from your email. Change it if you like.",
    },
  }[step];

  return (
    <form onSubmit={onSubmit} noValidate className="qo-auth-step">
      {isRegister && (
        <div className="qo-progress" role="progressbar" aria-valuemin={1} aria-valuemax={2} aria-valuenow={stepIndex + 1} aria-label={`Step ${stepIndex + 1} of 2`}>
          {REGISTER_STEPS.map((s, i) => (
            <span key={s} className={i < stepIndex ? "is-done" : i === stepIndex ? "is-active" : ""} />
          ))}
        </div>
      )}

      {isRegister && stepIndex > 0 && (
        <button type="button" className="qo-back" onClick={back}>
          <HugeiconsIcon icon={ArrowLeft01Icon} size={18} aria-hidden="true" />
          Back
        </button>
      )}

      <h1 className="qo-auth-title">{copy.title}</h1>
      <p className="qo-auth-sub">{copy.sub}</p>

      {step === "email" && (
        <>
          <label className="qo-label" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            placeholder="you@example.com"
            autoFocus
            className={`qo-input${errors.email ? " is-invalid" : ""}`}
            {...register("email")}
          />
          {errors.email && <p className="qo-field-error">{errors.email.message}</p>}
        </>
      )}

      {step === "username" && (
        <>
          <label className="qo-label" htmlFor="username">
            Username
          </label>
          <input
            id="username"
            type="text"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="your_username"
            autoFocus
            className={`qo-input${errors.username ? " is-invalid" : ""}`}
            {...register("username")}
          />
          {errors.username ? (
            <p className="qo-field-error">{errors.username.message}</p>
          ) : (
            <p className="qo-hint">3–20 characters: lowercase letters, numbers and underscores.</p>
          )}

          <label className="qo-check">
            <input type="checkbox" {...register("ageConfirmed")} />
            <span className="qo-check-box" aria-hidden="true">
              <HugeiconsIcon icon={Tick02Icon} size={14} strokeWidth={3} />
            </span>
            <span>I confirm that I am {MIN_AGE} years of age or older.</span>
          </label>
          {errors.ageConfirmed && (
            <p className="qo-field-error" role="alert">
              {errors.ageConfirmed.message}
            </p>
          )}
        </>
      )}

      <button type="submit" className="qo-btn-primary qo-auth-btn" disabled={requestCode.isPending}>
        {requestCode.isPending ? "Sending code…" : isLastStep ? "Send code" : "Continue"}
      </button>

      {!isRegister && step === "email" && <TelegramLogin />}

      {step === "email" && (
        <p className="qo-auth-switch">
          {isRegister ? (
            <>
              Already have an account? <Link href="/login">Sign in</Link>
            </>
          ) : (
            <>
              New to Quest Codes? <Link href="/register">Create an account</Link>
            </>
          )}
        </p>
      )}
    </form>
  );
}
