import assert from "node:assert/strict";
import { Writable } from "node:stream";
import { once } from "node:events";
import { handle } from "./serve.mjs";

// Exercise the handler directly, with no listening server and no .env access.
class ResponseSink extends Writable {
  constructor() {
    super();
    this.chunks = [];
  }
  _write(chunk, encoding, next) {
    this.chunks.push(Buffer.from(chunk));
    next();
  }
  writeHead(status, headers = {}) {
    this.status = status;
    this.headers = headers;
  }
}
async function request(url, method = "GET", headers = {}) {
  const sink = new ResponseSink(),
    finished = once(sink, "finish");
  await handle(
    { url, method, headers: { host: "localhost:8080", ...headers } },
    sink,
  );
  await finished;
  return {
    status: sink.status,
    headers: sink.headers,
    body: Buffer.concat(sink.chunks),
  };
}
const head = await request("/assets/audio/room.m4a", "HEAD");
assert.equal(head.status, 200);
assert.equal(head.headers["Content-Type"], "audio/mp4");
assert.equal(head.body.length, 0);
assert.ok(head.headers["Content-Length"] > 1000000);
const range = await request("/assets/audio/room.m4a", "GET", {
  range: "bytes=0-31",
});
assert.equal(range.status, 206);
assert.equal(range.body.length, 32);
assert.match(range.headers["Content-Range"], /^bytes 0-31\//);
const suffix = await request("/assets/audio/room.m4a", "GET", {
  range: "bytes=-16",
});
assert.equal(suffix.status, 206);
assert.equal(suffix.body.length, 16);
assert.equal(
  (await request("/assets/audio/room.m4a", "GET", { range: "bytes=99999999-" }))
    .status,
  416,
);
assert.equal(
  (await request("/assets/audio/room.m4a", "GET", { range: "bytes=0-9,20-29" }))
    .status,
  416,
);
assert.equal((await request("/%ZZ")).status, 400);
assert.equal((await request("/%2e%2e%2f.env")).status, 403);
assert.equal((await request("/.env")).status, 404);
assert.equal((await request("/", "POST")).status, 405);
console.log(
  "PASS: local audio streaming ranges, media headers, HEAD requests, malformed paths, traversal protection, and inaccessible .env.",
);
