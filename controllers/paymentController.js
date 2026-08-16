import {
  createRazorpayOrder,
  verifyRazorpayPayment,
} from "../services/paymentService.js";

// ==================================================
// CREATE RAZORPAY ORDER
// ==================================================

export const createRazorpayOrderController = async (req, res) => {
  try {
    const { amount, receipt } = req.body;

    if (amount === undefined || amount === null || amount === "") {
      return res.status(400).json({
        success: false,
        message: "Amount is required",
      });
    }

    const amountInRupees = Number(amount);

    if (!Number.isFinite(amountInRupees) || amountInRupees <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid amount",
      });
    }

    // Rupees -> Paise
    const amountInPaise = Math.round(amountInRupees * 100);

    const razorpayOrder = await createRazorpayOrder({
      amount: amountInPaise,
      receipt: receipt || `receipt_${Date.now()}`,
    });

    return res.status(200).json({
      success: true,

      razorpayOrder: {
        id: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        status: razorpayOrder.status,
      },
    });
  } catch (error) {
    console.error("CREATE RAZORPAY ORDER ERROR:", error);

    return res.status(400).json({
      success: false,
      message: error.message || "Failed to create payment order",
    });
  }
};

// ==================================================
// VERIFY PAYMENT
// ==================================================

export const verifyRazorpayPaymentController = async (req, res) => {
  try {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

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

    return res.status(200).json({
      success: true,
      message: "Payment verified successfully",
    });
  } catch (error) {
    console.error("VERIFY RAZORPAY PAYMENT ERROR:", error);

    return res.status(400).json({
      success: false,
      message: error.message || "Payment verification failed",
    });
  }
};
