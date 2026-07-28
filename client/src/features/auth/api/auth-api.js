import { api } from "@/lib/axios"

export const sendLoginOtp = (data) => {
  return api.post("/auth/send-login-otp", data)
}

export const verifyLoginOtp = (data) => {
  return api.post("/auth/verify-login-otp", data)
}

export const completeProfile = (data) => {
  return api.patch("/auth/profile", data)
}
