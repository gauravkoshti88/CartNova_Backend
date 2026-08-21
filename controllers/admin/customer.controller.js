import User from "../../models/user/userSchema.js";
import Order from "../../models/orderItemSchema.js";
import mongoose from "mongoose";

const orderProjection = [
  "user",
  "orderNumber",
  "shippingAddress",
  "subtotal",
  "discount",
  "shippingCharge",
  "tax",
  "totalAmount",
  "paymentMethod",
  "paymentStatus",
  "orderStatus",
  "payment",
  "cancellation",
  "deliveredAt",
  "shippedAt",
  "tracking",
  "createdAt",
  "updatedAt",
].join(" ");

export const getAllCustomers = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = "", status = "all" } = req.query;

    const pageNumber = Math.max(Number(page), 1);
    const limitNumber = Math.max(Number(limit), 1);
    const skip = (pageNumber - 1) * limitNumber;

    const query = {
      isDeleted: false,
    };

    if (status === "active") {
      query.isBlocked = false;
    }

    if (status === "blocked") {
      query.isBlocked = true;
    }

    if (search.trim()) {
      const searchRegex = new RegExp(search.trim(), "i");

      query.$or = [
        { firstName: searchRegex },
        { lastName: searchRegex },
        { email: searchRegex },
        { phone: searchRegex },
      ];
    }

    const [customers, totalCustomers] = await Promise.all([
      User.find(query)
        .select("-password")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNumber)
        .lean(),

      User.countDocuments(query),
    ]);

    const customerIds = customers.map((customer) => customer._id);

    const orders = await Order.find({
      user: { $in: customerIds },
    })
      .select(orderProjection)
      .sort({ createdAt: -1 })
      .lean();

    const ordersMap = new Map();

    for (const order of orders) {
      const userId = String(order.user);

      if (!ordersMap.has(userId)) {
        ordersMap.set(userId, []);
      }

      ordersMap.get(userId).push(order);
    }

    const formattedCustomers = customers.map((customer) => {
      const customerId = String(customer._id);

      const customerOrders = ordersMap.get(customerId) || [];

      const validOrders = customerOrders.filter(
        (order) =>
          order.orderStatus !== "cancelled" && order.orderStatus !== "returned",
      );

      const totalSpent = validOrders.reduce(
        (total, order) => total + Number(order.totalAmount || 0),
        0,
      );

      return {
        ...customer,

        customerId: `CUS-${customerId.slice(-6).toUpperCase()}`,

        name: `${customer.firstName} ${customer.lastName}`,

        status: customer.isBlocked ? "blocked" : "active",

        ordersCount: customerOrders.length,

        totalSpent,

        orders: customerOrders,
      };
    });

    return res.status(200).json({
      success: true,
      message: "Customers fetched successfully.",

      customers: formattedCustomers,

      pagination: {
        totalCustomers,
        currentPage: pageNumber,
        totalPages: Math.ceil(totalCustomers / limitNumber),
        limit: limitNumber,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch customers.",
    });
  }
};

export const getCustomerById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid customer ID.",
      });
    }

    const customer = await User.findOne({
      _id: id,
      isDeleted: false,
    })
      .select("-password")
      .lean();

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found.",
      });
    }

    const orders = await Order.find({
      user: customer._id,
    })
      .select(orderProjection)
      .sort({ createdAt: -1 })
      .lean();

    const validOrders = orders.filter(
      (order) =>
        order.orderStatus !== "cancelled" && order.orderStatus !== "returned",
    );

    const totalSpent = validOrders.reduce(
      (total, order) => total + Number(order.totalAmount || 0),
      0,
    );

    const customerId = String(customer._id);

    return res.status(200).json({
      success: true,
      message: "Customer fetched successfully.",

      customer: {
        ...customer,

        customerId: `CUS-${customerId.slice(-6).toUpperCase()}`,

        name: `${customer.firstName} ${customer.lastName}`,

        status: customer.isBlocked ? "blocked" : "active",

        ordersCount: orders.length,

        totalSpent,

        orders,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch customer.",
    });
  }
};

export const updateCustomer = async (req, res) => {
  try {
    const { id } = req.params;

    const { firstName, lastName, email, phone, profileImage } = req.body;

    const customer = await User.findOne({
      _id: id,
      isDeleted: false,
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found.",
      });
    }

    if (email && email.toLowerCase() !== customer.email) {
      const existingEmail = await User.findOne({
        email: email.toLowerCase(),
        _id: { $ne: id },
        isDeleted: false,
      });

      if (existingEmail) {
        return res.status(409).json({
          success: false,
          message: "Email is already registered with another customer.",
        });
      }

      customer.email = email.toLowerCase().trim();
    }

    if (phone && phone !== customer.phone) {
      const existingPhone = await User.findOne({
        phone,
        _id: { $ne: id },
        isDeleted: false,
      });

      if (existingPhone) {
        return res.status(409).json({
          success: false,
          message: "Phone number is already registered with another customer.",
        });
      }

      customer.phone = phone.trim();
    }

    if (firstName !== undefined) {
      customer.firstName = firstName.trim();
    }

    if (lastName !== undefined) {
      customer.lastName = lastName.trim();
    }

    if (profileImage !== undefined) {
      customer.profileImage = profileImage;
    }

    await customer.save();

    const customerObj = customer.toObject();

    delete customerObj.password;

    return res.status(200).json({
      success: true,
      message: "Customer updated successfully.",
      customer: {
        ...customerObj,
        customerId: `CUS-${String(customer._id).slice(-6).toUpperCase()}`,
        name: `${customer.firstName} ${customer.lastName}`,
        status: customer.isBlocked ? "blocked" : "active",
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to update customer.",
    });
  }
};

export const deleteCustomer = async (req, res) => {
  try {
    const { id } = req.params;

    const customer = await User.findOne({
      _id: id,
      isDeleted: false,
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found.",
      });
    }

    customer.isDeleted = true;

    await customer.save();

    return res.status(200).json({
      success: true,
      message: "Customer deleted successfully.",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to delete customer.",
    });
  }
};

export const blockCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason = "Blocked by administrator." } = req.body;

    const customer = await User.findOne({
      _id: id,
      isDeleted: false,
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found.",
      });
    }

    if (customer.isBlocked) {
      return res.status(400).json({
        success: false,
        message: "Customer is already blocked.",
      });
    }

    customer.isBlocked = true;
    customer.blockedReason = reason;
    customer.blockedAt = new Date();

    await customer.save();

    return res.status(200).json({
      success: true,
      message: "Customer blocked successfully.",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to block customer.",
    });
  }
};

export const unblockCustomer = async (req, res) => {
  try {
    const { id } = req.params;

    const customer = await User.findOne({
      _id: id,
      isDeleted: false,
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found.",
      });
    }

    if (!customer.isBlocked) {
      return res.status(400).json({
        success: false,
        message: "Customer is already active.",
      });
    }

    customer.isBlocked = false;
    customer.blockedReason = null;
    customer.blockedAt = null;

    await customer.save();

    return res.status(200).json({
      success: true,
      message: "Customer unblocked successfully.",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to unblock customer.",
    });
  }
};
