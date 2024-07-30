import { Toast, showToast } from "@raycast/api"
import { KEY_ATTRIBUTES, USER, addToCache, getFromCache } from "../../cache"
import { configureSRP, generateSRPSetupAttributes, loginViaSRP } from "../../ente/packages/accounts/services/srp"
import {
  decryptAndStoreToken,
  generateAndSaveIntermediateKeyAttributes,
  generateLoginSubKey,
  saveKeyInSessionStore,
} from "../../ente/packages/shared/crypto/helpers"
import { isFirstLogin } from "../../ente/packages/shared/storage/localStorage/helpers"
import { SRPAttributes } from "../../client/dto"
import { getData, setData } from "../../ente/packages/shared/storage/localStorage"
import { getSRPAttributes } from "../../client/ente-auth-client"
import log from "../../ente/packages/next/log"

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
  // try {
  //   if (isFirstLogin() && passphrase) {
  //     await generateAndSaveIntermediateKeyAttributes(passphrase, keyAttributes, key)
  //   }
  //   await saveKeyInSessionStore(SESSION_KEYS.ENCRYPTION_KEY, key)
  //   await decryptAndStoreToken(keyAttributes, key)
  //   try {
  //     let srpAttributes: SRPAttributes | null = getData(LS_KEYS.SRP_ATTRIBUTES)
  //     if (!srpAttributes && user) {
  //       srpAttributes = await getSRPAttributes(user.email)
  //       if (srpAttributes) {
  //         setData(LS_KEYS.SRP_ATTRIBUTES, srpAttributes)
  //       }
  //     }
  //     log.debug(() => `userSRPSetupPending ${!srpAttributes}`)
  //     if (!srpAttributes) {
  //       const loginSubKey = await generateLoginSubKey(kek)
  //       const srpSetupAttributes = await generateSRPSetupAttributes(loginSubKey)
  //       await configureSRP(srpSetupAttributes)
  //     }
  //   } catch (e) {
  //     log.error("migrate to srp failed", e)
  //   }
  //   const redirectURL = InMemoryStore.get(MS_KEYS.REDIRECT_URL)
  //   InMemoryStore.delete(MS_KEYS.REDIRECT_URL)
  //   router.push(redirectURL ?? appHomeRoute)
  // } catch (e) {
  //   log.error("useMasterPassword failed", e)
  // }
}
