import {
  createOrder,
  getMyOrders,
  getMyOrderById,
  cancelMyOrder,
} from "../services/orderService.js";

// --------------------------------------------------
// Create Order
// --------------------------------------------------

export const createOrderController = async (req, res) => {
  try {
    const userId = req.userId;

    const { shippingAddress, paymentMethod, payment = {} } = req.body;

    const order = await createOrder({
      userId,
      shippingAddress,
      paymentMethod,
      payment,
    });

    return res.status(201).json({
      success: true,
      message: "Order placed successfully",
      order,
    });
  } catch (error) {
    console.error("CREATE ORDER ERROR:", error);

    return res.status(400).json({
      success: false,
      message: error.message || "Failed to create order",
    });
  }
};

// --------------------------------------------------
// Get My Orders
// --------------------------------------------------

export const getMyOrdersController = async (req, res) => {
  try {
    const userId = req.userId;

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
    console.error("GET MY ORDERS ERROR:", error);

    return res.status(400).json({
      success: false,
      message: error.message || "Failed to fetch orders",
    });
  }
};

// --------------------------------------------------
// Get My Order By ID
// --------------------------------------------------

export const getMyOrderByIdController = async (req, res) => {
  try {
    const userId = req.userId;

    const { orderId } = req.params;

    const order = await getMyOrderById(userId, orderId);

    return res.status(200).json({
      success: true,
      order,
    });
  } catch (error) {
    console.error("GET MY ORDER BY ID ERROR:", error);

    return res.status(404).json({
      success: false,
      message: error.message || "Order not found",
    });
  }
};

// --------------------------------------------------
// Cancel My Order
// --------------------------------------------------

export const cancelMyOrderController = async (req, res) => {
  try {
    const userId = req.userId;

    const { orderId } = req.params;

    const { reason = "" } = req.body;

    const order = await cancelMyOrder(userId, orderId, reason);

    return res.status(200).json({
      success: true,
      message: "Order cancelled successfully",
      order,
    });
  } catch (error) {
    console.error("CANCEL ORDER ERROR:", error);

    return res.status(400).json({
      success: false,
      message: error.message || "Failed to cancel order",
    });
  }
};
