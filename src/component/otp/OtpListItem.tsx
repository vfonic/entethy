import { ActionPanel, Color, List } from "@raycast/api"
import { getProgressIcon } from "@raycast/utils"
import { useEnteContext } from "../../search-otp"
import { compareByName } from "../../util/compare"
import { icon } from "../../util/icon"
import { generateTOTP } from "../../util/totp"
import { Service } from "../login/login-helper"
import { CORRUPTED, commonActions, otpActions, refresh } from "./otp-helpers"

interface OtpListItemProps {
  index: number
  service: Service
  timeLeft: number
}

export default function OtpListItem({ index, service, timeLeft }: OtpListItemProps) {
  const { setOtpList } = useEnteContext()

  const otp =
    service.seed != null
      ? generateTOTP(service.seed, {
          digits: service.digits,
          period: service.period,
          timestamp: new Date().getTime(),
        })
      : CORRUPTED
  const subtitle = service.issuer || service.accountType || ""
  const subtitleDisplay = subtitle.match("authenticator") || !compareByName(subtitle, service.name) ? "" : subtitle
  const progress = (100 - Math.round((timeLeft / service.period) * 100)) / 100

  return (
    <List.Item
      title={service.name}
      subtitle={subtitleDisplay}
      icon={icon(service)}
      keywords={[subtitle]}
      actions={
        <ActionPanel>
          {otpActions(otp, service.id, index, setOtpList)}
          {commonActions(async () => await refresh(setOtpList))}
        </ActionPanel>
      }
      accessories={[
        { tag: `${otp}` },
        {
          icon: {
            source: {
              light: getProgressIcon(progress, "#CCC", { background: Color.PrimaryText, backgroundOpacity: 1 }),
              dark: getProgressIcon(progress, "#333", { background: Color.PrimaryText, backgroundOpacity: 1 }),
            },
          },
        },
      ]}
    />
  )
}
