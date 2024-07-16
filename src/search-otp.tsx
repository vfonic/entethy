import { getPreferenceValues } from "@raycast/api"
import { useEffect, useState } from "react"
import { APPS_KEY, ENTE_EMAIL, OTP_SERVICES_KEY, SERVICES_KEY, addToCache, checkIfCached, getFromCache } from "./cache"
import { AppEntry, AppsResponse, AuthenticatorToken, ServicesResponse } from "./client/dto"
import LoginForm from "./component/login/LoginForm"
import { logout } from "./component/login/login-helper"
import { OtpList } from "./component/otp/OtpList"
import { mapOtpServices } from "./util/utils"

export default function SearchOtp() {
  const [isLogin, setLogin] = useState<boolean>()

  useEffect(() => {
    async function checkData() {
      if (await checkIfCached(OTP_SERVICES_KEY)) {
        setLogin(true)
        return
      }

      // TODO: migration to single unified representation of otp service. Delete on the next release
      const services: AuthenticatorToken[] = []
      const apps: AppEntry[] = []
      let dataPresent = false

      if (await checkIfCached(SERVICES_KEY)) {
        const serviceResponse: ServicesResponse = await getFromCache(SERVICES_KEY)
        services.push(...serviceResponse.authenticator_tokens)
        dataPresent = true
      }

      if (await checkIfCached(APPS_KEY)) {
        const appsResponse: AppsResponse = await getFromCache(APPS_KEY)
        apps.push(...appsResponse.apps)
        dataPresent = true
      }

      if (dataPresent) {
        const optServices = mapOtpServices(services, apps)
        await addToCache(OTP_SERVICES_KEY, optServices)
      }
      setLogin(dataPresent)
    }

    checkData()
  }, [])

  useEffect(() => {
    async function removeCachedValuesIfEnteEmailHasBeenChanged() {
      const isEmailCached = await checkIfCached(ENTE_EMAIL)
      if (isEmailCached) {
        const cachedEmail = await getFromCache<string>(ENTE_EMAIL)
        const { enteEmail } = getPreferenceValues<{ enteEmail: string }>()
        if (enteEmail != cachedEmail) {
          await logout()
          setLogin(false)
        }
      }
    }
    removeCachedValuesIfEnteEmailHasBeenChanged()
  })

  if (isLogin == false) {
    return <LoginForm setLogin={setLogin} />
  }

  return <OtpList isLogin={isLogin} setLogin={setLogin} />
}
