import {
  createRazorpayOrder,
  verifyRazorpayPayment,
} from "../services/paymentService.js";

import {
  createPaymentIntent,
  getPaymentIntent,
  cancelPaymentIntent,
  attachRazorpayOrder,
} from "../services/paymentIntentService.js";

import { finalizePayment } from "../services/paymentFinalizerService.js";

// Create Razorpay order
export const createRazorpayOrderController = async (req, res) => {
  try {
    const userId = req.userId;

    const { paymentIntentId } = req.body;

    if (!paymentIntentId) {
      return res.status(400).json({
        success: false,
        message: "Payment intent ID is required",
      });
    }

    const paymentIntent = await getPaymentIntent(userId, paymentIntentId);

    if (paymentIntent.paymentMethod !== "online") {
      return res.status(400).json({
        success: false,
        message: "Payment intent is not for online payment",
      });
    }

    if (paymentIntent.status === "paid") {
      return res.status(400).json({
        success: false,
        message: "Payment is already completed",
      });
    }

    if (paymentIntent.status === "cancelled") {
      return res.status(400).json({
        success: false,
        message: "Payment intent is cancelled",
      });
    }

    if (paymentIntent.razorpayOrderId) {
      return res.status(200).json({
        success: true,
        message: "Razorpay order already exists",
        paymentIntent,
        razorpayOrder: {
          id: paymentIntent.razorpayOrderId,
          amount: Math.round(paymentIntent.amount * 100),
          currency: paymentIntent.currency,
        },
      });
    }

    const razorpayOrder = await createRazorpayOrder({
      amount: Math.round(paymentIntent.amount * 100),
      currency: paymentIntent.currency,
      receipt: paymentIntent.idempotencyKey,
    });

    const updatedPaymentIntent = await attachRazorpayOrder({
      userId,
      paymentIntentId,
      razorpayOrderId: razorpayOrder.id,
    });

    return res.status(200).json({
      success: true,
      message: "Razorpay order created successfully",
      razorpayOrder: {
        id: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        status: razorpayOrder.status,
      },
      paymentIntent: updatedPaymentIntent,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message || "Failed to create Razorpay order",
    });
  }
};

// Verify Razorpay payment
export const verifyRazorpayPaymentController = async (req, res) => {
  try {
    const userId = req.userId;

    const {
      paymentIntentId,
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
    } = req.body;

    if (!paymentIntentId) {
      return res.status(400).json({
        success: false,
        message: "Payment intent ID is required",
      });
    }

    if (!razorpayOrderId) {
      return res.status(400).json({
        success: false,
        message: "Razorpay order ID is required",
      });
    }

    if (!razorpayPaymentId) {
      return res.status(400).json({
        success: false,
        message: "Razorpay payment ID is required",
      });
    }

    if (!razorpaySignature) {
      return res.status(400).json({
        success: false,
        message: "Razorpay signature is required",
      });
    }

    const paymentIntent = await getPaymentIntent(userId, paymentIntentId);

    if (paymentIntent.razorpayOrderId !== razorpayOrderId) {
      return res.status(400).json({
        success: false,
        message: "Razorpay order does not match payment intent",
      });
    }

    const isValid = verifyRazorpayPayment({
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
    });

    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment signature",
      });
    }

    const result = await finalizePayment({
      paymentIntentId,
      razorpayOrderId,
      razorpayPaymentId,
    });

    return res.status(200).json({
      success: true,
      message: result.alreadyFinalized
        ? "Payment already processed"
        : "Payment verified and order confirmed",
      order: result.order,
      paymentIntent: result.paymentIntent,
      alreadyFinalized: result.alreadyFinalized,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message || "Payment verification failed",
    });
  }
};

// Create payment intent
export const createPaymentIntentController = async (req, res) => {
  try {
    const userId = req.userId;

    const { shippingAddress, paymentMethod, idempotencyKey } = req.body;

    const paymentIntent = await createPaymentIntent({
      userId,
      shippingAddress,
      paymentMethod,
      idempotencyKey,
    });

    return res.status(201).json({
      success: true,
      message: "Payment intent created successfully",
      paymentIntent,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message || "Failed to create payment intent",
    });
  }
};

// Get payment intent
export const getPaymentIntentController = async (req, res) => {
  try {
    const userId = req.userId;

    const { paymentIntentId } = req.params;

    const paymentIntent = await getPaymentIntent(userId, paymentIntentId);

    return res.status(200).json({
      success: true,
      paymentIntent,
    });
  } catch (error) {
    return res.status(404).json({
      success: false,
      message: error.message || "Payment intent not found",
    });
  }
};

// Cancel payment intent
export const cancelPaymentIntentController = async (req, res) => {
  try {
    const userId = req.userId;

    const { paymentIntentId } = req.params;

    const paymentIntent = await cancelPaymentIntent({
      userId,
      paymentIntentId,
    });

    return res.status(200).json({
      success: true,
      message: "Payment intent cancelled successfully",
      paymentIntent,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message || "Failed to cancel payment intent",
    });
  }
};
