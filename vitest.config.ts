import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      // Excluded from the floor: the CLI entrypoint (argv/stdin/fs edge) and the
      // network provider adapters (fetch). The pure core + classify + mapPool are covered.
      exclude: [
        'src/cli.ts',
        'src/providers/cloudflare.ts',
        'src/providers/typesafe.ts',
        'src/providers/http.ts',
        'src/providers/jev-provider.ts',
      ],
      thresholds: {
        lines: 90,
        statements: 90,
        functions: 90,
        branches: 80,
      },
    },
  },
});
