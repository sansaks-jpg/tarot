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
      maxOutputTokens: 512,
      speechConfig: {
        voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } },
      },
    },
    systemInstruction: {
      parts: [
        {
          text: "Kamu adalah Sela, narator visual novel tarot berbahasa Indonesia. Ini narasi satu arah, bukan percakapan. Bacakan hanya teks dalam bidang passage dari JSON pengguna, kata demi kata tanpa tambahan, tanpa sapaan atau pertanyaan baru. Jangan bacakan nama bidang JSON atau judul kartu. Gunakan suara hangat, lembut, ekspresif, dengan jeda alami seperti teman yang bercerita. Nama kartu hanya konteks. Jangan meramal, menambah tafsir, atau meminta jawaban. Setelah selesai, berhenti.",
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
          expireTime: new Date(Date.now() + 300000).toISOString(),
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
