// OAuth2 callback — exchanges the ?code= from Azure AD for an access token,
// fetches the user's La Liga Fantasy profile for their nickname,
// then stores everything in httpOnly cookies and redirects to /.
//
// Token exchange uses no client_secret (public client / SPA flow).
// If Azure AD requires a client_secret, add LALIGA_CLIENT_SECRET to .env.local
// and uncomment the line below marked TODO:CLIENT_SECRET.

import { cookies } from "next/headers";

const TENANT_ID = "335316eb-f606-4361-bb86-35a7edcdcec1";

// Attempt to decode a JWT payload without verification (for nickname extraction only).
function decodeJwtPayload(token) {
  try {
    const part = token.split(".")[1];
    const padded = part + "=".repeat((4 - (part.length % 4)) % 4);
    return JSON.parse(Buffer.from(padded, "base64url").toString("utf8"));
  } catch {
    return null;
  }
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const code  = searchParams.get("code");
  const error = searchParams.get("error");

  const baseUrl = process.env.NEXT_PUBLIC_URL || "http://localhost:3000";

  if (error) {
    const desc = searchParams.get("error_description") ?? error;
    return Response.redirect(
      `${baseUrl}/login?error=${encodeURIComponent(desc)}`
    );
  }

  if (!code) {
    return Response.redirect(`${baseUrl}/login?error=no_code`);
  }

  const CLIENT_ID = process.env.LALIGA_CLIENT_ID;
  if (!CLIENT_ID) {
    return Response.redirect(`${baseUrl}/login?error=client_id_not_configured`);
  }

  // ── Step 1: Exchange authorization code for tokens ─────────────────────────
  const tokenBody = new URLSearchParams({
    grant_type:   "authorization_code",
    client_id:    CLIENT_ID,
    code,
    redirect_uri: `${baseUrl}/api/auth/callback`,
    scope:        "openid profile email",
    // TODO:CLIENT_SECRET — uncomment if Azure AD rejects the request:
    // client_secret: process.env.LALIGA_CLIENT_SECRET ?? "",
  });

  let access_token, id_token;
  try {
    const tokenRes = await fetch(
      `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`,
      {
        method:  "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body:    tokenBody,
      }
    );

    if (!tokenRes.ok) {
      const detail = await tokenRes.text();
      console.error("[auth/callback] Token exchange failed:", detail);
      return Response.redirect(
        `${baseUrl}/login?error=token_exchange_failed`
      );
    }

    const tokenData = await tokenRes.json();
    access_token = tokenData.access_token;
    id_token     = tokenData.id_token;
  } catch (err) {
    console.error("[auth/callback] Network error:", err.message);
    return Response.redirect(`${baseUrl}/login?error=network_error`);
  }

  // ── Step 2: Resolve nickname ───────────────────────────────────────────────
  // Priority: La Liga Fantasy manager name > id_token claims > fallback "User"
  let nickname = "User";

  // 2a. Try the id_token claims first (cheap, no extra request)
  if (id_token) {
    const claims = decodeJwtPayload(id_token);
    if (claims) {
      const raw = claims.preferred_username ?? claims.name ?? claims.email ?? "";
      nickname = raw.includes("@") ? raw.split("@")[0] : raw || nickname;
    }
  }

  // 2b. Try La Liga Fantasy manager endpoint for the in-game nickname
  try {
    const profileRes = await fetch(
      "https://api-fantasy.llt-services.com/api/v4/managers/me",
      {
        headers: {
          Authorization: `Bearer ${access_token}`,
          "x-lang":      "es",
          "x-app":       "Fantasy-web",
        },
      }
    );
    if (profileRes.ok) {
      const profile = await profileRes.json();
      // Response shape varies; try common paths
      const mgr = profile?.manager ?? profile?.data?.manager ?? profile;
      const fantasyNick =
        mgr?.managerName ?? mgr?.nickname ?? mgr?.name ?? mgr?.managerNickname;
      if (fantasyNick) nickname = fantasyNick;
    } else {
      console.warn(
        `[auth/callback] managers/me returned ${profileRes.status} — using id_token nickname`
      );
    }
  } catch (err) {
    console.warn("[auth/callback] managers/me fetch failed (non-fatal):", err.message);
  }

  // ── Step 3: Store in httpOnly cookies ──────────────────────────────────────
  const cookieStore = await cookies();
  const secure = process.env.NODE_ENV === "production";
  const maxAge = 60 * 60 * 24; // 24 h

  cookieStore.set("lliga_token", access_token, {
    httpOnly: true,
    secure,
    sameSite: "strict",
    maxAge,
    path: "/",
  });

  cookieStore.set("lliga_nickname", nickname, {
    httpOnly: false,
    secure,
    sameSite: "strict",
    maxAge,
    path: "/",
  });

  return Response.redirect(`${baseUrl}/`);
}
