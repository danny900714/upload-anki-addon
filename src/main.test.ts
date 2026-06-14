import { afterAll, afterEach, beforeAll, describe, expect, test, vi } from "vitest";
import { fs, vol } from "memfs";
import * as core from "@actions/core";
import * as ankiweb from "./ankiweb";
import main from "./main";

// Mock filesystem
vi.mock("node:fs");
vi.mock("node:fs/promises");
vi.mock("@actions/core", { spy: true });

const defaultAddonId = 19890604;

type TestInputs = {
  username: string;
  password: string;
  addonId?: number;
  title: string;
  tags?: string;
  supportPage?: string;
  branches: string;
  addonFiles: string;
  description?: string;
  descriptionFile?: string;
};

const baseInput = {
  username: "username",
  password: "password",
  title: "Test title",
  tags: "test tags",
  supportPage: "https://github.com/danny900714/upload-anki-addon",
};
const baseAddonInfo = {
  title: "Test title",
  tags: "test tags",
  supportUrl: "https://github.com/danny900714/upload-anki-addon",
};
const varyingParameters = [
  {
    inputs: {
      branches: "2.1.1-2.1.66+",
      addonFiles: "test1.ankiaddon",
      description: "Test description",
    },
    addonInfo: {
      description: "Test description",
      branches: [{ minVersion: 1, maxVersion: 66 }],
    },
    addonFiles: [{ zipData: Buffer.from("test1"), branchIndex: 0 }],
  },
  {
    inputs: {
      branches: "2.1.1-2.1.2",
      addonFiles: "test1.ankiaddon",
      description: "Test description",
    },
    addonInfo: {
      description: "Test description",
      branches: [{ minVersion: 1, maxVersion: -2 }],
    },
    addonFiles: [{ zipData: Buffer.from("test1"), branchIndex: 0 }],
  },
  {
    inputs: {
      branches: "2.1.11-24.06",
      addonFiles: "test1.ankiaddon",
      description: "Test description",
    },
    addonInfo: {
      description: "Test description",
      branches: [{ minVersion: 11, maxVersion: -240600 }],
    },
    addonFiles: [{ zipData: Buffer.from("test1"), branchIndex: 0 }],
  },
  {
    inputs: {
      branches: "2.1.57-24.11+",
      addonFiles: "test1.ankiaddon",
      description: "Test description",
    },
    addonInfo: {
      description: "Test description",
      branches: [{ minVersion: 57, maxVersion: 241100 }],
    },
    addonFiles: [{ zipData: Buffer.from("test1"), branchIndex: 0 }],
  },
  {
    inputs: {
      branches: "23.10.1-25.09",
      addonFiles: "test1.ankiaddon",
      description: "Test description",
    },
    addonInfo: {
      description: "Test description",
      branches: [{ minVersion: 231001, maxVersion: -250900 }],
    },
    addonFiles: [{ zipData: Buffer.from("test1"), branchIndex: 0 }],
  },
  {
    inputs: {
      branches: "23.10-25.09.4+",
      addonFiles: "test1.ankiaddon",
      description: "Test description",
    },
    addonInfo: {
      description: "Test description",
      branches: [{ minVersion: 231000, maxVersion: 250904 }],
    },
    addonFiles: [{ zipData: Buffer.from("test1"), branchIndex: 0 }],
  },
  // New add-on, multiple branches
  {
    inputs: {
      branches: "2.1.1-23.12.1\n24.04-25.09.4+",
      addonFiles: "test1.ankiaddon\ntest2.ankiaddon",
      description: "Test description",
    },
    addonInfo: {
      description: "Test description",
      branches: [
        { minVersion: 1, maxVersion: -231201 },
        { minVersion: 240400, maxVersion: 250904 },
      ],
    },
    addonFiles: [
      { zipData: Buffer.from("test1"), branchIndex: 0 },
      { zipData: Buffer.from("test2"), branchIndex: 1 },
    ],
  },
  // Existing add-on, multiple branches, all have updated files
  {
    inputs: {
      addonId: 21754893,
      branches: "23.10-23.12.1\n24.04-25.09",
      addonFiles: "test1.ankiaddon\ntest2.ankiaddon",
      description: "Test description",
    },
    addonInfo: {
      addonId: 21754893,
      description: "Test description",
      branches: [
        { minVersion: 231000, maxVersion: -231201 },
        { minVersion: 240400, maxVersion: -250900 },
      ],
    },
    addonFiles: [
      { zipData: Buffer.from("test1"), branchIndex: 0 },
      { zipData: Buffer.from("test2"), branchIndex: 1 },
    ],
  },
  // Existing add-on, multiple branches, only the first branch has an updated file
  {
    inputs: {
      addonId: 21754893,
      branches: "23.10-23.12.1\n24.06.2-25.09+",
      addonFiles: "test1.ankiaddon\n-",
      description: "Test description",
    },
    addonInfo: {
      addonId: 21754893,
      description: "Test description",
      branches: [
        { minVersion: 231000, maxVersion: -231201 },
        { minVersion: 240602, maxVersion: 250900 },
      ],
    },
    addonFiles: [{ zipData: Buffer.from("test1"), branchIndex: 0 }],
  },
  // Existing add-on, multiple branches, only the second branch has an updated file
  {
    inputs: {
      addonId: 21754893,
      branches: "2.1.1-23.12.1\n24.06.2-25.09.04",
      addonFiles: "-\ntest2.ankiaddon",
      description: "Test description",
    },
    addonInfo: {
      addonId: 21754893,
      description: "Test description",
      branches: [
        { minVersion: 1, maxVersion: -231201 },
        { minVersion: 240602, maxVersion: -250904 },
      ],
    },
    addonFiles: [{ zipData: Buffer.from("test2"), branchIndex: 1 }],
  },
  // Existing add-on, only update info
  {
    inputs: {
      addonId: 21754893,
      branches: "2.1.1-2.1.66\n23.10-25.09.04+",
      addonFiles: "-\n-",
      description: "Test description",
    },
    addonInfo: {
      addonId: 21754893,
      description: "Test description",
      branches: [
        { minVersion: 1, maxVersion: -66 },
        { minVersion: 231000, maxVersion: 250904 },
      ],
    },
    addonFiles: [],
  },
  // Description file
  {
    inputs: {
      addonId: 21754893,
      branches: "2.1.1-2.1.58\n2.1.59-25.09",
      addonFiles: "test1.ankiaddon\ntest2.ankiaddon",
      descriptionFile: "description.md",
    },
    addonInfo: {
      addonId: 21754893,
      description: "Test description file",
      branches: [
        { minVersion: 1, maxVersion: -58 },
        { minVersion: 59, maxVersion: -250900 },
      ],
    },
    addonFiles: [
      { zipData: Buffer.from("test1"), branchIndex: 0 },
      { zipData: Buffer.from("test2"), branchIndex: 1 },
    ],
  },
  // If description and descriptionFile are both provided, description should be used
  {
    inputs: {
      addonId: 21754893,
      branches: "2.1.66-24.06\n24.06.1-25.09.04+",
      addonFiles: "test1.ankiaddon\ntest2.ankiaddon",
      description: "Test description",
      descriptionFile: "description.md",
    },
    addonInfo: {
      addonId: 21754893,
      description: "Test description",
      branches: [
        { minVersion: 66, maxVersion: -240600 },
        { minVersion: 240601, maxVersion: 250904 },
      ],
    },
    addonFiles: [
      { zipData: Buffer.from("test1"), branchIndex: 0 },
      { zipData: Buffer.from("test2"), branchIndex: 1 },
    ],
  },
];
const testCases = varyingParameters.map((param) => ({
  ...param,
  inputs: {
    ...baseInput,
    ...param.inputs,
  },
  addonInfo: {
    ...baseAddonInfo,
    ...param.addonInfo,
  },
}));
const varyingErrorParameters = [
  // The number of branches is different from the number of addonFiles.
  {
    inputs: {
      addonId: 21754893,
      branches: "2.1.1-2.1.58\n2.1.59-25.09",
      addonFiles: "test1.ankiaddon",
      description: "Test description",
    },
    error: "The number of path of addon-files should be the same as the number of branches.",
  },
  // If addonId is not specified, all paths of addon-files must be specified.
  {
    inputs: {
      branches: "2.1.1-2.1.66\n23.10-25.09.04+",
      addonFiles: "test1.ankiaddon\n-",
      description: "Test description",
    },
    error: "If addon-id is not specified, all paths of addon-files must be specified.",
  },
  // Either description or description file should be specified
  {
    inputs: {
      branches: "2.1.1-25.09.4+",
      addonFiles: "test1.ankiaddon",
    },
    error:
      "Both description and description-file are not specified. Either one of them should be set.",
  },
];
const errorTestCases = varyingErrorParameters.map((param) => ({
  inputs: {
    ...baseInput,
    ...param.inputs,
  },
  error: param.error,
}));

beforeAll(async () => {
  await fs.promises.mkdir(process.cwd(), { recursive: true });

  // Create test addon files
  const promises: Promise<void>[] = [];
  for (let i = 1; i <= 5; i++) {
    promises.push(fs.promises.writeFile(`test${i}.ankiaddon`, `test${i}`));
  }

  // Create test description files
  promises.push(fs.promises.writeFile(`description.md`, `Test description file`));

  await Promise.all(promises);
});

afterEach(() => {
  vi.resetAllMocks();
});

afterAll(() => {
  // Reset the state of in-memory fs
  vol.reset();
});

describe("main", () => {
  function setupTest(inputs: TestInputs) {
    // Mock login and uploadAddon function
    const login = vi.spyOn(ankiweb, "login").mockResolvedValue("vitest-cookie");
    const uploadAddon = vi
      .spyOn(ankiweb, "uploadAddon")
      .mockImplementation(async (_cookie, info, _file) => {
        if (info.addonId) return info.addonId;
        return defaultAddonId;
      });

    // Mock inputs environment variables
    vi.stubEnv("INPUT_USERNAME", inputs.username);
    vi.stubEnv("INPUT_PASSWORD", inputs.password);
    if (inputs.addonId) vi.stubEnv("INPUT_ADDON-ID", `${inputs.addonId}`);
    vi.stubEnv("INPUT_TITLE", inputs.title);
    if (inputs.tags) vi.stubEnv("INPUT_TAGS", inputs.tags);
    if (inputs.supportPage) vi.stubEnv("INPUT_SUPPORT-PAGE", inputs.supportPage);
    vi.stubEnv("INPUT_BRANCHES", inputs.branches);
    vi.stubEnv("INPUT_ADDON-FILES", inputs.addonFiles);
    if (inputs.description) vi.stubEnv("INPUT_DESCRIPTION", inputs.description);
    if (inputs.descriptionFile) vi.stubEnv("INPUT_DESCRIPTION-FILE", inputs.descriptionFile);

    return { login, uploadAddon };
  }

  test.for(testCases)(
    "should parse $inputs.branches",
    async ({ inputs, addonInfo, addonFiles }) => {
      // Mock login, uploadAddon, inputs environment variable, and @action/core.setOutput
      const { login, uploadAddon } = setupTest(inputs);
      const setOutput = vi.mocked(core.setOutput);

      await main();

      expect(login).toHaveBeenCalledExactlyOnceWith(inputs.username, inputs.password);

      // Assert uploadAddon called
      if (addonFiles.length === 0) {
        expect(uploadAddon).toHaveBeenCalledExactlyOnceWith("vitest-cookie", addonInfo);
      } else {
        for (let i = 0; i < addonFiles.length; i++) {
          if (i !== 0 && !addonInfo.addonId) {
            addonInfo.addonId = defaultAddonId;
          }
          expect(uploadAddon).toHaveBeenNthCalledWith(
            i + 1,
            "vitest-cookie",
            addonInfo,
            addonFiles[i],
          );
        }
      }

      // Assert outputs
      expect(setOutput).toHaveBeenCalledExactlyOnceWith(
        "addon-id",
        addonInfo.addonId ?? defaultAddonId,
      );
    },
  );

  test.for(errorTestCases)("should fail with $error", async ({ inputs, error }) => {
    setupTest(inputs);
    const setFailed = vi.mocked(core.setFailed);

    await main();

    expect(setFailed).toHaveBeenCalledExactlyOnceWith(error);
  });
});
