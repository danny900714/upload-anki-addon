// oxlint-disable import/no-unassigned-import
import "vitest";

declare module "vitest" {
  interface TestTags {
    tags: "integration";
  }
}
