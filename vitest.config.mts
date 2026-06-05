import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    environment: 'jsdom',
    include: ['__tests__/**/*.test.{ts,tsx}'],
    setupFiles: ['./__tests__/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['lib/**', 'hooks/**'],
      exclude: ['lib/sample-content.ts', '**/*.d.ts'],
      thresholds: {
        statements: 85,
        branches: 78,
        functions: 85,
        lines: 88,
      },
    },
  },
})
