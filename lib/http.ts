/** Error thrown by client-side fetch helpers; carries the JSON body for field-level handling. */
export class HttpError<T = Record<string, unknown>> extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly data: T,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

async function send<T>(url: string, init?: RequestInit, timeoutMs?: number): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, timeoutMs ? { ...init, signal: AbortSignal.timeout(timeoutMs) } : init);
  } catch (err) {
    if (err instanceof DOMException && err.name === "TimeoutError") {
      throw new HttpError("This is taking longer than expected. Try again in a moment.", 408, {});
    }
    throw err;
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new HttpError((data as { error?: string }).error ?? "Request failed", res.status, data);
  return data as T;
}

export function postJson<T>(url: string, body?: unknown, opts?: { timeoutMs?: number }): Promise<T> {
  return send<T>(
    url,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body ?? {}),
    },
    opts?.timeoutMs,
  );
}

export const getJson = <T>(url: string): Promise<T> => send<T>(url);
export const deleteJson = <T>(url: string): Promise<T> => send<T>(url, { method: "DELETE" });
