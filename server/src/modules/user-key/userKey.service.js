import { AppError } from "../../utils/AppError.js";
import * as userKeyRepository from "./userKey.repository.js";
import * as userRepository from "../user/user.repository.js";

const isRecoveryBlob = (blob) =>
  Boolean(blob && typeof blob === "object" && blob.salt);

export const getOwnKey = async (userId) => {
  const entry = await userKeyRepository.findById(userId);
  if (!entry) {
    return { hasKey: false, publicKey: null, recoveryBlob: null };
  }
  return {
    hasKey: true,
    publicKey: entry.publicKey,
    recoveryBlob: isRecoveryBlob(entry.recoveryBlob)
      ? entry.recoveryBlob
      : null,
  };
};

export const saveKey = async (userId, publicKey, recoveryBlob) => {
  if (!publicKey) {
    throw new AppError(400, "publicKey is required");
  }
  if (typeof publicKey !== "string" || publicKey.length > 2048) {
    throw new AppError(400, "publicKey must be a valid string");
  }
  if (recoveryBlob != null && !isRecoveryBlob(recoveryBlob)) {
    throw new AppError(400, "recoveryBlob must be a valid object");
  }

  const user = await userRepository.findById(userId);
  if (!user) {
    throw new AppError(404, "User not found");
  }

  await userKeyRepository.upsert(userId, publicKey, recoveryBlob ?? {});
  return { hasKey: true, publicKey };
};

export const getPeerPublicKey = async (peerId) => {
  const entry = await userKeyRepository.findPublicKey(peerId);
  if (!entry) {
    throw new AppError(404, "Peer has no encryption key yet");
  }
  return { publicKey: entry.publicKey };
};
