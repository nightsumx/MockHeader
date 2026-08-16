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
  <meta name="theme-color" content="#ffffff">
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
    <div class="wrap">
      <a class="brand" href="/" aria-label="MockHeader home"><img src="/icon.svg" alt="">MockHeader</a>
      <nav aria-label="Main navigation">
        <a ${active === 'docs' ? 'aria-current="page"' : ''} href="/docs/">Docs</a>
        <a ${active === 'privacy' ? 'aria-current="page"' : ''} href="/privacy/">Privacy</a>
        <a href="${gh}">GitHub</a>
        <a class="btn btn-sm" href="/docs/">Install — it's free</a>
      </nav>
    </div>
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
  title: 'MockHeader — Modify HTTP headers',
  description: 'Free open-source browser extension for editing HTTP request and response headers. No sign-up. No telemetry.',
  body: `
    <div class="hero-wrap">
      <section class="hero">
        <div class="hero-logo"><img src="/icon.svg" alt=""></div>
        <h1>Modify HTTP request and response headers</h1>
        <p class="lede">MockHeader is a free, open-source extension for editing HTTP request and response headers. No sign-up. Install it, change a header, and test without touching your app code.</p>
        <div class="hero-actions"><a class="btn btn-light" href="/docs/">Install — it's free</a></div>
        <p class="note">Open source. Rules stay on this device.</p>
        <img class="hero-shot" src="/product.png" alt="MockHeader popup">
      </section>
    </div>

    <section class="section">
      <div class="wash">
        <h2>How it works</h2>
        <ol class="steps">
          <li><i class="ico">1</i><strong>Install the extension</strong><span>Load MockHeader unpacked from GitHub. Free. No account.</span></li>
          <li><i class="ico">2</i><strong>Add or modify headers</strong><span>Open the popup and set request headers, response headers, cookies, and redirects.</span></li>
          <li><i class="ico">3</i><strong>Toggle and debug</strong><span>Turn rules on or off. URL, tab, and resource filters keep changes limited to what you want.</span></li>
        </ol>
      </div>
    </section>

    <section class="section">
      <h2>Features</h2>
      <div class="features">
        <article class="feat">
          <div class="feat-copy">
            <h3>Edit request and response headers</h3>
            <p>Set, append, or remove a header from the popup. Authorization, feature flags, or X-Forwarded-For — without changing app code.</p>
          </div>
          <div class="feat-media">
            <div class="demo">
              <div class="demo-bar">Default</div>
              <div class="demo-row"><b>Request headers</b></div>
              <div class="demo-row"><b class="typed">Authorization</b><span class="val">Bearer test<span class="caret"></span></span></div>
            </div>
          </div>
        </article>
        <article class="feat reverse">
          <div class="feat-copy">
            <h3>Toggle rules with one click</h3>
            <p>Enable or disable modifications while you test. Same page, feature on in one pass and off in the next.</p>
          </div>
          <div class="feat-media">
            <div class="demo">
              <div class="demo-bar">Default</div>
              <div class="demo-row"><b>X-MockHeader-Test</b><i class="tog"></i></div>
              <div class="demo-row"><b>X-Frame-Options</b><i class="tog on"></i></div>
            </div>
          </div>
        </article>
        <article class="feat">
          <div class="feat-copy">
            <h3>Filter by URL, tab, or resource</h3>
            <p>Apply rules only on matching URLs, tabs, windows, or resource types so tokens do not leak to other sites.</p>
          </div>
          <div class="feat-media">
            <div class="demo">
              <div class="demo-bar">Default</div>
              <div class="demo-row"><b>Include</b><span class="chip">example.com</span></div>
              <div class="demo-row"><span class="val">Page · Host · Domain</span></div>
            </div>
          </div>
        </article>
        <article class="feat reverse">
          <div class="feat-copy">
            <h3>Profiles and redirects</h3>
            <p>Keep separate profiles for projects. Wildcard or regex redirects. Export and import when you need to share a setup.</p>
          </div>
          <div class="feat-media">
            <div class="demo">
              <div class="demo-bar">Profile 2</div>
              <div class="demo-row"><b>from</b><span class="val">*://httpbin.org/get</span></div>
              <div class="demo-row"><b>to</b><span class="val">https://example.com/</span></div>
            </div>
          </div>
        </article>
      </div>
    </section>

    <section class="section">
      <div class="cta">
        <h2>Install MockHeader</h2>
        <p>Free. Open source. No sign-up.</p>
        <a class="btn btn-light" href="/docs/">Install — it's free</a>
      </div>
    </section>

    <section class="section">
      <h2>FAQs</h2>
      <div class="faq">
        <details open>
          <summary>How do I modify a request header?</summary>
          <p>Open the popup. Enter the header name (for example Authorization) and its value, then leave the rule enabled. Matching requests pick it up right away.</p>
        </details>
        <details>
          <summary>Can I limit modifications to certain URLs or tabs?</summary>
          <p>Yes. URL, tab, window, and resource type filters limit where rules apply, which helps keep tokens off sites you did not mean to touch.</p>
        </details>
        <details>
          <summary>Is MockHeader free? Which browsers are supported?</summary>
          <p>Yes. MockHeader is free and open source. There is no account. Chrome is supported today; load unpacked from GitHub until the store listing is live.</p>
        </details>
        <details>
          <summary>Does MockHeader collect or sell my data?</summary>
          <p>No. Profiles stay in chrome.storage on this device. See the <a href="/privacy/">Privacy Policy</a>.</p>
        </details>
      </div>
    </section>

    <section class="section" style="max-width:560px;margin:48px auto 0;padding-bottom:24px">
      <h2>Load unpacked</h2>
      ${code(`bun install && bun run build`, 'Terminal')}
      <p class="lede" style="color:var(--body);text-align:center">chrome://extensions → Developer mode → Load unpacked → <code>output/chrome-mv3</code>.</p>
    </section>`,
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
await cp(join(root, '../store/mockheader.png'), join(out, 'product.png'))
