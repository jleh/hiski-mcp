import { defineConfig } from "vitest/config";

/** Tests against the real Hiski: slow, networked and one at a time to spare the service. */
export default defineConfig({
  test: {
    include: ["test/live/**/*.test.ts"],
    testTimeout: 120_000,
    fileParallelism: false,
  },
});
