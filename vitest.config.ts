import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    globals: true,
    include: ["tests/**/*.test.ts"],
    setupFiles: ["tests/setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      exclude: ["node_modules/", "tests/", "vitest.config.ts"],
    },
  },
})
