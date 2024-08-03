import { Toast, showToast } from "@raycast/api"
import { KEY_ATTRIBUTES, SRP_ATTRIBUTES, USER, addToCache, getFromCache } from "../../cache"
import { SRPAttributes } from "../../client/dto"
import { getSRPAttributes } from "../../client/ente-auth-client"
import { configureSRP, generateSRPSetupAttributes, loginViaSRP } from "../../ente/packages/accounts/services/srp"
import log from "../../ente/packages/next/log"
import {
  decryptAndStoreToken,
  generateIntermediateKeyAttributes,
  generateLoginSubKey,
  generateSessionKey,
} from "../../ente/packages/shared/crypto/helpers"
import { CustomError } from "../../ente/packages/shared/error"
import { isFirstLogin } from "../../ente/packages/shared/storage/localStorage/helpers"
import { SESSION_KEYS } from "../../ente/packages/shared/storage/sessionStorage"
import { KeyAttributes } from "../../ente/packages/shared/user/types"
import * as libsodium from "./libsodium"

export const getKeyAttributes = async (kek: string, srpAttributes: any, email: string) => {
  await showToast({ style: Toast.Style.Animated, title: "Ente Auth", message: "Getting key attributes" })
  try {
    const { keyAttributes, encryptedToken, token, id, twoFactorSessionID, passkeySessionID } = await loginViaSRP(srpAttributes, kek)
    // const user = (await getFromCache(USER)) as object
    await addToCache(USER, {
      email,
      token,
      encryptedToken,
      id,
      isTwoFactorEnabled: false,
    })
    if (keyAttributes) await addToCache(KEY_ATTRIBUTES, keyAttributes)
    return keyAttributes
  } catch (e) {
    await showToast({ style: Toast.Style.Failure, title: "Ente Auth", message: "Getting key attributes failed: " + e })
    throw e
  }
}

export const useMasterPassword = async (key: string, kek: string, keyAttributes: any, passphrase: string) => {
  console.log("useMasterPassword")
  try {
    if (isFirstLogin() && passphrase) {
      const intermediateKeyAttributes = await generateIntermediateKeyAttributes(passphrase, keyAttributes, key)
      await addToCache(KEY_ATTRIBUTES, intermediateKeyAttributes)
      // console.log({ key, kek, keyAttributes, passphrase })
    }
    const sessionKeyAttributes = await generateSessionKey(key)
    console.log("useMasterPassword: generateSessionKey", sessionKeyAttributes)
    await addToCache(SESSION_KEYS.ENCRYPTION_KEY, sessionKeyAttributes)

    const user = (await getFromCache(USER)) as { email: string }
    const userWithDecryptedToken = await decryptAndStoreToken(keyAttributes, key, user)
    await addToCache(USER, userWithDecryptedToken)
    try {
      let srpAttributes: SRPAttributes | null = await getFromCache(SRP_ATTRIBUTES)
      if (!srpAttributes && user) {
        srpAttributes = await getSRPAttributes(user.email)
        if (srpAttributes) {
          await addToCache(SRP_ATTRIBUTES, srpAttributes)
        }
      }
      log.debug(() => `userSRPSetupPending ${!srpAttributes}`)
      console.log({ srpAttributes })
      if (!srpAttributes) {
        const loginSubKey = await generateLoginSubKey(kek)
        const srpSetupAttributes = await generateSRPSetupAttributes(loginSubKey)
        await configureSRP(srpSetupAttributes)
      }
    } catch (e) {
      log.error("migrate to srp failed", e)
    }
    console.log("Vraćamo se kući")
    // const redirectURL = InMemoryStore.get(MS_KEYS.REDIRECT_URL)
    // InMemoryStore.delete(MS_KEYS.REDIRECT_URL)
    // router.push(redirectURL ?? appHomeRoute)
  } catch (e) {
    log.error("useMasterPassword failed", e)
  }
}

export const verifyPassphrase = async (passphrase: string, srpAttributes: SRPAttributes, keyAttributes: KeyAttributes) => {
  try {
    let kek: string
    try {
      if (srpAttributes) {
        kek = await libsodium.deriveKey(passphrase, srpAttributes.kekSalt, srpAttributes.opsLimit, srpAttributes.memLimit)
      } else if (keyAttributes) {
        kek = await libsodium.deriveKey(passphrase, keyAttributes.kekSalt, keyAttributes.opsLimit, keyAttributes.memLimit)
      } else throw new Error("Both SRP and key attributes are missing")
    } catch (e) {
      log.error("failed to derive key", e)
      throw Error(CustomError.WEAK_DEVICE)
    }
    if (!keyAttributes && typeof getKeyAttributes === "function") {
      keyAttributes = await getKeyAttributes(kek, srpAttributes)
    }
    if (!keyAttributes) {
      throw Error("couldn't get key attributes")
    }
    try {
      const key = await libsodium.decryptB64(keyAttributes.encryptedKey, keyAttributes.keyDecryptionNonce, kek)
      // callback(key, kek, keyAttributes, passphrase)
    } catch (e) {
      log.error("user entered a wrong password", e)
      throw Error(CustomError.INCORRECT_PASSWORD)
    }
  } catch (e) {
    if (e instanceof Error) {
      if (e.message === CustomError.TWO_FACTOR_ENABLED) {
        await showToast({ style: Toast.Style.Failure, title: "Ente Auth", message: "Two factor enabled" })
        // two factor enabled, user has been redirected to two factor page
        return
      }
      log.error("failed to verify passphrase", e)
      let message: string
      switch (e.message) {
        case CustomError.WEAK_DEVICE:
          message = "Error: WEAK_DEVICE"
          console.error(message)
          await showToast({ style: Toast.Style.Failure, title: "Ente Auth", message })
          break
        case CustomError.INCORRECT_PASSWORD:
          message = "Error: INCORRECT_PASSPHRASE"
          console.error(message)
          await showToast({ style: Toast.Style.Failure, title: "Ente Auth", message })
          break
        default:
          message = `Error: ${e.message}`
          console.error(message)
          await showToast({ style: Toast.Style.Failure, title: "Ente Auth", message })
      }
    }
  }
}
