import type { AppContext } from "../types";

export async function verifyTurnstile(c: AppContext): Promise<boolean> {
  let token =
    c.req.header("cf-turnstile-response") ||
    (await c.req.formData()).get("cf-turnstile-response") as string | undefined;

  if (!token && c.req.method === "POST") {
    try {
      const body = await c.req.json<{ "cf-turnstile-response"?: string }>();
      token = body["cf-turnstile-response"];
    } catch {
      // ignore JSON parse errors
    }
  }

  if (!token) {
    return false;
  }

  const ip =
    c.req.raw.headers.get("CF-Connecting-IP") ||
    c.req.raw.headers.get("X-Forwarded-For") ||
    "unknown";

  const secret = "0x4AAAAAABtEXvqC-HT5w1UuV-r68u5h0to";

  const formData = new FormData();
  formData.append("secret", secret);
  formData.append("response", token);
  formData.append("remoteip", ip);

  const resp = await fetch(
    "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    {
      method: "POST",
      body: formData,
    }
  );


  if (!resp.ok) return false;

  const data = (await resp.json()) as { success: boolean };
  return data.success === true;
}
