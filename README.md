# MockHeader

[![CI](https://github.com/nightsumx/MockHeader/actions/workflows/ci.yml/badge.svg)](https://github.com/nightsumx/MockHeader/actions/workflows/ci.yml)

**Modify HTTP request and response headers.**

Open source. MIT. No accounts. No telemetry. Rules stay in `chrome.storage` on your machine.

Site: [mockheader.com](https://mockheader.com)

## Install

Chrome Web Store listing is in progress. Until then:

```sh
git clone https://github.com/nightsumx/MockHeader.git
cd MockHeader
bun install
bun run build
```

Chrome → `chrome://extensions` → Developer mode → Load unpacked → `output/chrome-mv3`.

## What it does

| | |
|---|---|
| Request / response | Set, append, or remove a header |
| Profiles | Switch sets of rules |
| Filters | URL, tab, window, resource type, time |
| Redirects | Wildcard or regex |
| Share | Export JSON / copy a share string |

Chrome applies the compiled rules through `declarativeNetRequest`. The extension does not proxy traffic and does not talk to a server.

## Develop

```sh
bun install
bun run dev
bun run test
```

`bun run zip` builds the store package.

## Privacy

No data leaves the browser. [Privacy policy](https://mockheader.com/privacy/).

## License

MIT
