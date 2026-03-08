// Redirects to the La Liga login page for OAuth2.
//
// TODO: Set LALIGA_CLIENT_ID in .env.local once confirmed.
// Best candidate from bundle investigation: fec9e3fd-8f88-45ab-8cbd-b70b9d65dde0
// If login.laliga.es rejects the client_id, find the real one by proxying the
// La Liga Fantasy iOS/Android app and watching the /authorize request.

export async function GET(request) {
  const CLIENT_ID = process.env.LALIGA_CLIENT_ID;
  if (!CLIENT_ID) {
    return Response.json(
      { error: "LALIGA_CLIENT_ID is not set in .env.local" },
      { status: 500 }
    );
  }

  const baseUrl = process.env.NEXT_PUBLIC_URL || "http://localhost:3000";

  const authorizeUrl = new URL("https://login.laliga.es");
  authorizeUrl.searchParams.set("redirect_uri", `${baseUrl}/api/auth/callback`);
  authorizeUrl.searchParams.set("response_type", "code");
  authorizeUrl.searchParams.set("client_id", CLIENT_ID);

  return Response.redirect(authorizeUrl.toString());
}
