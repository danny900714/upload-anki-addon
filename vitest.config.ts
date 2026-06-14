import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    restoreMocks: true,
    unstubEnvs: true,
    tags: [
      {
        name: "integration",
        description: "Integration test",
      },
    ],
  },
});
