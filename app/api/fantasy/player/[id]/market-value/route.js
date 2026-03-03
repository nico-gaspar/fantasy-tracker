export async function GET(request, { params }) {
  const { id } = await params;

  try {
    const res = await fetch(
      `https://api-fantasy.llt-services.com/api/v3/player/${id}/market-value?x-lang=es`,
      {
        headers: { Accept: "application/json", "User-Agent": "Mozilla/5.0" },
        next: { revalidate: 1800 },
      }
    );
    if (!res.ok) {
      return Response.json(
        { error: `Market value API responded with ${res.status}` },
        { status: res.status }
      );
    }
    const data = await res.json();
    return Response.json(data);
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
