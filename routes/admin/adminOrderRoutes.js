import express from "express";

import {
  getAdminOrdersController,
  getAdminOrderByIdController,
  updateAdminOrderStatusController,
  updateOrderTrackingController,
} from "../../controllers/admin/adminOrderController.js";

import { adminAuth } from "../../middleware/Auth.js";

const adminOrderRouter = express.Router();

// Orders list
adminOrderRouter.get("/", adminAuth, getAdminOrdersController);

// Order details
adminOrderRouter.get("/:orderId", adminAuth, getAdminOrderByIdController);

// Update order status
adminOrderRouter.patch(
  "/:orderId/status",
  adminAuth,
  updateAdminOrderStatusController,
);

// Update tracking
adminOrderRouter.patch(
  "/:orderId/tracking",
  adminAuth,
  updateOrderTrackingController,
);

export default adminOrderRouter;
