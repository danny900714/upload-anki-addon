import {
  AddonFile,
  AddonInfo,
  LoginRequestSchema,
  LoginResponseSchema,
  LoginResponseStatus,
  UploadAddonRequestSchema,
  UploadAddonResponseSchema,
} from "./proto/ankiweb_pb";
import { create, fromBinary, MessageInitShape, toBinary } from "@bufbuild/protobuf";
import { GenMessage } from "@bufbuild/protobuf/codegenv2";
import { fetch, getSetCookies } from "undici";
import { HeaderGenerator } from "header-generator";

const headerGenerator = new HeaderGenerator();
const defaultHeaders = {
  ...headerGenerator.getHeaders(),
  accept: "*/*",
  "content-type": "application/octet-stream",
};

export class HTTPStatusError extends Error {
  constructor(public readonly response: Response) {
    super(`HTTP request failed with status ${response.status}.`);
    this.name = HTTPStatusError.name;
  }
}

export class LoginError extends Error {
  constructor(message: string) {
    super(message);
    this.name = LoginError.name;
  }
}

export async function login(username: string, password: string) {
  const headers = {
    ...defaultHeaders,
    referer: "https://ankiweb.net/account/login",
  };

  const loginRequest = create(LoginRequestSchema, { username, password });
  const body = toBinary(LoginRequestSchema, loginRequest);

  const response = await fetch("https://ankiweb.net/svc/account/login", {
    method: "POST",
    headers,
    body,
  });
  if (!response.ok) throw new HTTPStatusError(response);

  const loginResponse = fromBinary(LoginResponseSchema, await response.bytes());
  if (loginResponse.status !== LoginResponseStatus.AUTHENTICATED) {
    throw new LoginError(
      `Failed to login to AnkiWeb. Status: ${LoginResponseStatus[loginResponse.status]}`,
    );
  }

  const cookies = getSetCookies(response.headers);
  for (const cookie of cookies) {
    if (cookie.name === "ankiweb") {
      return cookie.value;
    }
  }

  throw new LoginError("Can not get ankiweb cookie from login response.");
}

export async function uploadAddon(
  cookie: string,
  info: MessageInitShape<GenMessage<AddonInfo>>,
  file?: MessageInitShape<GenMessage<AddonFile>>,
) {
  const refererQuery = info.addonId ? `?id=${info.addonId}` : "";
  const headers = {
    ...defaultHeaders,
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
  if (!response.ok) throw new HTTPStatusError(response);

  const uploadAddonResponse = fromBinary(UploadAddonResponseSchema, await response.bytes());
  return uploadAddonResponse.addonId;
}
