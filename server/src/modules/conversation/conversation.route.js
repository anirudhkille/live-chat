import { Router } from "express"
import { authenticate } from "../../middleware/auth.middleware.js"
import {createOrGetConversation} from "./conversation.controller.js"

const router = Router()

router.use(authenticate)

router.post("/",createOrGetConversation)

export default router