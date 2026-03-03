import { cookies } from "next/headers";

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get("lliga_token")?.value;

  const headers = {
    Accept: "application/json",
    "User-Agent": "Mozilla/5.0",
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  try {
    const res = await fetch(
      "https://api-fantasy.llt-services.com/api/v6/players?x-lang=es",
      { headers, next: { revalidate: 3600 } }
    );
    if (!res.ok) {
      return Response.json(
        { error: `Fantasy API responded with ${res.status}` },
        { status: res.status }
      );
    }
    const data = await res.json();
    return Response.json(data);
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
