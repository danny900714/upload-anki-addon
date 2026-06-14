/**
 * AnkiWeb API client integration tests
 * @module-tag integration
 */

import { describe, expect, test } from "vitest";
import { HTTPStatusError, login, uploadAddon } from "./ankiweb.js";

describe("login", () => {
  test("should return ankiweb cookie", async () => {
    const ankiwebCookie = await login(process.env.ANKIWEB_USERNAME, process.env.ANKIWEB_PASSWORD);
    expect(ankiwebCookie).not.toBe("");
  });
});

describe("uploadAddonRequest", () => {
  test("upload Anki addon to AnkiWeb", async () => {
    const addonFileBase64 =
      "UEsDBAoAAAAAABWtzlwAAAAAAAAAAAAAAAALABwAX19pbml0X18ucHlVVAkAA1mvLmpZry5qdXgLAAEE9QEAAAQUAAAAUEsBAh4DCgAAAAAAFa3OXAAAAAAAAAAAAAAAAAsAGAAAAAAAAAAAAKSBAAAAAF9faW5pdF9fLnB5VVQFAANZry5qdXgLAAEE9QEAAAQUAAAAUEsFBgAAAAABAAEAUQAAAEUAAAAAAA==";

    try {
      await uploadAddon(
        process.env.ANKIWEB_COOKIE,
        {
          addonId: process.env.ANKIWEB_ADDON_ID
            ? parseInt(process.env.ANKIWEB_ADDON_ID, 10)
            : undefined,
          title: "Integration test for ankiweb client of @danny900714/upload-anki-addon",
          tags: "integration test tag",
          supportUrl: "https://github.com/danny900714/upload-anki-addon",
          description:
            "This is the test addon uploaded during integration test for ankiweb client.",
          branches: [{ minVersion: 1, maxVersion: 250904 }],
        },
        {
          zipData: Buffer.from(addonFileBase64, "base64"),
          branchIndex: 0,
        },
      );
    } catch (error) {
      if (error instanceof HTTPStatusError) {
        console.error(error.response);
        console.error(await error.response.text());
      } else {
        console.error(error);
      }
      throw error;
    }
  });
});
