import { cookies } from "next/headers";

const GUEST_CLIENT_ID = "fec9e3fd-8f88-45ab-8cbd-b70b9d65dde0";

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { email, password } = body;
  if (!email || !password) {
    return Response.json({ error: "Email and password are required" }, { status: 400 });
  }

  // Step 1 — get guest token
  let guestToken;
  try {
    const guestRes = await fetch("https://pr-api.laliga.es/api/v2/guests", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "User-Agent": "Mozilla/5.0",
        Origin: "https://fantasy.laliga.com",
        Referer: "https://fantasy.laliga.com/",
      },
      body: JSON.stringify({ idClient: GUEST_CLIENT_ID }),
    });

    if (!guestRes.ok) {
      return Response.json(
        {
          error: "La Liga auth service is unreachable",
          detail: `Guest endpoint returned ${guestRes.status}`,
          code: "GUEST_ENDPOINT_FAILED",
        },
        { status: 503 }
      );
    }

    const guestData = await guestRes.json();
    guestToken = guestData?.token ?? guestData?.data?.token;

    if (!guestToken) {
      return Response.json(
        { error: "Guest token not found in response", code: "GUEST_TOKEN_MISSING" },
        { status: 502 }
      );
    }
  } catch (err) {
    return Response.json(
      { error: "Network error reaching La Liga auth", detail: err.message, code: "GUEST_NETWORK_ERROR" },
      { status: 503 }
    );
  }

  // Step 2 — exchange credentials for user token
  try {
    const loginRes = await fetch("https://pr-api.laliga.es/api/v2/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${guestToken}`,
        "User-Agent": "Mozilla/5.0",
        Origin: "https://fantasy.laliga.com",
        Referer: "https://fantasy.laliga.com/",
      },
      body: JSON.stringify({ login: email, password }),
    });

    if (!loginRes.ok) {
      const errData = await loginRes.json().catch(() => ({}));
      return Response.json(
        { error: "Invalid credentials", detail: errData, code: "LOGIN_FAILED" },
        { status: 401 }
      );
    }

    const loginData = await loginRes.json();
    const userToken = loginData?.token ?? loginData?.data?.token;
    const nickname  = loginData?.user?.nickname ?? loginData?.data?.user?.nickname ?? email.split("@")[0];

    if (!userToken) {
      return Response.json(
        { error: "User token not found in login response", code: "USER_TOKEN_MISSING" },
        { status: 502 }
      );
    }

    const cookieStore = await cookies();
    const secure = process.env.NODE_ENV === "production";

    cookieStore.set("lliga_token", userToken, {
      httpOnly: true,
      secure,
      sameSite: "strict",
      maxAge: 60 * 60 * 24,
      path: "/",
    });

    cookieStore.set("lliga_nickname", nickname, {
      httpOnly: false,
      secure,
      sameSite: "strict",
      maxAge: 60 * 60 * 24,
      path: "/",
    });

    return Response.json({ ok: true, nickname });
  } catch (err) {
    return Response.json(
      { error: "Network error during login", detail: err.message, code: "LOGIN_NETWORK_ERROR" },
      { status: 503 }
    );
  }
}
