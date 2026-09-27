import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/**/*.test.ts"],
    // Live tests call the real Hiski; they run with `npm run test:live`.
    exclude: ["test/live/**", "node_modules/**"],
  },
});
