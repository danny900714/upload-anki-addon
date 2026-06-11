import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    env: {
      ANKIWEB_COOKIE: process.env.ANKIWEB_COOKIE,
    },
  },
});
