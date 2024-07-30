import { List, showToast, Toast } from "@raycast/api"
import { createContext, useContext, useState } from "react"
import { Service } from "./component/login/login-helper"

interface IOtpList {
  services: Service[]
  isLoading: boolean
}

interface EnteContextType {
  isLoggedIn: boolean
  setIsLoggedIn: React.Dispatch<React.SetStateAction<boolean>>
  otpList: IOtpList
  setOtpList: React.Dispatch<React.SetStateAction<IOtpList>>
}

export const EnteContext = createContext<EnteContextType | undefined>(undefined)

export function useEnteContext() {
  const context = useContext(EnteContext)
  if (context === undefined) throw new Error("useEnteContext must be used within an EnteContext")
  return context
}

export default async function SearchOtp() {
  const [otpList, setOtpList] = useState<IOtpList>({ services: [], isLoading: true })
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false)

  // if (process.env.NODE_ENV === "development") {
  await showToast({ style: Toast.Style.Animated, title: "Ente Auth", message: "Kick-off!!!" + process.env.NODE_ENV })
  console.log("Hello World")

  // <Action title={"Sync"} icon={Icon.ArrowClockwise} shortcut={{ modifiers: ["cmd"], key: "r" }} onAction={() => {}} />
  return (
    <List isLoading={true} />
    // <EnteContext.Provider value={{ isLoggedIn, setIsLoggedIn, otpList, setOtpList }}>
    // <OtpList />
    // </EnteContext.Provider>
  )
}
