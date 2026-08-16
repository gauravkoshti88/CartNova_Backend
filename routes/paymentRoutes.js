import express from "express";

import {
  createRazorpayOrderController,
  verifyRazorpayPaymentController,
} from "../controllers/paymentController.js";

import { userAuth } from "../middleware/Auth.js";

const paymentRouter = express.Router();

// Create Razorpay order
paymentRouter.post("/create", userAuth, createRazorpayOrderController);

// Verify payment
paymentRouter.post("/verify", userAuth, verifyRazorpayPaymentController);

export default paymentRouter;
