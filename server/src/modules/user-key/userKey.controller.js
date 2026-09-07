import { asyncHandler } from "../../utils/asyncHandler.js";
import * as userKeyService from "./userKey.service.js";
import { sendResponse } from "../../utils/response.js";

export const getOwnKey = asyncHandler(async (req, res) => {
  const result = await userKeyService.getOwnKey(req.user.id);
  sendResponse(res, 200, "Key fetched", result);
});

export const saveKey = asyncHandler(async (req, res) => {
  const { publicKey, recoveryBlob } = req.body;
  const result = await userKeyService.saveKey(
    req.user.id,
    publicKey,
    recoveryBlob,
  );
  sendResponse(res, 200, "Key saved", result);
});

export const getPeerPublicKey = asyncHandler(async (req, res) => {
  const result = await userKeyService.getPeerPublicKey(req.params.peerId);
  sendResponse(res, 200, "Peer key fetched", result);
});
