import {
  createOrder,
  getMyOrders,
  getMyOrderById,
  cancelMyOrder,
} from "../services/orderService.js";

// Create COD order
export const createOrderController = async (req, res) => {
  try {
    const userId = req.userId;

    const { shippingAddress, paymentMethod, idempotencyKey } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (!shippingAddress) {
      return res.status(400).json({
        success: false,
        message: "Shipping address is required",
      });
    }

    if (paymentMethod !== "cod") {
      return res.status(400).json({
        success: false,
        message: "Only COD orders can be created through this endpoint",
      });
    }

    if (!idempotencyKey) {
      return res.status(400).json({
        success: false,
        message: "Idempotency key is required",
      });
    }

    const order = await createOrder({
      userId,
      shippingAddress,
      paymentMethod: "cod",
      idempotencyKey,
    });

    return res.status(201).json({
      success: true,
      message: "Order placed successfully",
      order,
    });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Duplicate order request",
      });
    }

    return res.status(400).json({
      success: false,
      message: error.message || "Failed to create COD order",
    });
  }
};

// Get logged-in user's orders
export const getMyOrdersController = async (req, res) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const { page = 1, limit = 10 } = req.query;

    const result = await getMyOrders(userId, {
      page,
      limit,
    });

    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message || "Failed to fetch orders",
    });
  }
};

// Get logged-in user's order
export const getMyOrderByIdController = async (req, res) => {
  try {
    const userId = req.userId;
    const { orderId } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (!orderId) {
      return res.status(400).json({
        success: false,
        message: "Order ID is required",
      });
    }

    const order = await getMyOrderById(userId, orderId);

    return res.status(200).json({
      success: true,
      order,
    });
  } catch (error) {
    return res.status(404).json({
      success: false,
      message: error.message || "Order not found",
    });
  }
};

// Cancel logged-in user's order
export const cancelMyOrderController = async (req, res) => {
  try {
    const userId = req.userId;
    const { orderId } = req.params;
    const { reason = "" } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (!orderId) {
      return res.status(400).json({
        success: false,
        message: "Order ID is required",
      });
    }

    const order = await cancelMyOrder(userId, orderId, reason);

    return res.status(200).json({
      success: true,
      message: "Order cancelled successfully",
      order,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message || "Failed to cancel order",
    });
  }
};
