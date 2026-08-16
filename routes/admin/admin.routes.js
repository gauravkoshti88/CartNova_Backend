import express from "express";
import { adminAuth } from "../../middleware/Auth.js";
import {
  getAdmin,
  getAdminDashboard,
} from "../../controllers/admin/admin.controller.js";

const adminRouter = express.Router();

adminRouter
  .get("/get-admin", adminAuth, getAdmin)

  .get("/dashboard", adminAuth, getAdminDashboard);

export default adminRouter;
