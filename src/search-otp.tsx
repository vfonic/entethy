import { createContext, useContext, useState } from "react"
import { Service } from "./component/login/login-helper"
import { OtpList } from "./component/otp/OtpList"

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

export default function SearchOtp() {
  const [otpList, setOtpList] = useState<IOtpList>({ services: [], isLoading: true })
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false)

  return (
    <EnteContext.Provider value={{ isLoggedIn, setIsLoggedIn, otpList, setOtpList }}>
      <OtpList />
    </EnteContext.Provider>
  )
}
