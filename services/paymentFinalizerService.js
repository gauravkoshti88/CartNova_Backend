import mongoose from "mongoose";

import PaymentIntent from "../models/paymentIntentSchema.js";
import Order from "../models/orderItemSchema.js";
import Cart from "../models/user/cartItemSchema.js";
import Product from "../models/productSchema.js";

// Generate order number
const generateOrderNumber = () => {
  const timestamp = Date.now().toString().slice(-8);
  const random = Math.floor(1000 + Math.random() * 9000);

  return `CN-${timestamp}-${random}`;
};

// Normalize attributes
const normalizeAttributes = (attributes) => {
  if (attributes instanceof Map) {
    return Object.fromEntries(attributes);
  }

  if (attributes && typeof attributes === "object") {
    return attributes;
  }

  return {};
};

// Convert rupees to paise
const toPaise = (amount) => {
  return Math.round(Number(amount || 0) * 100);
};

// Build order items and calculate current cart subtotal
const buildOrderItems = async (cart, session) => {
  const orderItems = [];
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

    const mrp = Number(variant.mrp) || 0;
    const price = Number(variant.salePrice) || 0;

    if (price <= 0) {
      throw new Error(`Invalid price for ${product.basicInfo.productName}`);
    }

    const total = price * quantity;

    subtotal += total;

    orderItems.push({
      product: product._id,
      variantId: variant.id,
      productName: product.basicInfo.productName,
      sku: variant.sku || "",

      image: {
        publicId: variant.image?.publicId || "",
        url: variant.image?.url || "",
        alt: variant.image?.alt || "",
      },

      attributes: normalizeAttributes(variant.attributes),

      mrp,
      price,
      quantity,
      total,
    });
  }

  return {
    orderItems,
    subtotal,
  };
};

// Finalize paid payment
export const finalizePayment = async ({
  paymentIntentId = null,
  razorpayOrderId,
  razorpayPaymentId,
  fromWebhook = false,
}) => {
  if (!razorpayOrderId) {
    throw new Error("Razorpay order ID is required");
  }

  if (!razorpayPaymentId) {
    throw new Error("Razorpay payment ID is required");
  }

  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    let paymentIntent;

    if (paymentIntentId) {
      if (!mongoose.Types.ObjectId.isValid(paymentIntentId)) {
        throw new Error("Invalid payment intent ID");
      }

      paymentIntent = await PaymentIntent.findOne({
        _id: paymentIntentId,
        razorpayOrderId,
      }).session(session);
    } else {
      paymentIntent = await PaymentIntent.findOne({
        razorpayOrderId,
      }).session(session);
    }

    if (!paymentIntent) {
      throw new Error("Payment intent not found for Razorpay order");
    }

    if (
      paymentIntent.razorpayPaymentId &&
      paymentIntent.razorpayPaymentId !== razorpayPaymentId
    ) {
      throw new Error("Payment ID does not match payment intent");
    }

    const existingOrder = await Order.findOne({
      paymentIntent: paymentIntent._id,
    }).session(session);

    if (existingOrder) {
      if (
        paymentIntent.status !== "paid" ||
        paymentIntent.razorpayPaymentId !== razorpayPaymentId
      ) {
        paymentIntent.status = "paid";
        paymentIntent.razorpayPaymentId = razorpayPaymentId;
        paymentIntent.signatureVerified = true;
        if (fromWebhook) {
          paymentIntent.webhookVerified = true;
        }
        paymentIntent.paymentCaptured = true;
        paymentIntent.paidAt = paymentIntent.paidAt || new Date();
        paymentIntent.order = existingOrder._id;

        await paymentIntent.save({ session });
      }

      await session.commitTransaction();

      return {
        order: existingOrder,
        paymentIntent,
        alreadyFinalized: true,
      };
    }

    if (["failed", "cancelled", "expired"].includes(paymentIntent.status)) {
      throw new Error(`Payment intent is ${paymentIntent.status}`);
    }

    if (["refunded", "partially_refunded"].includes(paymentIntent.status)) {
      throw new Error("Refunded payment cannot create an order");
    }

    if (!paymentIntent.razorpayOrderId) {
      throw new Error("Razorpay order is not attached to payment intent");
    }

    const cart = await Cart.findOne({
      user: paymentIntent.user,
    }).session(session);

    if (!cart || !cart.items?.length) {
      throw new Error("Cart is empty");
    }

    const { orderItems, subtotal: currentSubtotal } = await buildOrderItems(
      cart,
      session,
    );

    // Values saved when payment intent was created
    const intentSubtotal = Number(paymentIntent.subtotal) || 0;

    const discount = Number(paymentIntent.discount) || 0;

    const shippingCharge = Number(paymentIntent.shippingCharge) || 0;

    const tax = Number(paymentIntent.tax) || 0;

    const paymentIntentAmount = Number(paymentIntent.amount) || 0;

    if (paymentIntentAmount <= 0) {
      throw new Error("Invalid payment intent amount");
    }

    if (intentSubtotal <= 0) {
      throw new Error("Invalid payment intent subtotal");
    }

    // Compare current cart subtotal with payment intent subtotal
    const intentSubtotalPaise = toPaise(intentSubtotal);

    const currentSubtotalPaise = toPaise(currentSubtotal);

    if (intentSubtotalPaise !== currentSubtotalPaise) {
      throw new Error(
        `Cart amount has changed after payment: payment=${intentSubtotal}, current=${currentSubtotal}`,
      );
    }

    // Recalculate complete order total
    const calculatedTotal = currentSubtotal - discount + shippingCharge + tax;

    if (calculatedTotal <= 0) {
      throw new Error("Invalid order total");
    }

    const paymentIntentAmountPaise = toPaise(paymentIntentAmount);

    const calculatedTotalPaise = toPaise(calculatedTotal);

    console.log("========== PAYMENT AMOUNT CHECK ==========");
    console.log("PaymentIntent amount:", paymentIntentAmount);
    console.log("Current subtotal:", currentSubtotal);
    console.log("Discount:", discount);
    console.log("Shipping:", shippingCharge);
    console.log("Tax:", tax);
    console.log("Calculated total:", calculatedTotal);
    console.log("PaymentIntent amount paise:", paymentIntentAmountPaise);
    console.log("Calculated total paise:", calculatedTotalPaise);
    console.log("===========================================");

    if (paymentIntentAmountPaise !== calculatedTotalPaise) {
      throw new Error(
        `Payment amount does not match order amount: payment=${paymentIntentAmount}, order=${calculatedTotal}`,
      );
    }

    // Reduce inventory
    for (const cartItem of cart.items) {
      const product = await Product.findById(cartItem.product).session(session);

      if (!product) {
        throw new Error("Product not found");
      }

      const variant = product.variants?.find(
        (item) => item.id === cartItem.variantId,
      );

      if (!variant) {
        throw new Error("Product variant not found");
      }

      if (
        product.inventory?.trackInventory &&
        !product.inventory?.allowBackorder
      ) {
        const quantity = Number(cartItem.quantity);

        const result = await Product.updateOne(
          {
            _id: product._id,
            "variants.id": cartItem.variantId,
            "variants.stock": {
              $gte: quantity,
            },
          },
          {
            $inc: {
              "variants.$.stock": -quantity,
            },
          },
          {
            session,
          },
        );

        if (result.modifiedCount !== 1) {
          throw new Error(
            `Insufficient stock for ${product.basicInfo.productName}`,
          );
        }
      }
    }

    const now = new Date();

    const orderData = {
      user: paymentIntent.user,

      orderNumber: generateOrderNumber(),

      idempotencyKey: paymentIntent.idempotencyKey,

      paymentIntent: paymentIntent._id,

      items: orderItems,

      shippingAddress: paymentIntent.shippingAddress,

      subtotal: currentSubtotal,

      discount,

      shippingCharge,

      tax,

      totalAmount: paymentIntentAmount,

      currency: paymentIntent.currency || "INR",

      paymentMethod: "online",

      paymentStatus: "paid",

      orderStatus: "confirmed",

      payment: {
        provider: "razorpay",

        razorpayOrderId,

        razorpayPaymentId,

        paymentIntentId: paymentIntent._id,

        currency: paymentIntent.currency || "INR",

        amount: paymentIntentAmount,

        paidAt: now,
      },

      inventoryStatus: "committed",

      confirmedAt: now,
    };

    const [order] = await Order.create([orderData], {
      session,
    });

    if (!order) {
      throw new Error("Order creation failed");
    }

    // Update payment intent
    paymentIntent.status = "paid";

    paymentIntent.razorpayPaymentId = razorpayPaymentId;

    paymentIntent.signatureVerified = true;

    if (fromWebhook) {
      paymentIntent.webhookVerified = true;
    }

    paymentIntent.paymentCaptured = true;

    paymentIntent.paidAt = paymentIntent.paidAt || now;

    paymentIntent.order = order._id;

    await paymentIntent.save({
      session,
    });

    // Clear cart
    cart.items = [];

    await cart.save({
      session,
    });

    await session.commitTransaction();

    return {
      order,
      paymentIntent,
      alreadyFinalized: false,
    };
  } catch (error) {
    await session.abortTransaction();

    if (error?.code === 11000) {
      const existingOrder = await Order.findOne({
        $or: [
          ...(paymentIntentId
            ? [
                {
                  paymentIntent: paymentIntentId,
                },
              ]
            : []),

          {
            "payment.razorpayPaymentId": razorpayPaymentId,
          },
        ],
      });

      if (existingOrder) {
        const paymentIntent = await PaymentIntent.findById(
          existingOrder.paymentIntent,
        );

        return {
          order: existingOrder,
          paymentIntent,
          alreadyFinalized: true,
        };
      }
    }

    console.error("FINALIZE PAYMENT ERROR:", error);

    throw error;
  } finally {
    await session.endSession();
  }
};

// Find order by payment
export const findOrderByPayment = async ({
  razorpayOrderId,
  razorpayPaymentId,
}) => {
  const filter = {
    "payment.razorpayOrderId": razorpayOrderId,
  };

  if (razorpayPaymentId) {
    filter["payment.razorpayPaymentId"] = razorpayPaymentId;
  }

  return Order.findOne(filter).lean();
};

export default {
  finalizePayment,
  findOrderByPayment,
};
