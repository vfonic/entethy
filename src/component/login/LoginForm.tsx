import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
import { useEffect } from "react";
import { getSrpData, login, resetSrpData } from "./login-helper";

const WELCOME_MESSAGE = `## Fetching OTP codes from Ente Auth`;

export default function LoginForm(props: { setLogin: (step: boolean) => void }) {
  useEffect(() => {
    (async () => {
      await getSrpData();
    })();
  });

  return (
    <Detail
      markdown={WELCOME_MESSAGE}
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Checkmark} title="Agree" onSubmit={async () => await login(props.setLogin)} />
          <Action icon={Icon.ExclamationMark} title={"Start From Scratch"} onAction={resetSrpData} />
        </ActionPanel>
      }
    />
  );
}
