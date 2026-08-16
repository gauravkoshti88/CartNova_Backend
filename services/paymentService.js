import crypto from "crypto";
import razorpay from "../config/razorpay.js";

// ==================================================
// CREATE RAZORPAY ORDER
// ==================================================

export const createRazorpayOrder = async ({ amount, receipt }) => {
  try {
    // Controller already converted Rupees -> Paise
    const amountInPaise = Number(amount);

    if (!Number.isInteger(amountInPaise) || amountInPaise <= 0) {
      throw new Error("Invalid Razorpay amount");
    }

    const order = await razorpay.orders.create({
      amount: amountInPaise,
      currency: "INR",
      receipt,
    });

    return order;
  } catch (error) {
    console.error("RAZORPAY ORDER CREATE ERROR:", error);
    throw error;
  }
};

// ==================================================
// VERIFY PAYMENT
// ==================================================

export const verifyRazorpayPayment = ({
  razorpayOrderId,
  razorpayPaymentId,
  razorpaySignature,
}) => {
  if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
    throw new Error("Payment verification data is incomplete");
  }

  const generatedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest("hex");

  return generatedSignature === razorpaySignature;
};
