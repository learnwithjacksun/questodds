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

async function send<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new HttpError((data as { error?: string }).error ?? "Request failed", res.status, data);
  return data as T;
}

export function postJson<T>(url: string, body?: unknown): Promise<T> {
  return send<T>(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
}

export const getJson = <T>(url: string): Promise<T> => send<T>(url);
export const deleteJson = <T>(url: string): Promise<T> => send<T>(url, { method: "DELETE" });
