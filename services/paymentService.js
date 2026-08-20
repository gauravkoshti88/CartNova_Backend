import crypto from "crypto";
import Razorpay from "razorpay";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Create Razorpay order
const createRazorpayOrder = async ({ amount, receipt, notes = {} }) => {
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new Error("Invalid Razorpay amount");
  }

  if (!receipt) {
    throw new Error("Receipt is required");
  }

  const order = await razorpay.orders.create({
    amount,
    currency: "INR",
    receipt,
    notes,
  });

  if (!order?.id) {
    throw new Error("Razorpay order creation failed");
  }

  return order;
};

// Fetch Razorpay order
const fetchRazorpayOrder = async (razorpayOrderId) => {
  if (!razorpayOrderId) {
    throw new Error("Razorpay order ID is required");
  }

  return razorpay.orders.fetch(razorpayOrderId);
};

// Fetch Razorpay payment
const fetchRazorpayPayment = async (razorpayPaymentId) => {
  if (!razorpayPaymentId) {
    throw new Error("Razorpay payment ID is required");
  }

  return razorpay.payments.fetch(razorpayPaymentId);
};

// Verify payment signature
const verifyRazorpayPayment = ({
  razorpayOrderId,
  razorpayPaymentId,
  razorpaySignature,
}) => {
  if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
    return false;
  }

  const body = `${razorpayOrderId}|${razorpayPaymentId}`;

  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(body)
    .digest("hex");

  return crypto.timingSafeEqual(
    Buffer.from(expectedSignature),
    Buffer.from(razorpaySignature),
  );
};

// Verify webhook signature
const verifyRazorpayWebhook = (rawBody, signature) => {
  if (!rawBody || !signature) {
    return false;
  }

  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET)
    .update(rawBody)
    .digest("hex");

  if (expectedSignature.length !== signature.length) {
    return false;
  }

  return crypto.timingSafeEqual(
    Buffer.from(expectedSignature),
    Buffer.from(signature),
  );
};

// Verify payment amount
const verifyPaymentAmount = ({
  payment,
  expectedAmount,
  expectedCurrency = "INR",
}) => {
  if (!payment) {
    return false;
  }

  const paymentAmount = Number(payment.amount);

  const paymentCurrency = String(payment.currency || "").toUpperCase();

  return (
    paymentAmount === Number(expectedAmount) &&
    paymentCurrency === expectedCurrency.toUpperCase()
  );
};

// Check successful payment
const isPaymentSuccessful = (payment) => {
  return payment?.status === "captured" || payment?.status === "authorized";
};

// Create Razorpay refund
const createRazorpayRefund = async ({ paymentId, amount, notes = {} }) => {
  if (!paymentId) {
    throw new Error("Payment ID is required");
  }

  const refundAmount = amount !== undefined ? Number(amount) : undefined;

  if (
    refundAmount !== undefined &&
    (!Number.isInteger(refundAmount) || refundAmount <= 0)
  ) {
    throw new Error("Invalid refund amount");
  }

  const payload = {
    notes,
  };

  if (refundAmount !== undefined) {
    payload.amount = refundAmount;
  }

  const refund = await razorpay.payments.refund(paymentId, payload);

  if (!refund?.id) {
    throw new Error("Razorpay refund failed");
  }

  return refund;
};

// Fetch Razorpay refund
const fetchRazorpayRefund = async (paymentId, refundId) => {
  if (!paymentId || !refundId) {
    throw new Error("Payment ID and refund ID are required");
  }

  return razorpay.payments.fetchRefund(paymentId, refundId);
};

export {
  createRazorpayOrder,
  fetchRazorpayOrder,
  fetchRazorpayPayment,
  verifyRazorpayPayment,
  verifyRazorpayWebhook,
  verifyPaymentAmount,
  isPaymentSuccessful,
  createRazorpayRefund,
  fetchRazorpayRefund,
};
