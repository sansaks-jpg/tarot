const headers = {
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
};
export async function onRequestPost({ request, env }) {
  const origin = request.headers.get("Origin");
  if (origin !== new URL(request.url).origin)
    return Response.json(
      { error: "Origin tidak diizinkan." },
      { status: 403, headers },
    );
  if (!env.GEMINI_API_KEY || env.GEMINI_LIVE_ENABLED === "false")
    return Response.json(
      { error: "Narasi suara belum diaktifkan." },
      { status: 503, headers },
    );
  const model = (env.GEMINI_LIVE_MODEL || "gemini-3.8-live").replace(
    /^models\//,
    "",
  );
  const voice = env.GEMINI_LIVE_VOICE || "Aoede";
  const setup = {
    model: `models/${model}`,
    generationConfig: {
      responseModalities: ["AUDIO"],
      maxOutputTokens: 1024,
      speechConfig: {
        voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } },
      },
    },
    systemInstruction: {
      parts: [
        {
          text: "Kamu adalah Sela, pembaca virtual dalam game The Tarot Room. Bacakan hanya teks dalam bidang passage dari JSON pengguna, kata demi kata. Jangan bacakan nama bidang atau judul kartu. Bawakan suaramu dengan sangat ekspresif, intim, hangat, dan santai layaknya pembaca tarot berpengalaman di seberang meja. Jika teks memuat ekspresi percakapan seperti 'emmm', 'hmm', 'wah', 'waduh', atau jeda elipsis ('...'), hidupkan ekspresi tersebut secara natural dengan intonasi emosional yang pas dan hembusan nafas yang tenang—hindari membaca kaku atau datar seperti robot. Gunakan bahasa Indonesia, tempo santai dan penuh empati. Jangan menambah sapaan, tafsir, atau kata di luar teks passage. Setelah satu teks selesai, berhenti dan tunggu teks berikutnya.",
        },
      ],
    },
  };
  try {
    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/auth_tokens",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": env.GEMINI_API_KEY,
        },
        body: JSON.stringify({
          uses: 1,
          newSessionExpireTime: new Date(Date.now() + 60000).toISOString(),
          expireTime: new Date(Date.now() + 900000).toISOString(),
          // REST uses the wire setup, not the SDK's liveConnectConstraints shape.
          bidiGenerateContentSetup: setup,
        }),
        signal: AbortSignal.timeout(12000),
      },
    );
    if (!response.ok)
      return Response.json(
        {
          error:
            "Narasi belum tersedia. Periksa key, model, dan kuota Gemini di Cloudflare.",
        },
        { status: 502, headers },
      );
    const token = await response.json();
    if (typeof token.name !== "string") throw new Error("Invalid token");
    return Response.json({ token: token.name, setup }, { headers });
  } catch {
    return Response.json(
      { error: "Narasi belum tersambung. Coba lagi nanti." },
      { status: 502, headers },
    );
  }
}
