import config from '@yboyer/config/vite-plus'
import { defineConfig, mergeConfig } from 'vite-plus'

export default defineConfig(
  mergeConfig(config, {
    lint: {
      rules: { 'no-console': 'off' },
      overrides: [
        {
          files: ['index.client.tsx', 'client/**/*.ts'],
          env: { browser: true },
        },
        {
          files: ['index.server.ts', 'server/**/*.ts', '**/*.test.ts'],
          env: { node: true },
        },
      ],
    },
  })
)
