import {cp, readFile, rm, writeFile} from 'node:fs/promises';

const source = new URL('../public/', import.meta.url);
const output = new URL('../dist/', import.meta.url);
const configuredURL = process.env.SITE_URL || process.env.CF_PAGES_URL;
let siteURL;
if (configuredURL) {
  const url = new URL(configuredURL);
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) {
    throw new Error('SITE_URL must be an HTTP(S) website URL without credentials.');
  }
  siteURL = url.origin;
}

await rm(output, {recursive: true, force: true});
await cp(source, output, {recursive: true});
if (siteURL) {
  const escape = value => value.replace(/[&<>"']/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]));
  let html = await readFile(new URL('index.html', output), 'utf8');
  html = html.replace('</head>', ` <link rel="canonical" href="${escape(siteURL)}/">\n <meta property="og:url" content="${escape(siteURL)}/">\n</head>`);
  html = html.replace('content="/assets/social.png"', `content="${escape(siteURL)}/assets/social.png"`);
  html = html.replace(/(<script type="application\/ld\+json">)(.*?)(<\/script>)/, (_, open, data, close) => {
    return open + JSON.stringify({...JSON.parse(data), url: `${siteURL}/`}).replace(/</g, '\\u003c') + close;
  });
  await writeFile(new URL('index.html', output), html);
  await writeFile(new URL('sitemap.xml', output), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${escape(siteURL)}/</loc></url></urlset>\n`);
  await writeFile(new URL('robots.txt', output), `User-agent: *\nAllow: /\nSitemap: ${siteURL}/sitemap.xml\n`);
}
console.log('Static site built in dist/.');
