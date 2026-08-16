import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'wxt'

export default defineConfig({
  srcDir: 'src',
  outDir: 'output',
  manifest: {
    name: 'MockHeader',
    description: 'Modify HTTP request and response headers. Open source. No telemetry.',
    homepage_url: 'https://mockheader.org',
    permissions: ['storage', 'clipboardWrite', 'declarativeNetRequest', 'declarativeNetRequestWithHostAccess', 'tabs', 'alarms'],
    host_permissions: ['<all_urls>'],
    action: {
      default_title: 'MockHeader',
    },
    commands: {
      'toggle-pause': {
        suggested_key: { default: 'Alt+Shift+P' },
        description: 'Pause / resume',
      },
      'add-header': {
        suggested_key: { default: 'Alt+Shift+M' },
        description: 'Add a request header',
      },
    },
  },
  webExt: {
    disabled: true,
  },
  vite: () => ({
    server: {
      watch: {
        ignored: ['**/output/**', '**/.wxt/**'],
      },
    },
    plugins: [
      react(),
      tailwindcss(),
    ],
  }),
})
