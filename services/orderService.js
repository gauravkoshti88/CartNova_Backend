import mongoose from "mongoose";
import Cart from "../models/user/cartItemSchema.js";
import Product from "../models/productSchema.js";
import Order from "../models/orderItemSchema.js";

const generateOrderNumber = () => {
  const timestamp = Date.now().toString().slice(-8);
  const random = Math.floor(1000 + Math.random() * 9000);

  return `GS-${timestamp}-${random}`;
};

// ==================================================
// CREATE ORDER
// ==================================================

const createOrder = async ({
  userId,
  shippingAddress,
  paymentMethod,
  payment = {},
}) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    // ==================================================
    // 1. GET CART
    // ==================================================

    const cart = await Cart.findOne({
      user: userId,
    }).session(session);

    if (!cart || !cart.items?.length) {
      throw new Error("Your cart is empty");
    }

    // ==================================================
    // 2. PAYMENT METHOD
    // ==================================================

    if (!["cod", "online"].includes(paymentMethod)) {
      throw new Error("Invalid payment method");
    }

    // ==================================================
    // 3. ONLINE PAYMENT VALIDATION
    // ==================================================

    if (paymentMethod === "online") {
      if (!payment?.razorpayOrderId) {
        throw new Error("Razorpay order ID is missing");
      }

      if (!payment?.paymentId) {
        throw new Error("Razorpay payment ID is missing");
      }
    }

    // ==================================================
    // 4. SHIPPING ADDRESS
    // ==================================================

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

    // ==================================================
    // 5. PREPARE ORDER ITEMS
    // ==================================================

    const orderItems = [];

    let subtotal = 0;

    for (const cartItem of cart.items) {
      const product = await Product.findById(cartItem.product)
        .select(
          "basicInfo.productName publish.status publish.visibility variants inventory shipping",
        )
        .session(session);

      if (!product) {
        throw new Error(`Product not found for cart item ${cartItem._id}`);
      }

      // ==================================================
      // PRODUCT AVAILABILITY
      // ==================================================

      if (product.publish?.status !== "published") {
        throw new Error(
          `${product.basicInfo.productName} is no longer available`,
        );
      }

      if (product.publish?.visibility !== "public") {
        throw new Error(`${product.basicInfo.productName} is not available`);
      }

      // ==================================================
      // FIND VARIANT
      // ==================================================

      const variant = product.variants?.find(
        (item) => item.id === cartItem.variantId,
      );

      if (!variant) {
        throw new Error(
          `Selected variant is no longer available for ${product.basicInfo.productName}`,
        );
      }

      // ==================================================
      // QUANTITY
      // ==================================================

      const quantity = Number(cartItem.quantity);

      if (!Number.isInteger(quantity) || quantity < 1) {
        throw new Error(
          `Invalid quantity for ${product.basicInfo.productName}`,
        );
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

      // ==================================================
      // STOCK
      // ==================================================

      if (product.inventory?.trackInventory) {
        const stock = Number(variant.stock) || 0;

        if (stock < quantity && !product.inventory?.allowBackorder) {
          throw new Error(
            `Only ${stock} item(s) available for ${product.basicInfo.productName}`,
          );
        }
      }

      // ==================================================
      // PRICE
      // ==================================================

      const mrp = Number(variant.mrp) || 0;

      const price = Number(variant.salePrice) || 0;

      if (price <= 0) {
        throw new Error(`Invalid price for ${product.basicInfo.productName}`);
      }

      const itemTotal = price * quantity;

      subtotal += itemTotal;

      // ==================================================
      // ATTRIBUTES
      // ==================================================

      let attributes = {};

      if (variant.attributes instanceof Map) {
        attributes = Object.fromEntries(variant.attributes);
      } else if (variant.attributes && typeof variant.attributes === "object") {
        attributes = variant.attributes;
      }

      // ==================================================
      // IMAGE
      // ==================================================

      const image = {
        publicId: variant.image?.publicId || "",
        url: variant.image?.url || "",
      };

      // ==================================================
      // ORDER ITEM
      // ==================================================

      orderItems.push({
        product: product._id,

        variantId: variant.id,

        productName: product.basicInfo.productName,

        sku: variant.sku || "",

        image,

        attributes,

        mrp,

        price,

        quantity,

        total: itemTotal,
      });

      // ==================================================
      // REDUCE STOCK
      // ==================================================

      if (
        product.inventory?.trackInventory &&
        !product.inventory?.allowBackorder
      ) {
        const newStock = Number(variant.stock) - quantity;

        await Product.updateOne(
          {
            _id: product._id,
            "variants.id": variant.id,
          },
          {
            $set: {
              "variants.$.stock": newStock,
            },
          },
          {
            session,
          },
        );
      }
    }

    // ==================================================
    // 6. PRICING
    // ==================================================

    const discount = 0;

    const shippingCharge = 0;

    const tax = 0;

    const totalAmount = subtotal - discount + shippingCharge + tax;

    if (totalAmount <= 0) {
      throw new Error("Invalid order total");
    }

    // ==================================================
    // 7. PAYMENT STATUS
    // ==================================================

    const paymentStatus = paymentMethod === "online" ? "paid" : "pending";

    const orderStatus = paymentMethod === "online" ? "confirmed" : "pending";

    // ==================================================
    // 8. CREATE ORDER
    // ==================================================

    const orderData = {
      user: userId,

      orderNumber: generateOrderNumber(),

      items: orderItems,

      shippingAddress,

      subtotal,

      discount,

      shippingCharge,

      tax,

      totalAmount,

      paymentMethod,

      paymentStatus,

      orderStatus,

      payment: {
        transactionId: payment?.razorpayOrderId || "",

        paymentId: payment?.paymentId || "",

        provider: paymentMethod === "online" ? "razorpay" : "",

        paidAt: paymentMethod === "online" ? new Date() : null,
      },
    };

    const [order] = await Order.create([orderData], {
      session,
    });

    if (!order) {
      throw new Error("Order creation returned empty result");
    }

    // ==================================================
    // 9. CLEAR CART
    // ==================================================

    cart.items = [];

    await cart.save({
      session,
    });

    // ==================================================
    // 10. COMMIT
    // ==================================================

    await session.commitTransaction();

    return order;
  } catch (error) {
    await session.abortTransaction();

    console.error("CREATE ORDER SERVICE ERROR:", error);

    throw error;
  } finally {
    await session.endSession();
  }
};

// ==================================================
// GET USER ORDERS
// ==================================================

const getMyOrders = async (userId, { page = 1, limit = 10 } = {}) => {
  const currentPage = Math.max(Number(page) || 1, 1);

  const currentLimit = Math.min(Math.max(Number(limit) || 10, 1), 50);

  const skip = (currentPage - 1) * currentLimit;

  const filter = {
    user: userId,
  };

  const [orders, totalOrders] = await Promise.all([
    Order.find(filter)
      .populate({
        path: "items.product",
        select: "name media",
      })
      .sort({
        createdAt: -1,
      })
      .skip(skip)
      .limit(currentLimit)
      .lean(),

    Order.countDocuments(filter),
  ]);

  const totalPages = Math.ceil(totalOrders / currentLimit);

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
// GET SINGLE USER ORDER
// ==================================================

const getMyOrderById = async (userId, orderId) => {
  if (!mongoose.Types.ObjectId.isValid(orderId)) {
    throw new Error("Invalid order ID");
  }

  const order = await Order.findOne({
    _id: orderId,
    user: userId,
  })
    .populate({
      path: "items.product",
      select: "name slug brand category media variants",
    })
    .lean();

  if (!order) {
    throw new Error("Order not found");
  }

  return order;
};

// ==================================================
// CANCEL USER ORDER
// ==================================================

const cancelMyOrder = async (userId, orderId, reason = "") => {
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

    // ------------------------------------------------
    // Cancellable statuses
    // ------------------------------------------------

    const cancellableStatuses = ["pending", "confirmed", "processing"];

    if (!cancellableStatuses.includes(order.orderStatus)) {
      throw new Error(
        `Order cannot be cancelled because it is already ${order.orderStatus}`,
      );
    }

    // ------------------------------------------------
    // Restore stock
    // ------------------------------------------------

    for (const item of order.items) {
      const product = await Product.findById(item.product).session(session);

      if (!product) {
        continue;
      }

      const variant = product.variants.find(
        (variantItem) => variantItem.id === item.variantId,
      );

      if (!variant) {
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

    // ------------------------------------------------
    // Update order
    // ------------------------------------------------

    order.orderStatus = "cancelled";

    order.cancellation = {
      reason: reason.trim(),

      cancelledAt: new Date(),

      cancelledBy: "user",
    };

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

export { createOrder, getMyOrders, getMyOrderById, cancelMyOrder };
