import { readFile } from "node:fs/promises";

export function normalizeSiteURL(value) {
  if (!value?.trim()) return null;
  const url = new URL(value.trim());
  if (!["https:", "http:"].includes(url.protocol) || url.username || url.password) {
    throw new Error("SITE_URL must be an HTTP(S) website URL without credentials.");
  }
  url.search = "";
  url.hash = "";
  url.pathname = url.pathname.replace(/\/+$/, "") + "/";
  return url.href;
}

export function siteURLFromFile(text) {
  // Only this public setting is used. API credentials never enter the build.
  const entry = String(text).split(/\r?\n/).find(line => /^\s*(?:export\s+)?SITE_URL\s*=/.test(line));
  if (!entry) return null;
  let value = entry.replace(/^\s*(?:export\s+)?SITE_URL\s*=\s*/, "").trim();
  const quoted = /^(["'])(.*?)\1\s*(?:#.*)?$/.exec(value);
  value = quoted ? quoted[2] : value.replace(/\s+#.*$/, "").trim();
  return normalizeSiteURL(value);
}

export async function configuredSiteURL(env = process.env, envFile = new URL("../.env", import.meta.url)) {
  if (env.SITE_URL?.trim()) return normalizeSiteURL(env.SITE_URL);
  if (env.CF_PAGES_URL?.trim()) return normalizeSiteURL(env.CF_PAGES_URL);
  try { return siteURLFromFile(await readFile(envFile, "utf8")); }
  catch (error) { if (error.code === "ENOENT") return null; throw error; }
}
