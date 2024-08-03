import { LocalStorage } from "@raycast/api"

export const SERVICES_KEY = "services"
export const APPS_KEY = "apps"
export const OTP_SERVICES_KEY = "otpServices"

export const USER = "user"
export const SRP_ATTRIBUTES = "srpAttributes"
export const KEY_ATTRIBUTES = "keyAttributes"

export const DEVICE_ID = "deviceId"
export const SECRET_SEED = "secretSeed"
export const ENTE_EMAIL = "enteEmail"
export const RECENTLY_USED = "recentlyUsed"

export async function checkIfCached(key: string): Promise<boolean> {
  return (await LocalStorage.getItem(key)) != undefined
}

export async function getFromCache<T>(key: string): Promise<T> {
  const fromCache = await LocalStorage.getItem<string>(key)
  if (fromCache != undefined) {
    return JSON.parse(fromCache)
  } else {
    throw new Error(`${key} not found`)
  }
}

export async function getFromCacheOrDefault<T>(key: string, defaultValue: T): Promise<T> {
  const fromCache = await LocalStorage.getItem<string>(key)
  if (fromCache != undefined) {
    return JSON.parse(fromCache)
  } else {
    return defaultValue
  }
}

export async function addToCache(key: string, value: object | string | number | boolean): Promise<void> {
  return await LocalStorage.setItem(key, JSON.stringify(value))
}

export async function removeFromCache(key: string): Promise<void> {
  return await LocalStorage.removeItem(key)
}
