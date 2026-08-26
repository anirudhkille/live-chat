import { Router } from "express"
import { authenticate } from "../../middleware/auth.middleware.js"
import {sendMessage,getMessages} from "./message.controller.js"

const router = Router()

router.use(authenticate)

router.post("/:conversationId", sendMessage)
router.get("/:conversationId", getMessages)

export default router