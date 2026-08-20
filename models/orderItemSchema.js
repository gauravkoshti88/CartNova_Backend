import mongoose from "mongoose";

// Order item
const orderItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },

    variantId: {
      type: String,
      required: true,
      trim: true,
    },

    productName: {
      type: String,
      required: true,
      trim: true,
    },

    sku: {
      type: String,
      default: "",
      trim: true,
    },

    image: {
      publicId: {
        type: String,
        default: "",
        trim: true,
      },

      url: {
        type: String,
        default: "",
        trim: true,
      },

      alt: {
        type: String,
        default: "",
        trim: true,
      },
    },

    attributes: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    mrp: {
      type: Number,
      required: true,
      min: 0,
    },

    price: {
      type: Number,
      required: true,
      min: 0,
    },

    quantity: {
      type: Number,
      required: true,
      min: 1,
    },

    total: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  {
    _id: true,
  },
);

// Shipping address
const shippingAddressSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    phone: {
      type: String,
      required: true,
      trim: true,
    },

    addressLine1: {
      type: String,
      required: true,
      trim: true,
    },

    addressLine2: {
      type: String,
      default: "",
      trim: true,
    },

    city: {
      type: String,
      required: true,
      trim: true,
    },

    state: {
      type: String,
      required: true,
      trim: true,
    },

    pincode: {
      type: String,
      required: true,
      trim: true,
    },

    landmark: {
      type: String,
      default: "",
      trim: true,
    },

    addressType: {
      type: String,
      enum: ["home", "office", "other"],
      default: "home",
    },
  },
  {
    _id: false,
  },
);

// Payment details
const paymentSchema = new mongoose.Schema(
  {
    provider: {
      type: String,
      enum: ["", "razorpay"],
      default: "",
    },

    razorpayOrderId: {
      type: String,
      default: "",
      trim: true,
    },

    razorpayPaymentId: {
      type: String,
      default: "",
      trim: true,
    },

    paymentIntentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PaymentIntent",
      default: null,
      index: true,
    },

    currency: {
      type: String,
      default: "INR",
      uppercase: true,
      trim: true,
    },

    amount: {
      type: Number,
      default: 0,
      min: 0,
    },

    paidAt: {
      type: Date,
      default: null,
    },

    failedAt: {
      type: Date,
      default: null,
    },

    failureReason: {
      type: String,
      default: "",
      trim: true,
    },
  },
  {
    _id: false,
  },
);

// Cancellation details
const cancellationSchema = new mongoose.Schema(
  {
    reason: {
      type: String,
      default: "",
      trim: true,
    },

    cancelledAt: {
      type: Date,
      default: null,
    },

    cancelledBy: {
      type: String,
      enum: ["user", "admin", "system", null],
      default: null,
    },
  },
  {
    _id: false,
  },
);

// Refund details
const refundSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: [
        "none",
        "pending",
        "processing",
        "partially_refunded",
        "refunded",
        "failed",
      ],
      default: "none",
    },

    razorpayRefundId: {
      type: String,
      default: "",
      trim: true,
      index: true,
    },

    amount: {
      type: Number,
      default: 0,
      min: 0,
    },

    reason: {
      type: String,
      default: "",
      trim: true,
    },

    initiatedAt: {
      type: Date,
      default: null,
    },

    completedAt: {
      type: Date,
      default: null,
    },
  },
  {
    _id: false,
  },
);

// Tracking details
const trackingSchema = new mongoose.Schema(
  {
    courierName: {
      type: String,
      default: "",
      trim: true,
    },

    trackingNumber: {
      type: String,
      default: "",
      trim: true,
    },

    trackingUrl: {
      type: String,
      default: "",
      trim: true,
    },

    shippedAt: {
      type: Date,
      default: null,
    },

    deliveredAt: {
      type: Date,
      default: null,
    },
  },
  {
    _id: false,
  },
);

// Order schema
const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    orderNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },

    idempotencyKey: {
      type: String,
      default: "",
      trim: true,
    },

    paymentIntent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PaymentIntent",
      default: null,
      index: true,
    },

    items: {
      type: [orderItemSchema],
      required: true,

      validate: {
        validator: (items) => Array.isArray(items) && items.length > 0,
        message: "Order must contain at least one item",
      },
    },

    shippingAddress: {
      type: shippingAddressSchema,
      required: true,
    },

    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },

    discount: {
      type: Number,
      default: 0,
      min: 0,
    },

    shippingCharge: {
      type: Number,
      default: 0,
      min: 0,
    },

    tax: {
      type: Number,
      default: 0,
      min: 0,
    },

    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    currency: {
      type: String,
      default: "INR",
      uppercase: true,
      trim: true,
    },

    paymentMethod: {
      type: String,
      enum: ["cod", "online"],
      required: true,
      index: true,
    },

    paymentStatus: {
      type: String,
      enum: [
        "pending",
        "authorized",
        "paid",
        "failed",
        "cancelled",
        "refund_pending",
        "refunded",
        "partially_refunded",
      ],
      default: "pending",
      index: true,
    },

    orderStatus: {
      type: String,
      enum: [
        "created",
        "payment_pending",
        "confirmed",
        "processing",
        "shipped",
        "out_for_delivery",
        "delivered",
        "cancelled",
        "return_requested",
        "returned",
      ],
      default: "created",
      index: true,
    },

    payment: {
      type: paymentSchema,
      default: () => ({}),
    },

    refund: {
      type: refundSchema,
      default: () => ({}),
    },

    cancellation: {
      type: cancellationSchema,
      default: () => ({}),
    },

    tracking: {
      type: trackingSchema,
      default: () => ({}),
    },

    inventoryStatus: {
      type: String,
      enum: ["pending", "reserved", "committed", "released", "failed"],
      default: "pending",
      index: true,
    },

    confirmedAt: {
      type: Date,
      default: null,
    },

    cancelledAt: {
      type: Date,
      default: null,
    },

    returnedAt: {
      type: Date,
      default: null,
    },

    reconciliationAttempts: {
      type: Number,
      default: 0,
      min: 0,
    },

    lastReconciledAt: {
      type: Date,
      default: null,
    },

    lastError: {
      type: String,
      default: "",
      trim: true,
    },
  },
  {
    timestamps: true,
  },
);

// User orders
orderSchema.index({
  user: 1,
  createdAt: -1,
});

// Admin orders
orderSchema.index({
  orderStatus: 1,
  createdAt: -1,
});

// Payment filtering
orderSchema.index({
  paymentStatus: 1,
  createdAt: -1,
});

// Payment reconciliation
orderSchema.index({
  "payment.razorpayOrderId": 1,
});

orderSchema.index({
  "payment.razorpayPaymentId": 1,
});

// User idempotency
orderSchema.index(
  {
    user: 1,
    idempotencyKey: 1,
  },
  {
    unique: true,
    sparse: true,
  },
);

// Schema validation
orderSchema.pre("validate", function () {
  if (this.subtotal < 0) {
    return next(new Error("Subtotal cannot be negative"));
  }

  if (this.discount < 0) {
    return next(new Error("Discount cannot be negative"));
  }

  if (this.shippingCharge < 0) {
    return next(new Error("Shipping charge cannot be negative"));
  }

  if (this.tax < 0) {
    return next(new Error("Tax cannot be negative"));
  }

  if (this.totalAmount < 0) {
    return next(new Error("Total amount cannot be negative"));
  }

  if (
    this.paymentMethod === "online" &&
    this.paymentStatus === "paid" &&
    !this.payment?.razorpayPaymentId
  ) {
    return next(new Error("Razorpay payment ID is required"));
  }
});

const Order = mongoose.model("Order", orderSchema);

export default Order;
