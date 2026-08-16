import express from "express";

import { userAuth } from "../middleware/Auth.js";
import {
  cancelMyOrderController,
  createOrderController,
  getMyOrderByIdController,
  getMyOrdersController,
} from "../controllers/orderController.js";

const orderRouter = express.Router();

orderRouter.post("/create", userAuth, createOrderController);

// Get logged-in user's orders
orderRouter.get("/my-orders", userAuth, getMyOrdersController);

// Get logged-in user's single order
orderRouter.get("/:orderId", userAuth, getMyOrderByIdController);

// Cancel logged-in user's order
orderRouter.patch("/:orderId/cancel", userAuth, cancelMyOrderController);

export default orderRouter;
