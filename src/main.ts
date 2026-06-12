import * as fs from "node:fs/promises";
import * as core from "@actions/core";
import { MessageInitShape } from "@bufbuild/protobuf";
import { GenMessage } from "@bufbuild/protobuf/codegenv2";
import { AddonBranch } from "./proto/ankiweb_pb";
import { HTTPStatusError, login, uploadAddon } from "./ankiweb";

function parseBranchNotation(branch: string): MessageInitShape<GenMessage<AddonBranch>> {
  const branchVersions: [number, number] = [0, 0];

  const versions = branch.split("-");
  if (versions.length !== 2) {
    throw new Error(`The branch must have 2 versions separated by dash. branch: ${branch}`);
  }

  for (let i = 0; i < versions.length; i++) {
    let version = versions[i];

    let includeFutureVersions = false;
    if (i == version.length - 1 && version.endsWith("+")) {
      includeFutureVersions = true;
      version.substring(0, version.length - 1);
    }

    if (version.startsWith("2.1.")) {
      // If the version is 2.1.x, the parsed version becomes x
      const versionNumber = parseInt(version.substring(4), 10);
      if (Number.isNaN(versionNumber)) {
        throw new Error(`Invalid version in branch. branch ${branch}`);
      }
      branchVersions[i] = versionNumber;
    } else {
      // Parse the branch as major.minor.patch, and convert it to a number like major * 10000 + minor * 100 + patch
      const versionNumberStrings = version.split(".");
      if (versionNumberStrings.length > 3) {
        throw new Error(`Invalid version in branch. branch ${branch}`);
      }

      let multiplier = 10000;
      for (const versionNumberString of versionNumberStrings) {
        const versionNumber = parseInt(versionNumberString, 10);
        if (Number.isNaN(versionNumber) || versionNumber >= 100) {
          throw new Error(`Invalid version in branch. branch ${branch}`);
        }

        branchVersions[i] += versionNumber * multiplier;
        multiplier /= 100;
      }
    }

    // If this is the max version without having +, negative the number.
    if (i == version.length - 1 && !includeFutureVersions) {
      branchVersions[i] = -branchVersions[i];
    }
  }

  return {
    minVersion: branchVersions[0],
    maxVersion: branchVersions[1],
  };
}

function parseAddonFile(filePath: string) {
  if (filePath === "-") return null;
  return core.toPlatformPath(filePath);
}

export default async function main() {
  // Get inputs
  const username = core.getInput("username", { required: true });
  const password = core.getInput("password", { required: true });
  const addonIdInput = core.getInput("addon-id");
  const title = core.getInput("title", { required: true });
  const tags = core.getInput("tags");
  const supportPage = core.getInput("support-page");
  const branchesInput = core.getMultilineInput("branches", { required: true });
  const addonFilesInput = core.getMultilineInput("addon-files", { required: true });
  const descriptionInput = core.getInput("description");
  const descriptionFileInput = core.getInput("description-file");

  try {
    // Convert addonId
    let addonId = addonIdInput === "" ? undefined : parseInt(addonIdInput, 10);
    if (addonId && Number.isNaN(addonId)) {
      core.setFailed(`addon-id must be a valid integer. addon-id: ${addonIdInput}`);
      return;
    }

    // Convert and validate branches
    const branches = branchesInput.map(parseBranchNotation);
    if (branches.length === 0) {
      core.setFailed("At least one branch must be specified in branches.");
      return;
    }

    // Convert and validate addon-files
    const addonFilesPath = addonFilesInput.map(parseAddonFile);
    if (addonFilesPath.length === 0) {
      core.setFailed("At least one add-on file path must be specified in addon-files.");
      return;
    }
    if (addonId === undefined && addonFilesPath.includes(null)) {
      core.setFailed("If addon-id is not specified, all paths of addon-files must be specified.");
      return;
    }
    if (branches.length !== addonFilesPath.length) {
      core.setFailed(
        "The number of path of addon-files should be the same as the number of branches.",
      );
      return;
    }

    // Get description
    let description = descriptionInput;
    if (description === "") {
      if (descriptionFileInput === "") {
        const message =
          "Both description and description-file are not specified. Either one of them should be set.";
        core.setFailed(message);
        return;
      }

      description = await fs.readFile(descriptionFileInput, "utf-8");
      if (description === "") {
        const message = "The content of description-file must not be empty.";
        core.setFailed(message);
        return;
      }
    } else if (descriptionFileInput !== "") {
      core.warning(
        "Both description and description-file are specified. description will be used.",
      );
    }

    // Login to get ankiweb cookie
    const ankiwebCookie = await login(username, password);
    core.info("Successfully login to AnkiWeb.");

    if (addonFilesPath.every((path) => path === null)) {
      // If all the path is null (meaning no file is uploaded), just upload the addon info once.
      core.info("No path specified in addon-files. Only update addon info ...");

      addonId = await uploadAddon(ankiwebCookie, {
        addonId,
        title,
        tags,
        supportUrl: supportPage,
        description,
        branches,
      });

      core.info("Successfully updated addon info.");
    } else {
      // Upload all addon files specified in addon-files
      for (let i = 0; i < addonFilesPath.length; i++) {
        const addonFilePath = addonFilesPath[i];
        if (addonFilePath !== null) {
          const buffer = await fs.readFile(addonFilePath);
          const addonFile = {
            zipData: buffer,
            branchIndex: i,
          };

          core.info(
            `Find addon file in ${addonFilePath}. Uploading it to ${branchesInput[0]} branch ...`,
          );

          addonId = await uploadAddon(
            ankiwebCookie,
            {
              addonId,
              title,
              tags,
              supportUrl: supportPage,
              description,
              branches,
            },
            addonFile,
          );

          core.info(`Successfully uploaded addon file: ${addonFilePath}.`);
        }
      }
    }

    // Set output
    core.setOutput("addon-id", addonId);
  } catch (error) {
    if (error instanceof HTTPStatusError) error.message += `Body: ${await error.response.text()}`;
    core.setFailed(error as Error);
  }
}
