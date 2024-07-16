import { Toast, showToast } from "@raycast/api";
import crypto from "crypto";
import fetch from "node-fetch";
import os from "os";
import { URLSearchParams } from "url";
import {
  ApiError,
  AppsResponse,
  Device,
  GetSRPAttributesResponse,
  RegistrationStatus,
  SRPAttributes,
  ServicesResponse,
} from "./dto";

const baseUrl = "https://api.ente.io";
// extracted from chrome plugin
const API_KEY = "37b312a3d682b823c439522e1fd31c82";
const SIGNATURE = crypto.randomBytes(32).toString("hex");

export async function getSRPAttributes(email: string): Promise<SRPAttributes> {
  const toast = await showToast({ style: Toast.Style.Animated, title: "Ente Auth", message: "Getting SRP data" });
  const resp = await fetch(`https://api.ente.io/users/srp/attributes?email=${encodeURIComponent(email)}`);

  toast.hide();
  if (resp.ok) {
    return ((await resp.json()) as GetSRPAttributesResponse).attributes as SRPAttributes;
  } else {
    throw new Error(((await resp.json()) as ApiError).message);
  }
}

export async function checkRequestStatus(enteEmail: number, requestId: string): Promise<RegistrationStatus> {
  const formData = new URLSearchParams();
  formData.set("api_key", API_KEY);
  formData.set("signature", SIGNATURE);
  formData.set("locale", "en-GB");
  const resp = await fetch(`${baseUrl}/users/${enteEmail}/devices/registration/${requestId}/status?` + formData, {
    method: "GET",
  });
  if (resp.ok) {
    return (await resp.json()) as RegistrationStatus;
  } else {
    const apiError = (await resp.json()) as ApiError;
    throw new Error(apiError.message);
  }
}

export async function completeRegistration(enteEmail: number, pin: string): Promise<Device> {
  const formData = new URLSearchParams();
  formData.set("pin", pin);
  formData.set("api_key", API_KEY);
  formData.set("signature", SIGNATURE);
  formData.set("device_app", "Raycast Authy Extension");
  formData.set("device_name", `Raycast Authy Extension on ${os.hostname()}`);
  const resp = await fetch(`${baseUrl}/users/${enteEmail}/devices/registration/complete`, {
    method: "POST",
    body: formData,
  });
  if (resp.ok) {
    return (await resp.json()) as Device;
  } else {
    throw new Error(((await resp.json()) as ApiError).message);
  }
}

export async function getAuthyApps(enteEmail: number, deviceId: number, otps: string[]): Promise<AppsResponse> {
  const formData = new URLSearchParams();
  formData.set("api_key", API_KEY);
  formData.set("signature", SIGNATURE);
  formData.set("device_id", `${deviceId}`);
  formData.set("locale", "en-GB");
  formData.set("otp1", `${otps[0]}`);
  formData.set("otp2", `${otps[1]}`);
  formData.set("otp3", `${otps[2]}`);
  const resp = await fetch(`${baseUrl}/users/${enteEmail}/devices/${deviceId}/apps/sync`, {
    method: "POST",
    body: formData,
  });
  if (resp.ok) {
    return (await resp.json()) as AppsResponse;
  } else {
    throw new Error(((await resp.json()) as ApiError).message);
  }
}

export async function getServices(enteEmail: number, deviceId: number, otps: string[]): Promise<ServicesResponse> {
  const formData = new URLSearchParams();
  formData.set("api_key", API_KEY);
  formData.set("signature", SIGNATURE);
  formData.set("device_id", `${deviceId}`);
  formData.set("apps", ""); // get all existing apps
  formData.set("otp1", `${otps[0]}`);
  formData.set("otp2", `${otps[1]}`);
  formData.set("otp3", `${otps[2]}`);
  const resp = await fetch(`${baseUrl}/users/${enteEmail}/authenticator_tokens?` + formData);
  if (resp.ok) {
    return (await resp.json()) as ServicesResponse;
  } else {
    throw new Error(((await resp.json()) as ApiError).message);
  }
}
