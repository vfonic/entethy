import { ActionPanel, Icon, List } from "@raycast/api"
import { useEnteContext } from "../../search-otp"
import OtpListItems from "./OtpListItems"
import { commonActions, refresh } from "./otp-helpers"

export function OtpList() {
  const { isLoggedIn, setIsLoggedIn, otpList, setOtpList } = useEnteContext()

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
