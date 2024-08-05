import { Toast, showToast } from "@raycast/api"
import crypto from "crypto"
import fetch from "node-fetch"
import { URLSearchParams } from "url"
import { apiURL } from "../ente/packages/next/origins"
import { ApiError, AppsResponse, GetSRPAttributesResponse, SRPAttributes, ServicesResponse } from "./dto"

const baseUrl = "https://api.ente.io"
// extracted from chrome plugin
const API_KEY = "37b312a3d682b823c439522e1fd31c82"
const SIGNATURE = crypto.randomBytes(32).toString("hex")

export async function getSRPAttributes(email: string): Promise<SRPAttributes> {
  await showToast({ style: Toast.Style.Animated, title: "Ente Auth", message: "Getting SRP attributes" })
  const response = await fetch(`${await apiURL("/users/srp/attributes")}?email=${encodeURIComponent(email)}`)

  if (response.ok) {
    return ((await response.json()) as GetSRPAttributesResponse).attributes as SRPAttributes
  } else {
    throw new Error(((await response.json()) as ApiError).message)
  }
}

export async function getAuthyApps(enteEmail: string, deviceId: number, otps: string[]): Promise<AppsResponse> {
  const formData = new URLSearchParams()
  formData.set("api_key", API_KEY)
  formData.set("signature", SIGNATURE)
  formData.set("device_id", `${deviceId}`)
  formData.set("locale", "en-GB")
  formData.set("otp1", `${otps[0]}`)
  formData.set("otp2", `${otps[1]}`)
  formData.set("otp3", `${otps[2]}`)
  const resp = await fetch(`${baseUrl}/users/${enteEmail}/devices/${deviceId}/apps/sync`, {
    method: "POST",
    body: formData.toString(),
  })
  if (resp.ok) {
    return (await resp.json()) as AppsResponse
  } else {
    throw new Error(((await resp.json()) as ApiError).message)
  }
}

export async function getServices(enteEmail: string, deviceId: number, otps: string[]): Promise<ServicesResponse> {
  const formData = new URLSearchParams()
  formData.set("api_key", API_KEY)
  formData.set("signature", SIGNATURE)
  formData.set("device_id", `${deviceId}`)
  formData.set("apps", "") // get all existing apps
  formData.set("otp1", `${otps[0]}`)
  formData.set("otp2", `${otps[1]}`)
  formData.set("otp3", `${otps[2]}`)
  const resp = await fetch(`${baseUrl}/users/${enteEmail}/authenticator_tokens?` + formData)
  if (resp.ok) {
    return (await resp.json()) as ServicesResponse
  } else {
    throw new Error(((await resp.json()) as ApiError).message)
  }
}
