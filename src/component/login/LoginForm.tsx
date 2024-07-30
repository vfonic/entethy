import { Action, ActionPanel, Detail, Icon } from "@raycast/api"
import { useEffect } from "react"
import { getSrpData, login } from "./login-helper"

const WELCOME_MESSAGE = `## Fetching OTP codes from Ente Auth`

export default function LoginForm(props: { setIsLoggedIn: (step: boolean) => void }) {
  useEffect(() => {
    ;(async () => {
      await getSrpData(props.setIsLoggedIn)
    })()
  }, [props.setIsLoggedIn])

  return (
    <Detail
      markdown={WELCOME_MESSAGE}
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Checkmark} title="Agree" onSubmit={async () => await login(props.setIsLoggedIn)} />
        </ActionPanel>
      }
    />
  )
}
