import {
  getAdminOrders,
  getAdminOrderById,
  updateAdminOrderStatus,
  updateOrderTracking,
} from "../../services/adminOrderService.js";

// --------------------------------------------------
// Get Orders
// --------------------------------------------------

export const getAdminOrdersController = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      paymentStatus,
      paymentMethod,
      search,
    } = req.query;

    const result = await getAdminOrders({
      page,
      limit,
      status,
      paymentStatus,
      paymentMethod,
      search,
    });

    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("GET ADMIN ORDERS ERROR:", error);

    return res.status(400).json({
      success: false,
      message: error.message || "Failed to fetch orders",
    });
  }
};

// --------------------------------------------------
// Get Order Details
// --------------------------------------------------

export const getAdminOrderByIdController = async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await getAdminOrderById(orderId);

    return res.status(200).json({
      success: true,
      order,
    });
  } catch (error) {
    console.error("GET ADMIN ORDER ERROR:", error);

    return res.status(404).json({
      success: false,
      message: error.message || "Order not found",
    });
  }
};

// --------------------------------------------------
// Update Status
// --------------------------------------------------

export const updateAdminOrderStatusController = async (req, res) => {
  try {
    const { orderId } = req.params;

    const { orderStatus } = req.body;

    if (!orderStatus) {
      return res.status(400).json({
        success: false,
        message: "Order status is required",
      });
    }

    const order = await updateAdminOrderStatus(orderId, orderStatus);

    return res.status(200).json({
      success: true,
      message: "Order status updated successfully",
      order,
    });
  } catch (error) {
    console.error("UPDATE ORDER STATUS ERROR:", error);

    return res.status(400).json({
      success: false,
      message: error.message || "Failed to update order status",
    });
  }
};

// --------------------------------------------------
// Update Tracking
// --------------------------------------------------

export const updateOrderTrackingController = async (req, res) => {
  try {
    const { orderId } = req.params;

    const { courierName, trackingNumber, trackingUrl } = req.body;

    const order = await updateOrderTracking(orderId, {
      courierName,
      trackingNumber,
      trackingUrl,
    });

    return res.status(200).json({
      success: true,
      message: "Tracking information updated",
      order,
    });
  } catch (error) {
    console.error("UPDATE ORDER TRACKING ERROR:", error);

    return res.status(400).json({
      success: false,
      message: error.message || "Failed to update tracking",
    });
  }
};
