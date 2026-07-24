import express from "express";
import {
  accessChat,
  fetchChats,
  createGroupChat,
  groupExit,
  fetchGroups,
} from "./chatControllers.js";
import { protect } from "../../middleware/authMiddleware.js";

const router = express.Router();

router.route("/").post(protect, accessChat);
router.route("/").get(protect, fetchChats);
router.route("/createGroup").post(protect, createGroupChat);
router.route("/fetchGroups").get(protect, fetchGroups);
router.route("/groupExit").put(protect, groupExit);

export default router;
