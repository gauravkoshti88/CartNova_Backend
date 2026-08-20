import mongoose from "mongoose";

// Webhook event schema
const webhookEventSchema = new mongoose.Schema(
  {
    provider: {
      type: String,
      enum: ["razorpay"],
      required: true,
      default: "razorpay",
      index: true,
    },

    eventId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },

    event: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    paymentIntent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PaymentIntent",
      default: null,
    },

    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      default: null,
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

    signatureVerified: {
      type: Boolean,
      default: false,
    },

    status: {
      type: String,
      enum: ["received", "processing", "processed", "ignored", "failed"],
      default: "received",
      index: true,
    },

    attempts: {
      type: Number,
      default: 0,
      min: 0,
    },

    processedAt: {
      type: Date,
      default: null,
    },

    lastAttemptAt: {
      type: Date,
      default: null,
    },

    error: {
      type: String,
      default: "",
      trim: true,
    },

    payload: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  },
);

// Event lookup
webhookEventSchema.index({
  provider: 1,
  eventId: 1,
});

// Failed webhook retry
webhookEventSchema.index({
  status: 1,
  lastAttemptAt: 1,
});

// Payment lookup
webhookEventSchema.index({
  razorpayPaymentId: 1,
});

// Razorpay order lookup
webhookEventSchema.index({
  razorpayOrderId: 1,
});

// Payment intent lookup
webhookEventSchema.index({
  paymentIntent: 1,
});

// Order lookup
webhookEventSchema.index({
  order: 1,
});

const WebhookEvent = mongoose.model("WebhookEvent", webhookEventSchema);

export default WebhookEvent;
