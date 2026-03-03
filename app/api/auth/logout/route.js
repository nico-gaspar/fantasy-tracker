import { cookies } from "next/headers";

export async function POST() {
  const cookieStore = await cookies();
  cookieStore.delete("lliga_token");
  cookieStore.delete("lliga_nickname");
  return Response.json({ ok: true });
}
