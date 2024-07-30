import { ActionPanel, Icon, List } from "@raycast/api"
import { useEffect } from "react"
import { addToCache, APPS_KEY, checkIfCached, getFromCache, OTP_SERVICES_KEY, SERVICES_KEY } from "../../cache"
import { AppEntry, AppsResponse, AuthenticatorToken, ServicesResponse } from "../../client/dto"
import { useEnteContext } from "../../search-otp"
import { mapOtpServices } from "../../util/utils"
import { login, removeCachedValuesIfEnteEmailHasBeenChanged } from "../login/login-helper"
import OtpListItems from "./OtpListItems"
import { checkAtLeastOneValidOtp, commonActions, loadData, refresh } from "./otp-helpers"

export function OtpList() {
  const { isLoggedIn, setIsLoggedIn, otpList, setOtpList } = useEnteContext()

  useEffect(() => {
    const loadFromCache = async () => {
      console.log("loadFromCache")
      if (await checkIfCached(OTP_SERVICES_KEY)) {
        setIsLoggedIn(true)
        return
      }

      // TODO: migration to single unified representation of otp service. Delete on the next release
      const services: AuthenticatorToken[] = []
      const apps: AppEntry[] = []

      let isDataPresent = false
      if (await checkIfCached(SERVICES_KEY)) {
        const serviceResponse: ServicesResponse = await getFromCache(SERVICES_KEY)
        services.push(...serviceResponse.authenticator_tokens)
        isDataPresent = true
      }

      if (await checkIfCached(APPS_KEY)) {
        const appsResponse: AppsResponse = await getFromCache(APPS_KEY)
        apps.push(...appsResponse.apps)
        isDataPresent = true
      }

      if (isDataPresent) {
        const otpServices = mapOtpServices(services, apps)
        await addToCache(OTP_SERVICES_KEY, otpServices)
      }
      setIsLoggedIn(isDataPresent)
    }
    loadFromCache()
  }, [])

  useEffect(() => {
    const init = async () => {
      console.log("init")
      otpList.services?.length > 0 && (await checkAtLeastOneValidOtp(otpList.services))
      await removeCachedValuesIfEnteEmailHasBeenChanged(setIsLoggedIn)
      if (!isLoggedIn) {
        await login()
      } else {
        await loadData(setOtpList)
      }
    }
    init()
  }, [isLoggedIn])

  return (
    <List searchBarPlaceholder="Search" isLoading={!isLoggedIn || otpList.isLoading}>
      {otpList.services.length == 0 ? (
        <List.EmptyView
          icon={Icon.SpeechBubbleImportant}
          title={"Add Services with Ente Auth app to start"}
          description={"Then sync the extension with ⌘ + R"}
          actions={<ActionPanel>{commonActions(async () => await refresh(setOtpList))}</ActionPanel>}
        />
      ) : (
        <OtpListItems />
      )}
    </List>
  )
}
