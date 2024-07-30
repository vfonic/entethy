import { Toast, showToast } from "@raycast/api"
import { ENCRYPTION_KEY, KEY_ATTRIBUTES, SRP_ATTRIBUTES, USER, addToCache, getFromCache } from "../../cache"
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
import { isFirstLogin } from "../../ente/packages/shared/storage/localStorage/helpers"

export const getKeyAttributes = async (kek: string, srpAttributes: any) => {
  await showToast({ style: Toast.Style.Animated, title: "Ente Auth", message: "Getting key attributes" })
  try {
    const { keyAttributes, encryptedToken, token, id, twoFactorSessionID, passkeySessionID } = await loginViaSRP(srpAttributes, kek)
    const user = (await getFromCache(USER)) as object
    await addToCache(USER, {
      ...user,
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
  try {
    if (isFirstLogin() && passphrase) {
      const intermediateKeyAttributes = await generateIntermediateKeyAttributes(passphrase, keyAttributes, key)
      await addToCache(KEY_ATTRIBUTES, intermediateKeyAttributes)
      console.log({ key, kek, keyAttributes, passphrase })
    }
    const sessionKeyAttributes = await generateSessionKey(key)
    await addToCache(ENCRYPTION_KEY, sessionKeyAttributes)

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
