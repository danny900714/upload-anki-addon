import { describe, test } from "vitest";
import { uploadAddon } from "./ankiweb.js";

describe("uploadAddonRequest", () => {
  test("upload Anki addon to AnkiWeb", async () => {
    await uploadAddon(process.env.ANKIWEB_COOKIE, {
      addonId: 799866239,
      title: "Test new title for @danny900714/upload-anki-addon",
      tags: "test new tag",
      supportUrl: "https://github.com/danny900714/upload-anki-addon",
      description: "New description for `@danny900714/upload-anki-addon`!",
      branches: [
        { minVersion: 1, maxVersion: 66 },
        { minVersion: 231000, maxVersion: 250904 },
      ],
    });
  });
});
