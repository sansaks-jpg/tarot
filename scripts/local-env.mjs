import { readFileSync } from "node:fs";

export function parseEnv(text) {
  const result = {};
  for (const line of text.replace(/^\uFEFF/, "").split(/\r?\n/)) {
    const match = /^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*?)\s*$/.exec(line);
    if (!match) continue;
    let value = match[2];
    if (/^(['"]).*\1$/.test(value)) value = value.slice(1, -1);
    result[match[1]] = value;
  }
  return result;
}

export function localEnv() {
  let values = {};
  try {
    values = parseEnv(
      readFileSync(new URL("../.env", import.meta.url), "utf8"),
    );
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  // Read on each API request: filling .env does not require another restart.
  return { ...process.env, ...values };
}
