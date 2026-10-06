export function onRequestGet({ env }) {
  return Response.json(
    { narration: !!env.GEMINI_API_KEY && env.GEMINI_LIVE_ENABLED !== "false" },
    { headers: { "Cache-Control": "no-store" } },
  );
}
