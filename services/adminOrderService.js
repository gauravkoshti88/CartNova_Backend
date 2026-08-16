import mongoose from "mongoose";
import Order from "../models/orderItemSchema.js";
import Product from "../models/productSchema.js";

const VALID_ORDER_STATUSES = [
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "out_for_delivery",
  "delivered",
  "cancelled",
  "returned",
];

const VALID_PAYMENT_STATUSES = [
  "pending",
  "paid",
  "failed",
  "refunded",
  "partially_refunded",
];

const VALID_PAYMENT_METHODS = ["cod", "online"];

// ==================================================
// STATUS TRANSITIONS
// ==================================================

const ALLOWED_TRANSITIONS = {
  pending: ["confirmed", "cancelled"],

  confirmed: ["processing", "cancelled"],

  processing: ["shipped", "cancelled"],

  shipped: ["out_for_delivery"],

  out_for_delivery: ["delivered"],

  delivered: ["returned"],

  cancelled: [],

  returned: [],
};

// ==================================================
// HELPERS
// ==================================================

const validateOrderId = (orderId) => {
  if (!mongoose.Types.ObjectId.isValid(orderId)) {
    throw new Error("Invalid order ID");
  }
};

const restoreOrderStock = async (order, session) => {
  for (const item of order.items) {
    if (!item.product) {
      continue;
    }

    const product = await Product.findById(item.product).session(session);

    if (!product) {
      continue;
    }

    // Inventory tracking disabled
    if (!product.inventory?.trackInventory) {
      continue;
    }

    const variant = product.variants.find(
      (variantItem) => variantItem.id === item.variantId,
    );

    if (!variant) {
      continue;
    }

    variant.stock = Number(variant.stock || 0) + Number(item.quantity || 0);

    await Product.updateOne(
      {
        _id: product._id,
        "variants.id": item.variantId,
      },
      {
        $set: {
          "variants.$.stock": variant.stock,
        },
      },
      {
        session,
      },
    );
  }
};

// ==================================================
// GET ADMIN ORDERS
// ==================================================

const getAdminOrders = async ({
  page = 1,
  limit = 20,
  status,
  paymentStatus,
  paymentMethod,
  search,
}) => {
  const currentPage = Math.max(Number(page) || 1, 1);

  const currentLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);

  const skip = (currentPage - 1) * currentLimit;

  const filter = {};

  // -----------------------------------------------
  // ORDER STATUS
  // -----------------------------------------------

  if (status) {
    if (!VALID_ORDER_STATUSES.includes(status)) {
      throw new Error("Invalid order status");
    }

    filter.orderStatus = status;
  }

  // -----------------------------------------------
  // PAYMENT STATUS
  // -----------------------------------------------

  if (paymentStatus) {
    if (!VALID_PAYMENT_STATUSES.includes(paymentStatus)) {
      throw new Error("Invalid payment status");
    }

    filter.paymentStatus = paymentStatus;
  }

  // -----------------------------------------------
  // PAYMENT METHOD
  // -----------------------------------------------

  if (paymentMethod) {
    if (!VALID_PAYMENT_METHODS.includes(paymentMethod)) {
      throw new Error("Invalid payment method");
    }

    filter.paymentMethod = paymentMethod;
  }

  // -----------------------------------------------
  // SEARCH
  // -----------------------------------------------

  if (search?.trim()) {
    const searchValue = search.trim();

    filter.$or = [
      {
        orderNumber: {
          $regex: searchValue,
          $options: "i",
        },
      },

      {
        "shippingAddress.name": {
          $regex: searchValue,
          $options: "i",
        },
      },

      {
        "shippingAddress.phone": {
          $regex: searchValue,
          $options: "i",
        },
      },
    ];
  }

  const [orders, totalOrders] = await Promise.all([
    Order.find(filter)
      .populate("user", "firstName lastName email phone")
      .sort({
        createdAt: -1,
      })
      .skip(skip)
      .limit(currentLimit)
      .lean(),

    Order.countDocuments(filter),
  ]);

  const totalPages =
    totalOrders === 0 ? 0 : Math.ceil(totalOrders / currentLimit);

  return {
    orders,

    pagination: {
      currentPage,
      limit: currentLimit,
      totalOrders,
      totalPages,

      hasNextPage: currentPage < totalPages,

      hasPreviousPage: currentPage > 1,
    },
  };
};

// ==================================================
// GET ADMIN ORDER BY ID
// ==================================================

const getAdminOrderById = async (orderId) => {
  validateOrderId(orderId);

  const order = await Order.findById(orderId)
    .populate("user", "firstName lastName email phone")
    .lean();

  if (!order) {
    throw new Error("Order not found");
  }

  return order;
};

// ==================================================
// UPDATE ORDER STATUS
// ==================================================

const updateAdminOrderStatus = async (orderId, orderStatus) => {
  validateOrderId(orderId);

  if (!VALID_ORDER_STATUSES.includes(orderStatus)) {
    throw new Error("Invalid order status");
  }

  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const order = await Order.findById(orderId).session(session);

    if (!order) {
      throw new Error("Order not found");
    }

    const currentStatus = order.orderStatus;

    // -----------------------------------------------
    // SAME STATUS
    // -----------------------------------------------

    if (currentStatus === orderStatus) {
      throw new Error(`Order is already ${orderStatus}`);
    }

    // -----------------------------------------------
    // FINAL STATES
    // -----------------------------------------------

    if (["cancelled", "returned"].includes(currentStatus)) {
      throw new Error(`Cannot update status of a ${currentStatus} order`);
    }

    // -----------------------------------------------
    // ALLOWED TRANSITION
    // -----------------------------------------------

    const allowedNextStatuses = ALLOWED_TRANSITIONS[currentStatus] || [];

    if (!allowedNextStatuses.includes(orderStatus)) {
      throw new Error(
        `Cannot change order status from ${currentStatus} to ${orderStatus}`,
      );
    }

    // ==================================================
    // CANCEL ORDER
    // ==================================================

    if (orderStatus === "cancelled") {
      await restoreOrderStock(order, session);

      order.cancellation = {
        reason: "Cancelled by admin",

        cancelledAt: new Date(),

        cancelledBy: "admin",
      };
    }

    // ==================================================
    // SHIPPED
    // ==================================================

    if (orderStatus === "shipped") {
      order.shippedAt = new Date();
    }

    // ==================================================
    // DELIVERED
    // ==================================================

    if (orderStatus === "delivered") {
      order.deliveredAt = new Date();
    }

    // ==================================================
    // RETURNED
    // ==================================================

    if (orderStatus === "returned") {
      // Keep returned order status.
      // Stock restoration can be handled
      // separately after physical return
      // confirmation.
    }

    // ==================================================
    // SAVE
    // ==================================================

    order.orderStatus = orderStatus;

    await order.save({
      session,
    });

    await session.commitTransaction();

    return order;
  } catch (error) {
    await session.abortTransaction();

    throw error;
  } finally {
    await session.endSession();
  }
};

// ==================================================
// UPDATE TRACKING
// ==================================================

const updateOrderTracking = async (
  orderId,
  { courierName = "", trackingNumber = "", trackingUrl = "" },
) => {
  validateOrderId(orderId);

  const order = await Order.findById(orderId);

  if (!order) {
    throw new Error("Order not found");
  }

  // -----------------------------------------------
  // FINAL ORDER CHECK
  // -----------------------------------------------

  if (["cancelled", "returned"].includes(order.orderStatus)) {
    throw new Error(`Cannot update tracking for ${order.orderStatus} order`);
  }

  // -----------------------------------------------
  // TRACKING DATA
  // -----------------------------------------------

  order.tracking = {
    courierName: String(courierName).trim(),

    trackingNumber: String(trackingNumber).trim(),

    trackingUrl: String(trackingUrl).trim(),
  };

  await order.save();

  return order;
};

export {
  getAdminOrders,
  getAdminOrderById,
  updateAdminOrderStatus,
  updateOrderTracking,
};
