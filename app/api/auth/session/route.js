import { cookies } from "next/headers";

export async function GET() {
  const cookieStore = await cookies();
  const token    = cookieStore.get("lliga_token")?.value;
  const nickname = cookieStore.get("lliga_nickname")?.value;

  if (!token) return Response.json({ authenticated: false });
  return Response.json({ authenticated: true, nickname: nickname ?? "User" });
}
