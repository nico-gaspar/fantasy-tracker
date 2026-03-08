import { cookies } from "next/headers";

async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete("lliga_token");
  cookieStore.delete("lliga_nickname");
}

// POST — called from the client-side logout button in App.jsx
export async function POST() {
  await clearSession();
  return Response.json({ ok: true });
}

// GET — fallback for direct navigation or future OAuth2 logout redirect
export async function GET() {
  await clearSession();
  const baseUrl = process.env.NEXT_PUBLIC_URL || "http://localhost:3000";
  return Response.redirect(`${baseUrl}/`);
}
