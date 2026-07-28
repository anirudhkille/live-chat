import crypto from "crypto";

export const generateOtp = () => {
  return crypto.randomInt(0, 999999).toString().padStart(6, "0");
};
