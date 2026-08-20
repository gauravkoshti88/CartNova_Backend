import mongoose from "mongoose";

// Shipping address schema
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
      enum: ["home", "work", "other"],
      default: "home",
    },
  },
  {
    _id: false,
  },
);

// Payment intent schema
const paymentIntentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    intentKey: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },

    idempotencyKey: {
      type: String,
      required: true,
      trim: true,
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

    amount: {
      type: Number,
      required: true,
      min: 1,
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

    shippingAddress: {
      type: shippingAddressSchema,
      required: true,
    },

    status: {
      type: String,
      enum: [
        "created",
        "payment_pending",
        "authorized",
        "paid",
        "failed",
        "cancelled",
        "expired",
        "refund_pending",
        "refunded",
        "partially_refunded",
      ],
      default: "created",
      index: true,
    },

    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      default: null,
    },

    receipt: {
      type: String,
      default: "",
      trim: true,
    },

    signatureVerified: {
      type: Boolean,
      default: false,
    },

    webhookVerified: {
      type: Boolean,
      default: false,
    },

    paymentCaptured: {
      type: Boolean,
      default: false,
    },

    paidAt: {
      type: Date,
      default: null,
    },

    failedAt: {
      type: Date,
      default: null,
    },

    cancelledAt: {
      type: Date,
      default: null,
    },

    expiresAt: {
      type: Date,
      default: null,
      index: true,
    },

    failureReason: {
      type: String,
      default: "",
      trim: true,
    },

    lastError: {
      type: String,
      default: "",
      trim: true,
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

    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  },
);

// User payment intents
paymentIntentSchema.index({
  user: 1,
  createdAt: -1,
});

// User idempotency
paymentIntentSchema.index(
  {
    user: 1,
    idempotencyKey: 1,
  },
  {
    unique: true,
  },
);

// Razorpay order lookup
paymentIntentSchema.index(
  {
    razorpayOrderId: 1,
  },
  {
    unique: true,
    sparse: true,
  },
);

// Razorpay payment lookup
paymentIntentSchema.index(
  {
    razorpayPaymentId: 1,
  },
  {
    unique: true,
    sparse: true,
  },
);

// Order lookup
paymentIntentSchema.index({
  order: 1,
});

// Payment reconciliation
paymentIntentSchema.index({
  status: 1,
  lastReconciledAt: 1,
});

const PaymentIntent = mongoose.model("PaymentIntent", paymentIntentSchema);

export default PaymentIntent;
