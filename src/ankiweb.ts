import {
  AddonFile,
  AddonInfo,
  UploadAddonRequestSchema,
  UploadAddonResponseSchema,
} from "./proto/ankiweb_pb.js";
import { create, fromBinary, MessageInitShape, toBinary } from "@bufbuild/protobuf";
import { GenMessage } from "@bufbuild/protobuf/codegenv2";
import { HeaderGenerator } from "header-generator";

const headerGenerator = new HeaderGenerator();

export class AnkiwebError extends Error {
  constructor(public readonly response: Response) {
    super("Failed to upload addon to AnkiWeb");
  }
}

export async function uploadAddon(
  cookie: string,
  info: MessageInitShape<GenMessage<AddonInfo>>,
  file?: MessageInitShape<GenMessage<AddonFile>>,
) {
  const refererQuery = info.addonId ? `?id=${info.addonId}` : "";
  const headers = {
    ...headerGenerator.getHeaders(),
    accept: "*/*",
    "content-type": "application/octet-stream",
    cookie: `has_auth=1; ankiweb=${cookie}`,
    referer: `https://ankiweb.net/shared/upload${refererQuery}`,
  };

  const uploadAddonRequest = create(UploadAddonRequestSchema, {
    info: info,
    file: file,
  });
  const body = toBinary(UploadAddonRequestSchema, uploadAddonRequest);

  const response = await fetch("https://ankiweb.net/svc/shared/upload-addon", {
    method: "POST",
    headers,
    body,
  });
  if (!response.ok) {
    throw new AnkiwebError(response);
  }

  const uploadAddonResponse = fromBinary(UploadAddonResponseSchema, await response.bytes());
  return uploadAddonResponse.addonId;
}
