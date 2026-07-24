import express from "express";
import {
  loginController,
  registerController,
  fetchAllUsersController,
} from "./userController.js";

import { protect } from "../../middleware/authMiddleware.js";

const Router = express.Router();

Router.post("/login", loginController);
Router.post("/register", registerController);
Router.get("/fetchUsers", protect, fetchAllUsersController);

export default Router;
