import mongoose from "mongoose";

import PaymentIntent from "../models/paymentIntentSchema.js";
import Cart from "../models/user/cartItemSchema.js";
import Product from "../models/productSchema.js";

const generateIntentKey = () => {
  return `pi_${new mongoose.Types.ObjectId().toString()}`;
};

const generateIdempotencyKey = () => {
  return new mongoose.Types.ObjectId().toString();
};

const toPaise = (amount) => {
  return Math.round(Number(amount || 0) * 100);
};

// Calculate cart amount
const calculateCartAmount = async (userId, session) => {
  const cart = await Cart.findOne({
    user: userId,
  }).session(session);

  if (!cart || !cart.items?.length) {
    throw new Error("Your cart is empty");
  }

  let subtotal = 0;

  for (const cartItem of cart.items) {
    const product = await Product.findById(cartItem.product)
      .select(
        "basicInfo.productName publish.status publish.visibility variants inventory",
      )
      .session(session);

    if (!product) {
      throw new Error("Product not found");
    }

    if (product.publish?.status !== "published") {
      throw new Error(
        `${product.basicInfo.productName} is no longer available`,
      );
    }

    if (product.publish?.visibility !== "public") {
      throw new Error(`${product.basicInfo.productName} is not available`);
    }

    const variant = product.variants?.find(
      (item) => item.id === cartItem.variantId,
    );

    if (!variant) {
      throw new Error(
        `Selected variant is no longer available for ${product.basicInfo.productName}`,
      );
    }

    const quantity = Number(cartItem.quantity);

    if (!Number.isInteger(quantity) || quantity < 1) {
      throw new Error(`Invalid quantity for ${product.basicInfo.productName}`);
    }

    const minOrderQty = Number(product.inventory?.minOrderQty) || 1;

    const maxOrderQty = Number(product.inventory?.maxOrderQty) || Infinity;

    if (quantity < minOrderQty) {
      throw new Error(
        `${product.basicInfo.productName} minimum order quantity is ${minOrderQty}`,
      );
    }

    if (quantity > maxOrderQty) {
      throw new Error(
        `${product.basicInfo.productName} maximum order quantity is ${maxOrderQty}`,
      );
    }

    if (product.inventory?.trackInventory) {
      const stock = Number(variant.stock) || 0;

      if (stock < quantity && !product.inventory?.allowBackorder) {
        throw new Error(
          `Only ${stock} item(s) available for ${product.basicInfo.productName}`,
        );
      }
    }

    const price = Number(variant.salePrice) || 0;

    if (price <= 0) {
      throw new Error(`Invalid price for ${product.basicInfo.productName}`);
    }

    subtotal += price * quantity;
  }

  const discount = 0;

  const shippingCharge = subtotal > 999 || subtotal === 0 ? 0 : 79;

  const tax = 0;

  const totalAmount = subtotal - discount + shippingCharge + tax;

  if (totalAmount <= 0) {
    throw new Error("Invalid order total");
  }

  return {
    subtotal,
    discount,
    shippingCharge,
    tax,
    totalAmount,
    currency: "INR",
  };
};

// Create payment intent
export const createPaymentIntent = async ({
  userId,
  shippingAddress,
  paymentMethod,
  idempotencyKey,
}) => {
  if (!userId) {
    throw new Error("User authentication required");
  }

  if (!["cod", "online"].includes(paymentMethod)) {
    throw new Error("Invalid payment method");
  }

  if (
    !shippingAddress ||
    !shippingAddress.name ||
    !shippingAddress.phone ||
    !shippingAddress.addressLine1 ||
    !shippingAddress.city ||
    !shippingAddress.state ||
    !shippingAddress.pincode
  ) {
    throw new Error("Complete shipping address is required");
  }

  const key = idempotencyKey?.trim() || generateIdempotencyKey();

  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const existingIntent = await PaymentIntent.findOne({
      user: userId,
      idempotencyKey: key,
    }).session(session);

    if (existingIntent) {
      const now = new Date();

      const isExpired =
        existingIntent.expiresAt && existingIntent.expiresAt <= now;

      if (existingIntent.status === "paid") {
        await session.commitTransaction();

        return existingIntent;
      }

      if (existingIntent.status === "payment_pending" && !isExpired) {
        await session.commitTransaction();

        return existingIntent;
      }

      if (existingIntent.status === "authorized" && !isExpired) {
        await session.commitTransaction();

        return existingIntent;
      }

      if (
        ["failed", "cancelled", "expired"].includes(existingIntent.status) ||
        isExpired
      ) {
        await PaymentIntent.deleteOne({
          _id: existingIntent._id,
        }).session(session);
      } else {
        await session.commitTransaction();

        return existingIntent;
      }
    }

    const pricing = await calculateCartAmount(userId, session);

    console.log("PAYMENT INTENT PRICING:", {
      subtotal: pricing.subtotal,
      discount: pricing.discount,
      shippingCharge: pricing.shippingCharge,
      tax: pricing.tax,
      totalAmount: pricing.totalAmount,
      currency: pricing.currency,
    });

    const expectedTotal =
      pricing.subtotal -
      pricing.discount +
      pricing.shippingCharge +
      pricing.tax;

    if (toPaise(expectedTotal) !== toPaise(pricing.totalAmount)) {
      throw new Error("Payment pricing calculation mismatch");
    }

    const intentKey = generateIntentKey();

    const paymentIntentData = {
      user: userId,

      intentKey,

      idempotencyKey: key,

      paymentMethod,

      amount: pricing.totalAmount,

      currency: pricing.currency,

      subtotal: pricing.subtotal,

      discount: pricing.discount,

      shippingCharge: pricing.shippingCharge,

      tax: pricing.tax,

      shippingAddress,

      status: paymentMethod === "online" ? "payment_pending" : "created",

      razorpayOrderId: "",

      razorpayPaymentId: "",

      signatureVerified: false,

      webhookVerified: false,

      paymentCaptured: false,

      paidAt: null,

      failedAt: null,

      cancelledAt: null,

      expiresAt: new Date(Date.now() + 30 * 60 * 1000),
    };

    const [paymentIntent] = await PaymentIntent.create([paymentIntentData], {
      session,
    });

    if (!paymentIntent) {
      throw new Error("Payment intent creation failed");
    }

    await session.commitTransaction();

    return paymentIntent;
  } catch (error) {
    await session.abortTransaction();

    if (error?.code === 11000) {
      const existingIntent = await PaymentIntent.findOne({
        user: userId,
        idempotencyKey: key,
      });

      if (existingIntent) {
        return existingIntent;
      }
    }

    throw error;
  } finally {
    await session.endSession();
  }
};

// Attach Razorpay order
export const attachRazorpayOrder = async ({
  userId,
  paymentIntentId,
  razorpayOrderId,
}) => {
  if (!mongoose.Types.ObjectId.isValid(paymentIntentId)) {
    throw new Error("Invalid payment intent ID");
  }

  if (!razorpayOrderId) {
    throw new Error("Razorpay order ID is required");
  }

  const paymentIntent = await PaymentIntent.findOne({
    _id: paymentIntentId,
    user: userId,
  });

  if (!paymentIntent) {
    throw new Error("Payment intent not found");
  }

  if (paymentIntent.status === "paid") {
    throw new Error("Payment is already completed");
  }

  if (["cancelled", "failed", "expired"].includes(paymentIntent.status)) {
    throw new Error(`Payment intent is ${paymentIntent.status}`);
  }

  if (paymentIntent.expiresAt && paymentIntent.expiresAt <= new Date()) {
    paymentIntent.status = "expired";

    await paymentIntent.save();

    throw new Error("Payment intent has expired");
  }

  if (paymentIntent.razorpayOrderId) {
    if (paymentIntent.razorpayOrderId === razorpayOrderId) {
      return paymentIntent;
    }

    throw new Error("Payment intent already has another Razorpay order");
  }

  paymentIntent.razorpayOrderId = razorpayOrderId;

  if (paymentIntent.status === "created") {
    paymentIntent.status = "payment_pending";
  }

  await paymentIntent.save();

  return paymentIntent;
};

// Get payment intent
export const getPaymentIntent = async (userId, paymentIntentId) => {
  if (!mongoose.Types.ObjectId.isValid(paymentIntentId)) {
    throw new Error("Invalid payment intent ID");
  }

  const paymentIntent = await PaymentIntent.findOne({
    _id: paymentIntentId,
    user: userId,
  }).lean();

  if (!paymentIntent) {
    throw new Error("Payment intent not found");
  }

  return paymentIntent;
};

// Attach Razorpay payment
export const attachRazorpayPayment = async ({
  userId,
  paymentIntentId,
  razorpayPaymentId,
}) => {
  if (!mongoose.Types.ObjectId.isValid(paymentIntentId)) {
    throw new Error("Invalid payment intent ID");
  }

  if (!razorpayPaymentId) {
    throw new Error("Razorpay payment ID is required");
  }

  const paymentIntent = await PaymentIntent.findOne({
    _id: paymentIntentId,
    user: userId,
  });

  if (!paymentIntent) {
    throw new Error("Payment intent not found");
  }

  if (
    paymentIntent.razorpayPaymentId &&
    paymentIntent.razorpayPaymentId !== razorpayPaymentId
  ) {
    throw new Error("Payment intent already has another payment ID");
  }

  paymentIntent.razorpayPaymentId = razorpayPaymentId;

  await paymentIntent.save();

  return paymentIntent;
};

// Mark payment authorized
export const markPaymentAuthorized = async ({
  razorpayOrderId,
  razorpayPaymentId,
}) => {
  if (!razorpayOrderId || !razorpayPaymentId) {
    throw new Error("Razorpay order and payment IDs are required");
  }

  const paymentIntent = await PaymentIntent.findOne({
    razorpayOrderId,
  });

  if (!paymentIntent) {
    throw new Error("Payment intent not found");
  }

  if (paymentIntent.status === "paid") {
    return paymentIntent;
  }

  if (["cancelled", "failed", "expired"].includes(paymentIntent.status)) {
    throw new Error(`Payment intent is ${paymentIntent.status}`);
  }

  paymentIntent.razorpayPaymentId = razorpayPaymentId;

  paymentIntent.status = "authorized";

  await paymentIntent.save();

  return paymentIntent;
};

// Mark payment paid
export const markPaymentPaid = async ({
  razorpayOrderId,
  razorpayPaymentId,
}) => {
  if (!razorpayOrderId || !razorpayPaymentId) {
    throw new Error("Razorpay payment IDs are required");
  }

  const paymentIntent = await PaymentIntent.findOne({
    razorpayOrderId,
  });

  if (!paymentIntent) {
    throw new Error("Payment intent not found");
  }

  if (paymentIntent.status === "paid") {
    return paymentIntent;
  }

  if (["cancelled", "failed", "expired"].includes(paymentIntent.status)) {
    throw new Error(`Payment intent is ${paymentIntent.status}`);
  }

  paymentIntent.razorpayPaymentId = razorpayPaymentId;

  paymentIntent.status = "paid";

  paymentIntent.paymentCaptured = true;

  paymentIntent.paidAt = paymentIntent.paidAt || new Date();

  await paymentIntent.save();

  return paymentIntent;
};

// Mark payment failed
export const markPaymentFailed = async ({
  razorpayOrderId,
  razorpayPaymentId = "",
  reason = "",
}) => {
  if (!razorpayOrderId) {
    throw new Error("Razorpay order ID is required");
  }

  const paymentIntent = await PaymentIntent.findOne({
    razorpayOrderId,
  });

  if (!paymentIntent) {
    throw new Error("Payment intent not found");
  }

  if (paymentIntent.status === "paid") {
    return paymentIntent;
  }

  if (razorpayPaymentId) {
    paymentIntent.razorpayPaymentId = razorpayPaymentId;
  }

  paymentIntent.status = "failed";

  paymentIntent.failureReason = reason;

  paymentIntent.failedAt = new Date();

  await paymentIntent.save();

  return paymentIntent;
};

// Cancel payment intent
export const cancelPaymentIntent = async ({ userId, paymentIntentId }) => {
  if (!mongoose.Types.ObjectId.isValid(paymentIntentId)) {
    throw new Error("Invalid payment intent ID");
  }

  const paymentIntent = await PaymentIntent.findOne({
    _id: paymentIntentId,
    user: userId,
  });

  if (!paymentIntent) {
    throw new Error("Payment intent not found");
  }

  if (paymentIntent.status === "paid") {
    throw new Error("Paid payment cannot be cancelled");
  }

  if (["cancelled", "failed"].includes(paymentIntent.status)) {
    return paymentIntent;
  }

  paymentIntent.status = "cancelled";

  paymentIntent.cancelledAt = new Date();

  await paymentIntent.save();

  return paymentIntent;
};

export default {
  createPaymentIntent,
  attachRazorpayOrder,
  getPaymentIntent,
  attachRazorpayPayment,
  markPaymentAuthorized,
  markPaymentPaid,
  markPaymentFailed,
  cancelPaymentIntent,
};
