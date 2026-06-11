import * as fs from "node:fs/promises";
import { getInput, getMultilineInput, setFailed, setOutput, toPlatformPath } from "@actions/core";
import { MessageInitShape } from "@bufbuild/protobuf";
import { GenMessage } from "@bufbuild/protobuf/codegenv2";
import { AddonBranch } from "./proto/ankiweb_pb";
import { login, uploadAddon } from "./ankiweb";

function parseBranchNotation(branch: string): MessageInitShape<GenMessage<AddonBranch>> {
  const branchVersions: [number, number] = [0, 0];

  const versions = branch.split("-");
  if (versions.length !== 2) {
    throw new Error(`The branch must have 2 versions separated by dash. branch: ${branch}`);
  }

  for (let i = 0; i < versions.length; i++) {
    let version = versions[i];

    let includeFutureVersions = true;
    if (i == version.length - 1 && !version.endsWith("+")) {
      includeFutureVersions = false;
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
  return toPlatformPath(filePath);
}

export default async function main() {
  // Get inputs
  const username = getInput("username", { required: true });
  const password = getInput("password", { required: true });
  const addonIdInput = getInput("addon-id");
  const title = getInput("title", { required: true });
  const tags = getInput("tags");
  const supportPage = getInput("support-page");
  const branchesInput = getMultilineInput("branches", { required: true });
  const addonFilesInput = getMultilineInput("addon-files", { required: true });
  const description = getInput("description", { required: true });

  try {
    // Convert addonId
    let addonId = addonIdInput === "" ? undefined : parseInt(addonIdInput, 10);
    if (addonId && Number.isNaN(addonId)) {
      setFailed(`addon-id must be a valid integer. addon-id: ${addonIdInput}`);
      return;
    }

    // Convert and validate branches
    const branches = branchesInput.map(parseBranchNotation);
    if (branches.length === 0) {
      setFailed("At least one branch must be specified in branches.");
      return;
    }

    const addonFilesPath = addonFilesInput.map(parseAddonFile);
    if (addonFilesPath.length === 0) {
      setFailed("At least one add-on file path must be specified in addon-files.");
      return;
    }
    if (addonId === undefined && addonFilesPath.includes(null)) {
      setFailed("If addon-id is not specified, all paths of addon-files must be specified.");
      return;
    }
    if (branches.length !== addonFilesPath.length) {
      setFailed("The number of path of addon-files should be the same as the number of branches.");
      return;
    }

    // Login to get ankiweb cookie
    const ankiwebCookie = await login(username, password);

    // Upload the addon to ankiweb
    for (let i = 0; i < addonFilesPath.length; i++) {
      const addonFilePath = addonFilesPath[i];

      // Create addonFile if file path is not null
      let addonFile;
      if (addonFilePath !== null) {
        const buffer = await fs.readFile(addonFilePath);
        addonFile = {
          zipData: buffer,
          branchIndex: i,
        };
      }

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
    }

    // Set output
    setOutput("addon-id", addonId);
  } catch (error) {
    setFailed(error as Error);
    return;
  }
}
