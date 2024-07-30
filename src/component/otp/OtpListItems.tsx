import { clearTimeout } from "node:timers"
import { useEffect, useState } from "react"
import { useEnteContext } from "../../search-otp"
import OtpListItem from "./OtpListItem"

function calculateTimeLeft(basis: number) {
  return basis - (new Date().getSeconds() % basis)
}

interface TimeState {
  timeLeft10: number
  timeLeft30: number
}

export default function OtpListItems() {
  const { otpList } = useEnteContext()

  const [{ timeLeft10, timeLeft30 }, setTimes] = useState<TimeState>({
    timeLeft10: calculateTimeLeft(10),
    timeLeft30: calculateTimeLeft(30),
  })

  useEffect(() => {
    let id: NodeJS.Timeout

    // rather use recursive setTimeout to get close to the start of the second
    const doSetTimes = () => {
      setTimes({
        timeLeft10: calculateTimeLeft(10),
        timeLeft30: calculateTimeLeft(30),
      })
      id = setTimeout(doSetTimes, 1000 - new Date().getMilliseconds())
    }
    doSetTimes()
    return () => clearTimeout(id)
  }, [])

  return (
    <>
      {otpList.services.map((service, index) => (
        <OtpListItem key={index} index={index} service={service} timeLeft={service.type === "service" ? timeLeft30 : timeLeft10} />
      ))}
    </>
  )
}
