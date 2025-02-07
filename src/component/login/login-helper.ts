import { getPreferenceValues, showToast, Toast } from "@raycast/api"
import { encode } from "hi-base32"
import {
  addToCache,
  APPS_KEY,
  checkIfCached,
  DEVICE_ID,
  ENTE_EMAIL,
  getFromCache,
  OTP_SERVICES_KEY,
  removeFromCache,
  SECRET_SEED,
  SERVICES_KEY,
  SRP_ATTRIBUTES,
  USER,
} from "../../cache"
import { getAuthyApps, getServices, getSRPAttributes } from "../../client/ente-auth-client"
import { getAuthCodes } from "../../ente/apps/auth/src/services/remote"
import { SESSION_KEYS } from "../../ente/packages/shared/storage/sessionStorage"
import { generateTOTP } from "../../util/totp"
import { mapOtpServices } from "../../util/utils"
import * as libsodium from "./libsodium"
import { getKeyAttributes, useMasterPassword } from "./verifyMasterPassword"

export interface Service {
  id: string
  name: string
  digits: number
  period: number
  seed: string | null
  accountType?: string
  issuer?: string
  logo?: string
  type: "authy" | "service"
}

const { enteEmail, entePassword } = getPreferenceValues<{ enteEmail: string; entePassword: string }>()

// SRP - Secure Remote Password
export async function login(setOtpList: React.Dispatch<React.SetStateAction<{ services: Service[]; isLoading: boolean }>>) {
  try {
    const hasSrpData = await checkIfCached(SRP_ATTRIBUTES)
    let srpAttributes = null
    if (!hasSrpData) {
      await addToCache(USER, { email: enteEmail })
      srpAttributes = await getSRPAttributes(enteEmail)
      await addToCache(SRP_ATTRIBUTES, srpAttributes)
    } else {
      srpAttributes = await getFromCache(SRP_ATTRIBUTES)
    }

    await showToast({ style: Toast.Style.Animated, title: "Ente Auth", message: "Deriving Key Encryption Key" })
    const kek = await libsodium.deriveKey(entePassword, srpAttributes.kekSalt, srpAttributes.opsLimit, srpAttributes.memLimit)

    const keyAttributes = await getKeyAttributes(kek, srpAttributes)
    if (!keyAttributes) throw new Error("KeyAttributes not found")

    const toast = await showToast({ style: Toast.Style.Animated, title: "Ente Auth", message: "Decrypting encrypted key" })
    const key = await libsodium.decryptB64(keyAttributes.encryptedKey, keyAttributes.keyDecryptionNonce, kek)
    await useMasterPassword(key, kek, keyAttributes, entePassword)
    const authCodes = await getAuthCodes()

    const otpServices: Service[] = authCodes.map(code => ({
      id: code.id,
      period: code.period,
      digits: code.length,
      issuer: code.issuer,
      accountType: code.type,
      name: code.account,
      seed: code.secret,
      // logo?: string
      type: "service",
    }))
    setOtpList({
      services: otpServices,
      isLoading: false,
    })
    await addToCache(OTP_SERVICES_KEY, otpServices)
    toast.hide()
  } catch (error) {
    if (error instanceof Error) {
      await showToast({ style: Toast.Style.Failure, title: "Ente Auth", message: error.message })
    } else {
      throw error
    }
  }
}

export async function getOtpServices(deviceId: number, secretSeed: string) {
  await showToast(Toast.Style.Animated, "Ente Auth", "Getting Services")

  const seed = encode(Buffer.from(secretSeed, "hex"))
  const timestamp = new Date()
  const otps = [
    generateTOTP(seed, { digits: 7, period: 10, timestamp: timestamp.getTime() }),
    generateTOTP(seed, { digits: 7, period: 10, timestamp: timestamp.getTime() + 10 * 1000 }),
    generateTOTP(seed, { digits: 7, period: 10, timestamp: timestamp.getTime() + 10 * 2 * 1000 }),
  ]

  // get authy apps
  const authyAppResponse = await getAuthyApps(enteEmail, deviceId, otps)
  // get 3rd party services
  const authyServicesResponse = await getServices(enteEmail, deviceId, otps)
  // map opt Services to common format
  const otpServices = mapOtpServices(authyServicesResponse.authenticator_tokens, authyAppResponse.apps)

  await addToCache(SERVICES_KEY, authyServicesResponse)
  await addToCache(APPS_KEY, authyAppResponse)
  await addToCache(OTP_SERVICES_KEY, otpServices)

  return otpServices
}

export async function logout() {
  await removeFromCache(SECRET_SEED)
  await removeFromCache(DEVICE_ID)
  await removeFromCache(SERVICES_KEY)
  await removeFromCache(APPS_KEY)
  await removeFromCache(SRP_ATTRIBUTES)
  await removeFromCache(OTP_SERVICES_KEY)
  await removeFromCache(ENTE_EMAIL)
  await removeFromCache(SESSION_KEYS.ENCRYPTION_KEY)
  await removeFromCache(SESSION_KEYS.KEY_ENCRYPTION_KEY)
}

export async function isEmailChanged() {
  const isEmailCached = await checkIfCached(ENTE_EMAIL)
  if (isEmailCached) {
    const cachedEmail = await getFromCache<string>(ENTE_EMAIL)
    const { enteEmail } = getPreferenceValues<{ enteEmail: string }>()
    return enteEmail != cachedEmail
  }
}
