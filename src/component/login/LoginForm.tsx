import { Action, ActionPanel, Detail, Icon, environment } from "@raycast/api";
import { useEffect } from "react";
import { login, requestLoginIfNeeded, resetRegistration } from "./login-helper";

const WELCOME_MESSAGE = `
## Approval request has been sent

To continue, approve request at any other device and press ⏎ to continue.

<img src="file://${environment.assetsPath}/approve.png" height="200"  alt=""/>

Or press ⌘ + ⏎ to start this process from scratch
`;

export default function LoginForm(props: { setLogin: (step: boolean) => void }) {
  useEffect(() => {
    (async () => {
      await requestLoginIfNeeded();
    })();
  });

  return (
    <Detail
      markdown={WELCOME_MESSAGE}
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Checkmark} title="Agree" onSubmit={async () => await login(props.setLogin)} />
          <Action icon={Icon.ExclamationMark} title={"Start From Scratch"} onAction={resetRegistration} />
        </ActionPanel>
      }
    />
  );
}
