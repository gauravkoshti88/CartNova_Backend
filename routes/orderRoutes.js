import express from "express";

import { userAuth } from "../middleware/Auth.js";

import {
  cancelMyOrderController,
  createOrderController,
  getMyOrderByIdController,
  getMyOrdersController,
} from "../controllers/orderController.js";

const orderRouter = express.Router();

// Create COD order
orderRouter.post("/create", userAuth, createOrderController);

// Get user orders
orderRouter.get("/my-orders", userAuth, getMyOrdersController);

// Get single order
orderRouter.get("/:orderId", userAuth, getMyOrderByIdController);

// Cancel order
orderRouter.patch("/:orderId/cancel", userAuth, cancelMyOrderController);

export default orderRouter;
