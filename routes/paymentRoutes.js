import express from "express";

import {
  createPaymentIntentController,
  getPaymentIntentController,
  cancelPaymentIntentController,
  createRazorpayOrderController,
  verifyRazorpayPaymentController,
} from "../controllers/paymentController.js";

import { userAuth } from "../middleware/Auth.js";

const paymentRouter = express.Router();

// Create payment intent
paymentRouter.post("/intent", userAuth, createPaymentIntentController);

// Get payment intent
paymentRouter.get(
  "/intent/:paymentIntentId",
  userAuth,
  getPaymentIntentController,
);

// Cancel payment intent
paymentRouter.patch(
  "/intent/:paymentIntentId/cancel",
  userAuth,
  cancelPaymentIntentController,
);

// Create Razorpay order
paymentRouter.post(
  "/razorpay/create-order",
  userAuth,
  createRazorpayOrderController,
);

// Verify Razorpay payment
paymentRouter.post(
  "/razorpay/verify",
  userAuth,
  verifyRazorpayPaymentController,
);

export default paymentRouter;
