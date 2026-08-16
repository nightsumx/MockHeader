import { defineConfig } from 'vitest/config'
import { WxtVitest } from 'wxt/testing/vitest-plugin'

export default defineConfig({
  plugins: [WxtVitest()],
  test: {
    include: ['__tests__/**/*.test.ts'],
    environment: 'jsdom',
  },
})
