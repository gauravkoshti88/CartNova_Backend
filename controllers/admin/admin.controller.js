import Admin from "../../models/admin/adminSchema.js";

import User from "../../models/user/userSchema.js";
import Order from "../../models/orderItemSchema.js";
import Product from "../../models/productSchema.js";
import Category from "../../models/categorySchema.js";
import SubCategory from "../../models/subCategorySchema.js";
import ChildCategory from "../../models/childCategorySchema.js";
import ProductBrand from "../../models/brandSchema.js";

export const getAdminDashboard = async (req, res) => {
  try {
    const now = new Date();

    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);

    const startOfYesterday = new Date(startOfToday);
    startOfYesterday.setDate(startOfYesterday.getDate() - 1);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const endOfLastMonth = new Date(
      now.getFullYear(),
      now.getMonth(),
      0,
      23,
      59,
      59,
      999,
    );

    const [
      totalCustomers,
      activeCustomers,
      blockedCustomers,
      deletedCustomers,
      newCustomersToday,
      newCustomersThisMonth,
      totalOrders,
      totalProducts,
      publishedProducts,
      draftProducts,
      scheduledProducts,
      archivedProducts,
      featuredProducts,
      newArrivalProducts,
      bestSellerProducts,
      totalCategories,
      activeCategories,
      inactiveCategories,
      deletedCategories,
      totalSubCategories,
      activeSubCategories,
      totalChildCategories,
      activeChildCategories,
      totalBrands,
      activeBrands,
    ] = await Promise.all([
      User.countDocuments({
        isDeleted: false,
      }),

      User.countDocuments({
        isDeleted: false,
        isBlocked: false,
      }),

      User.countDocuments({
        isDeleted: false,
        isBlocked: true,
      }),

      User.countDocuments({
        isDeleted: true,
      }),

      User.countDocuments({
        isDeleted: false,
        createdAt: {
          $gte: startOfToday,
        },
      }),

      User.countDocuments({
        isDeleted: false,
        createdAt: {
          $gte: startOfMonth,
        },
      }),

      Order.countDocuments(),

      Product.countDocuments(),

      Product.countDocuments({
        "publish.status": "published",
      }),

      Product.countDocuments({
        "publish.status": "draft",
      }),

      Product.countDocuments({
        "publish.status": "scheduled",
      }),

      Product.countDocuments({
        "publish.status": "archived",
      }),

      Product.countDocuments({
        "publish.status": "published",
        "publish.featured": true,
      }),

      Product.countDocuments({
        "publish.status": "published",
        "publish.newArrival": true,
      }),

      Product.countDocuments({
        "publish.status": "published",
        "publish.bestSeller": true,
      }),

      Category.countDocuments({
        isDelete: false,
      }),

      Category.countDocuments({
        isDelete: false,
        status: "active",
      }),

      Category.countDocuments({
        isDelete: false,
        status: "inactive",
      }),

      Category.countDocuments({
        isDelete: true,
      }),

      SubCategory.countDocuments({
        isDelete: false,
      }),

      SubCategory.countDocuments({
        isDelete: false,
        status: "active",
      }),

      ChildCategory.countDocuments({
        isDelete: false,
      }),

      ChildCategory.countDocuments({
        isDelete: false,
        status: "active",
      }),

      ProductBrand.countDocuments({
        isDelete: false,
      }),

      ProductBrand.countDocuments({
        isDelete: false,
        status: "active",
      }),
    ]);

    const [
      totalRevenueResult,
      paidRevenueResult,
      pendingRevenueResult,
      refundedRevenueResult,
      todayRevenueResult,
      monthRevenueResult,
      lastMonthRevenueResult,
    ] = await Promise.all([
      // ================= TOTAL REVENUE =================
      // Paid + Pending dono, cancelled orders ko exclude karke
      Order.aggregate([
        {
          $match: {
            paymentStatus: {
              $in: ["paid", "pending"],
            },
            orderStatus: {
              $ne: "cancelled",
            },
          },
        },
        {
          $group: {
            _id: null,
            total: {
              $sum: "$totalAmount",
            },
          },
        },
      ]),

      // ================= PAID REVENUE =================
      // Sirf actually paid orders
      Order.aggregate([
        {
          $match: {
            paymentStatus: "paid",
            orderStatus: {
              $ne: "cancelled",
            },
          },
        },
        {
          $group: {
            _id: null,
            total: {
              $sum: "$totalAmount",
            },
          },
        },
      ]),

      // ================= PENDING REVENUE =================
      // COD unpaid / payment pending orders
      Order.aggregate([
        {
          $match: {
            paymentStatus: "pending",
            orderStatus: {
              $ne: "cancelled",
            },
          },
        },
        {
          $group: {
            _id: null,
            total: {
              $sum: "$totalAmount",
            },
          },
        },
      ]),

      // ================= REFUNDED REVENUE =================
      Order.aggregate([
        {
          $match: {
            paymentStatus: {
              $in: ["refunded", "partially_refunded"],
            },
          },
        },
        {
          $group: {
            _id: null,
            total: {
              $sum: "$totalAmount",
            },
          },
        },
      ]),

      // ================= TODAY =================
      Order.aggregate([
        {
          $match: {
            createdAt: {
              $gte: startOfToday,
            },
            paymentStatus: "paid",
            orderStatus: {
              $ne: "cancelled",
            },
          },
        },
        {
          $group: {
            _id: null,
            total: {
              $sum: "$totalAmount",
            },
          },
        },
      ]),

      // ================= THIS MONTH =================
      Order.aggregate([
        {
          $match: {
            createdAt: {
              $gte: startOfMonth,
            },
            paymentStatus: "paid",
            orderStatus: {
              $ne: "cancelled",
            },
          },
        },
        {
          $group: {
            _id: null,
            total: {
              $sum: "$totalAmount",
            },
          },
        },
      ]),

      // ================= LAST MONTH =================
      Order.aggregate([
        {
          $match: {
            createdAt: {
              $gte: startOfLastMonth,
              $lte: endOfLastMonth,
            },
            paymentStatus: "paid",
            orderStatus: {
              $ne: "cancelled",
            },
          },
        },
        {
          $group: {
            _id: null,
            total: {
              $sum: "$totalAmount",
            },
          },
        },
      ]),
    ]);

    const revenue = {
      total: totalRevenueResult[0]?.total || 0,

      // Actually received money
      paid: paidRevenueResult[0]?.total || 0,

      // COD / other unpaid orders
      pending: pendingRevenueResult[0]?.total || 0,

      refunded: refundedRevenueResult[0]?.total || 0,

      today: todayRevenueResult[0]?.total || 0,

      thisMonth: monthRevenueResult[0]?.total || 0,

      lastMonth: lastMonthRevenueResult[0]?.total || 0,
    };

    const [
      pendingOrders,
      confirmedOrders,
      processingOrders,
      shippedOrders,
      outForDeliveryOrders,
      deliveredOrders,
      cancelledOrders,
      returnedOrders,
      pendingPayments,
      paidPayments,
      failedPayments,
      refundedPayments,
      partiallyRefundedPayments,
      codOrders,
      onlineOrders,
      todayOrders,
      yesterdayOrders,
      thisMonthOrders,
      lastMonthOrders,
    ] = await Promise.all([
      Order.countDocuments({
        orderStatus: "pending",
      }),

      Order.countDocuments({
        orderStatus: "confirmed",
      }),

      Order.countDocuments({
        orderStatus: "processing",
      }),

      Order.countDocuments({
        orderStatus: "shipped",
      }),

      Order.countDocuments({
        orderStatus: "out_for_delivery",
      }),

      Order.countDocuments({
        orderStatus: "delivered",
      }),

      Order.countDocuments({
        orderStatus: "cancelled",
      }),

      Order.countDocuments({
        orderStatus: "returned",
      }),

      Order.countDocuments({
        paymentStatus: "pending",
      }),

      Order.countDocuments({
        paymentStatus: "paid",
      }),

      Order.countDocuments({
        paymentStatus: "failed",
      }),

      Order.countDocuments({
        paymentStatus: "refunded",
      }),

      Order.countDocuments({
        paymentStatus: "partially_refunded",
      }),

      Order.countDocuments({
        paymentMethod: "cod",
      }),

      Order.countDocuments({
        paymentMethod: "online",
      }),

      Order.countDocuments({
        createdAt: {
          $gte: startOfToday,
        },
      }),

      Order.countDocuments({
        createdAt: {
          $gte: startOfYesterday,
          $lt: startOfToday,
        },
      }),

      Order.countDocuments({
        createdAt: {
          $gte: startOfMonth,
        },
      }),

      Order.countDocuments({
        createdAt: {
          $gte: startOfLastMonth,
          $lte: endOfLastMonth,
        },
      }),
    ]);

    const orderStats = {
      total: totalOrders,

      status: {
        pending: pendingOrders,
        confirmed: confirmedOrders,
        processing: processingOrders,
        shipped: shippedOrders,
        outForDelivery: outForDeliveryOrders,
        delivered: deliveredOrders,
        cancelled: cancelledOrders,
        returned: returnedOrders,
      },

      payment: {
        pending: pendingPayments,
        paid: paidPayments,
        failed: failedPayments,
        refunded: refundedPayments,
        partiallyRefunded: partiallyRefundedPayments,
      },

      method: {
        cod: codOrders,
        online: onlineOrders,
      },

      period: {
        today: todayOrders,
        yesterday: yesterdayOrders,
        thisMonth: thisMonthOrders,
        lastMonth: lastMonthOrders,
      },
    };

    const inventoryResult = await Product.aggregate([
      {
        $unwind: {
          path: "$variants",
          preserveNullAndEmptyArrays: false,
        },
      },
      {
        $group: {
          _id: null,

          totalVariants: {
            $sum: 1,
          },

          outOfStockVariants: {
            $sum: {
              $cond: [
                {
                  $eq: ["$variants.stock", 0],
                },
                1,
                0,
              ],
            },
          },

          lowStockVariants: {
            $sum: {
              $cond: [
                {
                  $and: [
                    {
                      $gt: ["$variants.stock", 0],
                    },
                    {
                      $lte: ["$variants.stock", "$inventory.lowStockAlert"],
                    },
                  ],
                },
                1,
                0,
              ],
            },
          },

          totalStock: {
            $sum: "$variants.stock",
          },
        },
      },
    ]);

    const inventory = {
      totalVariants: inventoryResult[0]?.totalVariants || 0,
      totalStock: inventoryResult[0]?.totalStock || 0,
      outOfStockVariants: inventoryResult[0]?.outOfStockVariants || 0,
      lowStockVariants: inventoryResult[0]?.lowStockVariants || 0,
    };

    const lowStockProducts = await Product.aggregate([
      {
        $unwind: "$variants",
      },
      {
        $match: {
          "variants.stock": {
            $lte: 5,
          },
        },
      },
      {
        $project: {
          _id: 1,
          productName: "$basicInfo.productName",
          slug: 1,
          variantId: "$variants.id",
          sku: "$variants.sku",
          stock: "$variants.stock",
          salePrice: "$variants.salePrice",
          image: {
            $ifNull: [
              "$variants.image.url",
              {
                $arrayElemAt: ["$media.url", 0],
              },
            ],
          },
        },
      },
      {
        $sort: {
          stock: 1,
        },
      },
      {
        $limit: 10,
      },
    ]);

    const topProducts = await Order.aggregate([
      {
        $match: {
          orderStatus: {
            $nin: ["cancelled", "returned"],
          },
        },
      },
      {
        $unwind: "$items",
      },
      {
        $group: {
          _id: "$items.product",

          productName: {
            $first: "$items.productName",
          },

          totalQuantity: {
            $sum: "$items.quantity",
          },

          totalSales: {
            $sum: "$items.total",
          },

          image: {
            $first: "$items.image.url",
          },
        },
      },
      {
        $sort: {
          totalQuantity: -1,
          totalSales: -1,
        },
      },
      {
        $limit: 10,
      },
    ]);

    const recentOrders = await Order.find()
      .sort({
        createdAt: -1,
      })
      .limit(10)
      .select("-items")
      .populate("user", "firstName lastName email phone profileImage")
      .lean();

    const recentCustomers = await User.find({
      isDeleted: false,
    })
      .sort({
        createdAt: -1,
      })
      .limit(10)
      .select("firstName lastName email phone profileImage isBlocked createdAt")
      .lean();

    const salesTrend = await Order.aggregate([
      {
        $match: {
          createdAt: {
            $gte: startOfMonth,
          },
          paymentStatus: "paid",
          orderStatus: {
            $ne: "cancelled",
          },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$createdAt",
            },
          },

          revenue: {
            $sum: "$totalAmount",
          },

          orders: {
            $sum: 1,
          },
        },
      },
      {
        $sort: {
          _id: 1,
        },
      },
    ]);

    return res.status(200).json({
      success: true,
      message: "Dashboard data fetched successfully.",

      dashboard: {
        overview: {
          customers: {
            total: totalCustomers,
            active: activeCustomers,
            blocked: blockedCustomers,
            deleted: deletedCustomers,
            newToday: newCustomersToday,
            newThisMonth: newCustomersThisMonth,
          },

          orders: {
            total: totalOrders,
            today: todayOrders,
            thisMonth: thisMonthOrders,
          },

          products: {
            total: totalProducts,
            published: publishedProducts,
            draft: draftProducts,
            scheduled: scheduledProducts,
            archived: archivedProducts,
            featured: featuredProducts,
            newArrivals: newArrivalProducts,
            bestSellers: bestSellerProducts,
          },

          categories: {
            total: totalCategories,
            active: activeCategories,
            inactive: inactiveCategories,
            deleted: deletedCategories,
          },

          subCategories: {
            total: totalSubCategories,
            active: activeSubCategories,
          },

          childCategories: {
            total: totalChildCategories,
            active: activeChildCategories,
          },

          brands: {
            total: totalBrands,
            active: activeBrands,
          },
        },

        revenue,

        orders: orderStats,

        inventory,

        lowStockProducts,

        topProducts,

        recentOrders,

        recentCustomers,

        salesTrend,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch dashboard data.",
      error: error.message,
    });
  }
};

export const getAdmin = async (req, res) => {
  try {
    if (!req.adminId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: No admin ID",
      });
    }

    const admin = await Admin.findById(req.adminId).select("-password");

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Admin not found",
      });
    }

    return res.status(200).json({
      success: true,
      admin,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: `Get Admin Error ${error}`,
    });
  }
};
