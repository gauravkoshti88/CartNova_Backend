import mongoose from "mongoose";

import Order from "../models/orderItemSchema.js";
import Cart from "../models/user/cartItemSchema.js";
import Product from "../models/productSchema.js";

// Generate order number
const generateOrderNumber = () => {
  const timestamp = Date.now().toString().slice(-8);
  const random = Math.floor(1000 + Math.random() * 9000);

  return `GS-${timestamp}-${random}`;
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

// Build order items
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

    if (
      product.inventory?.trackInventory &&
      !product.inventory?.allowBackorder
    ) {
      const stock = Number(variant.stock) || 0;

      if (stock < quantity) {
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

// Reduce product inventory
const reduceInventory = async (cart, session) => {
  for (const cartItem of cart.items) {
    const product = await Product.findById(cartItem.product)
      .select("basicInfo.productName inventory variants")
      .session(session);

    if (!product) {
      throw new Error("Product not found");
    }

    const quantity = Number(cartItem.quantity);

    if (
      product.inventory?.trackInventory &&
      !product.inventory?.allowBackorder
    ) {
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
};

// Create COD order
export const createOrder = async ({
  userId,
  shippingAddress,
  paymentMethod,
  idempotencyKey,
}) => {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new Error("Invalid user ID");
  }

  if (paymentMethod !== "cod") {
    throw new Error("Only COD orders are supported");
  }

  if (!idempotencyKey) {
    throw new Error("Idempotency key is required");
  }

  const existingOrder = await Order.findOne({
    user: userId,
    idempotencyKey,
  });

  if (existingOrder) {
    return existingOrder;
  }

  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const duplicateOrder = await Order.findOne({
      user: userId,
      idempotencyKey,
    }).session(session);

    if (duplicateOrder) {
      await session.commitTransaction();
      return duplicateOrder;
    }

    const cart = await Cart.findOne({
      user: userId,
    }).session(session);

    if (!cart || !cart.items?.length) {
      throw new Error("Cart is empty");
    }

    const { orderItems, subtotal } = await buildOrderItems(cart, session);

    const discount = 0;
    const shippingCharge = subtotal > 999 ? 0 : 79;
    const tax = 0;

    const totalAmount = subtotal - discount + shippingCharge + tax;

    if (totalAmount <= 0) {
      throw new Error("Invalid order total");
    }

    await reduceInventory(cart, session);

    const now = new Date();

    const orderData = {
      user: userId,
      orderNumber: generateOrderNumber(),
      idempotencyKey,
      paymentIntent: null,
      items: orderItems,
      shippingAddress,
      subtotal,
      discount,
      shippingCharge,
      tax,
      totalAmount,
      currency: "INR",
      paymentMethod: "cod",
      paymentStatus: "pending",
      orderStatus: "confirmed",
      payment: {
        provider: "",
        currency: "INR",
        amount: totalAmount,
      },
      inventoryStatus: "committed",
      confirmedAt: now,
    };

    const [order] = await Order.create([orderData], { session });

    if (!order) {
      throw new Error("Order creation failed");
    }

    cart.items = [];

    await cart.save({
      session,
    });

    await session.commitTransaction();

    return order;
  } catch (error) {
    await session.abortTransaction();

    if (error?.code === 11000) {
      const duplicateOrder = await Order.findOne({
        user: userId,
        idempotencyKey,
      });

      if (duplicateOrder) {
        return duplicateOrder;
      }
    }

    console.error("CREATE COD ORDER SERVICE ERROR:", error);

    throw error;
  } finally {
    await session.endSession();
  }
};

// Get user's orders
export const getMyOrders = async (userId, { page = 1, limit = 10 } = {}) => {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new Error("Invalid user ID");
  }

  const currentPage = Math.max(Number(page) || 1, 1);

  const perPage = Math.min(Math.max(Number(limit) || 10, 1), 50);

  const skip = (currentPage - 1) * perPage;

  const filter = {
    user: userId,
  };

  const [orders, totalOrders] = await Promise.all([
    Order.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(perPage)
      .populate({
        path: "items.product",
        select: "basicInfo variants media",
      })
      .lean(),

    Order.countDocuments(filter),
  ]);

  return {
    orders,
    pagination: {
      currentPage,
      limit: perPage,
      totalOrders,
      totalPages: Math.ceil(totalOrders / perPage),
      hasNextPage: currentPage < Math.ceil(totalOrders / perPage),
      hasPreviousPage: currentPage > 1,
    },
  };
};

// Get user's order by ID
export const getMyOrderById = async (userId, orderId) => {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new Error("Invalid user ID");
  }

  if (!mongoose.Types.ObjectId.isValid(orderId)) {
    throw new Error("Invalid order ID");
  }

  const order = await Order.findOne({
    _id: orderId,
    user: userId,
  })
    .populate({
      path: "items.product",
      select: "basicInfo variants media",
    })
    .lean();

  if (!order) {
    throw new Error("Order not found");
  }

  return order;
};

// Cancel user's order
export const cancelMyOrder = async (userId, orderId, reason = "") => {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new Error("Invalid user ID");
  }

  if (!mongoose.Types.ObjectId.isValid(orderId)) {
    throw new Error("Invalid order ID");
  }

  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const order = await Order.findOne({
      _id: orderId,
      user: userId,
    }).session(session);

    if (!order) {
      throw new Error("Order not found");
    }

    if (
      ["shipped", "out_for_delivery", "delivered"].includes(order.orderStatus)
    ) {
      throw new Error("This order cannot be cancelled");
    }

    if (order.orderStatus === "cancelled") {
      throw new Error("Order is already cancelled");
    }

    for (const item of order.items) {
      const product = await Product.findById(item.product)
        .select("inventory variants")
        .session(session);

      if (!product) {
        continue;
      }

      if (product.inventory?.trackInventory) {
        await Product.updateOne(
          {
            _id: product._id,
            "variants.id": item.variantId,
          },
          {
            $inc: {
              "variants.$.stock": item.quantity,
            },
          },
          {
            session,
          },
        );
      }
    }

    const now = new Date();

    order.orderStatus = "cancelled";
    order.inventoryStatus = "released";
    order.cancelledAt = now;

    order.cancellation = {
      reason: reason.trim(),
      cancelledAt: now,
      cancelledBy: "user",
    };

    await order.save({
      session,
    });

    await session.commitTransaction();

    return order;
  } catch (error) {
    await session.abortTransaction();

    console.error("CANCEL ORDER SERVICE ERROR:", error);

    throw error;
  } finally {
    await session.endSession();
  }
};

export default {
  createOrder,
  getMyOrders,
  getMyOrderById,
  cancelMyOrder,
};
