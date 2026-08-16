import { cp, mkdir, rm, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(fileURLToPath(import.meta.url))
const out = join(root, 'dist')
const site = 'https://mockheader.com'
const gh = 'https://github.com/nightsumx/MockHeader'

const escapeHtml = value => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')

const code = (source, label = '') => `
  <figure class="code-block">
    ${label === '' ? '' : `<figcaption>${escapeHtml(label)}</figcaption>`}
    <pre><code>${escapeHtml(source.trim())}</code></pre>
  </figure>`

const docsNav = active => `
  <aside class="docs-nav" aria-label="Documentation">
    <strong>Documentation</strong>
    <a ${active === 'docs' ? 'aria-current="page"' : ''} href="/docs/">Start</a>
    <a ${active === 'privacy' ? 'aria-current="page"' : ''} href="/privacy/">Privacy</a>
  </aside>`

const docs = (active, body) => `
  <div class="docs-shell">
    ${docsNav(active)}
    <article class="prose">${body}</article>
  </div>`

const page = ({ title, description, path = '/', active = '', body }) => `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="${description}">
  <meta name="robots" content="index, follow">
  <meta name="theme-color" content="#f3f5f8">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="MockHeader">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${description}">
  <meta property="og:url" content="${site}${path}">
  <meta property="og:image" content="${site}/icon.svg">
  <meta name="twitter:card" content="summary">
  <meta name="twitter:title" content="${title}">
  <meta name="twitter:description" content="${description}">
  <title>${title}</title>
  <link rel="canonical" href="${site}${path}">
  <link rel="icon" href="/icon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="/style.css">
</head>
<body>
  <header class="site-header">
    <a class="brand" href="/" aria-label="MockHeader home"><img src="/icon.svg" alt="">MockHeader</a>
    <nav aria-label="Main navigation">
      <a ${active === 'docs' ? 'aria-current="page"' : ''} href="/docs/">Docs</a>
      <a ${active === 'privacy' ? 'aria-current="page"' : ''} href="/privacy/">Privacy</a>
      <a href="${gh}">GitHub</a>
    </nav>
  </header>
  <main>${body}</main>
  <footer>
    <span>MockHeader · MIT · no telemetry</span>
    <a href="${gh}">Source on GitHub</a>
  </footer>
  <script src="/site.js" defer></script>
</body>
</html>`

const home = page({
  title: 'MockHeader — mock HTTP headers locally',
  description: 'Open-source Chrome extension that mocks request and response headers on your machine. No account. No telemetry.',
  body: `
    <div class="home">
    <section class="hero">
      <div class="hero-copy">
        <p class="eyebrow">Open source · MIT</p>
        <h1>Mock headers on the request. Keep the app untouched.</h1>
        <p class="lede">Set, append, or drop request and response headers in Chrome. Profiles, URL filters, and redirects compile to <code>declarativeNetRequest</code>. Nothing is uploaded.</p>
        <div class="hero-actions">
          <a class="btn" href="/docs/">Install from source</a>
          <a class="text-link" href="${gh}">Source</a>
        </div>
      </div>
      <div class="preview" aria-hidden="true">
        <div class="preview-bar"><i class="preview-dot">1</i> Profile 1</div>
        <div class="preview-body">
          <div class="preview-row"><i class="preview-check">✓</i><b class="preview-title">Request</b><span></span></div>
          <div class="preview-row"><i class="preview-check">✓</i><span class="preview-name">X-MockHeader-Test</span><span class="preview-val">1</span></div>
          <div class="preview-row"><i class="preview-check">✓</i><b class="preview-title">Response</b><span></span></div>
          <div class="preview-row"><i class="preview-check">✓</i><span class="preview-name">X-Frame-Options</span><span class="preview-val">remove</span></div>
        </div>
      </div>
    </section>

    <section class="band">
      <ul class="split">
        <li><strong>Request / response</strong>Set, append, remove.</li>
        <li><strong>Scope</strong>URL, tab, window, type, or time.</li>
        <li><strong>Redirect</strong>Wildcard or regex.</li>
        <li><strong>Stay local</strong>chrome.storage only.</li>
      </ul>
    </section>

    <section class="band slim">
      <h2>Load unpacked</h2>
      ${code(`bun install && bun run build`, 'Terminal')}
      <p class="lede">chrome://extensions → Developer mode → Load unpacked → <code>output/chrome-mv3</code>.</p>
    </section>
    </div>`,
})

const start = page({
  title: 'Docs — MockHeader',
  description: 'Install MockHeader and add request headers, response headers, filters, and redirects.',
  path: '/docs/',
  active: 'docs',
  body: docs('docs', `
    <p class="eyebrow">Documentation</p>
    <h1>Start</h1>
    <p class="intro">MockHeader compiles your profile into Chrome <code>declarativeNetRequest</code> rules. It does not proxy traffic.</p>
    <h2>Install from source</h2>
    ${code(`git clone ${gh}.git
cd MockHeader
bun install
bun run build`, 'Terminal')}
    <p>Open <code>chrome://extensions</code>, turn on Developer mode, Load unpacked, pick <code>output/chrome-mv3</code>.</p>
    <h2>Add a header</h2>
    <p>Open the popup. Request headers are the first block. Type a name and a value. Chrome applies <code>set</code> unless you switch the row to append or remove.</p>
    <p>Use a custom name such as <code>X-MockHeader-Test</code> when you want to see it on <a href="https://httpbin.org/headers">httpbin.org/headers</a>. Chrome silently drops some names (<code>Host</code>, <code>Connection</code>).</p>
    <h2>Limit where it runs</h2>
    <p>Without a filter, a live profile matches every request. Add a URL filter (this page / this host / this domain) or a tab / window / resource / time filter.</p>
    <h2>Redirect</h2>
    <p>From is a Chrome URL filter (<code>*://httpbin.org/get</code>). To is the destination. Regex uses Chrome regex substitution.</p>
    <h2>Share</h2>
    <p>Export downloads JSON and copies a share string. Import accepts that file or string.</p>
    <h2>Develop</h2>
    ${code(`bun run dev
bun test
bun run zip`, 'Terminal')}
  `),
})

const privacy = page({
  title: 'Privacy — MockHeader',
  description: 'MockHeader does not collect, transmit, or sell data.',
  path: '/privacy/',
  active: 'privacy',
  body: docs('privacy', `
    <p class="eyebrow">Privacy</p>
    <h1>Privacy policy</h1>
    <p class="intro">MockHeader does not collect personal data. There is no account, no analytics, and no backend.</p>
    <h2>What is stored</h2>
    <p>Profiles, theme, and language live in <code>chrome.storage.local</code> on this device. Export writes a file you chose. Copy uses the clipboard only when you click Export.</p>
    <h2>What the permissions are for</h2>
    <table><thead><tr><th>Permission</th><th>Why</th></tr></thead><tbody>
      <tr><td><code>storage</code></td><td>Save profiles on this device</td></tr>
      <tr><td><code>declarativeNetRequest</code></td><td>Apply header and redirect rules</td></tr>
      <tr><td><code>&lt;all_urls&gt;</code></td><td>Match requests you choose to modify</td></tr>
      <tr><td><code>tabs</code></td><td>Current-tab / window filters and the page URL chips</td></tr>
      <tr><td><code>alarms</code></td><td>Re-check time filters once a minute</td></tr>
      <tr><td><code>clipboardWrite</code></td><td>Copy the export string</td></tr>
    </tbody></table>
    <p>The extension never uploads browsing history, headers, or profile contents.</p>
    <h2>Source</h2>
    <p>The store package is built from <a href="${gh}">github.com/nightsumx/MockHeader</a>. MIT License.</p>
    <h2>Contact</h2>
    <p>Open an issue on the GitHub repository.</p>
  `),
})

await rm(out, { recursive: true, force: true })
await mkdir(join(out, 'docs'), { recursive: true })
await mkdir(join(out, 'privacy'), { recursive: true })
await writeFile(join(out, 'index.html'), home)
await writeFile(join(out, 'docs/index.html'), start)
await writeFile(join(out, 'privacy/index.html'), privacy)
await writeFile(join(out, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${site}/sitemap.xml\n`)
await writeFile(join(out, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${site}/</loc></url>
  <url><loc>${site}/docs/</loc></url>
  <url><loc>${site}/privacy/</loc></url>
</urlset>
`)
await writeFile(join(out, '_headers'), `/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()
  Content-Security-Policy: default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'
`)
await cp(join(root, 'style.css'), join(out, 'style.css'))
await cp(join(root, 'site.js'), join(out, 'site.js'))
await cp(join(root, 'icon.svg'), join(out, 'icon.svg'))
