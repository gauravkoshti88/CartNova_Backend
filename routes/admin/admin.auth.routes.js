import express from "express";
import {
  adminLogin,
  adminLogout,
} from "../../controllers/admin/admin.auth.controller.js";

const adminAuthRouter = express.Router();

adminAuthRouter.post("/login", adminLogin);
adminAuthRouter.post("/logout", adminLogout);

export default adminAuthRouter;
