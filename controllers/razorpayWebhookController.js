import crypto from "crypto";

import WebhookEvent from "../models/webhookEventSchema.js";
import PaymentIntent from "../models/paymentIntentSchema.js";

import { finalizePayment } from "../services/paymentFinalizerService.js";

// Verify webhook signature
const verifyWebhookSignature = (rawBody, signature, secret) => {
  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");

  const receivedBuffer = Buffer.from(signature, "utf8");
  const expectedBuffer = Buffer.from(expectedSignature, "utf8");

  if (receivedBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(receivedBuffer, expectedBuffer);
};

// Handle Razorpay webhook
export const razorpayWebhookController = async (req, res) => {
  console.log("🔥 RAZORPAY WEBHOOK HIT");
  console.log("Webhook Headers:", req.headers);
  let webhookEvent = null;

  try {
    const signature = req.headers["x-razorpay-signature"];
    const eventId = req.headers["x-razorpay-event-id"];

    if (!signature) {
      return res.status(400).json({
        success: false,
        message: "Webhook signature is missing",
      });
    }

    if (!eventId) {
      return res.status(400).json({
        success: false,
        message: "Webhook event ID is missing",
      });
    }

    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (!secret) {
      console.error("RAZORPAY_WEBHOOK_SECRET is missing");

      return res.status(500).json({
        success: false,
        message: "Webhook configuration error",
      });
    }

    const rawBody = Buffer.isBuffer(req.body) ? req.body : req.rawBody;

    if (!rawBody) {
      return res.status(400).json({
        success: false,
        message: "Raw webhook body is missing",
      });
    }

    const validSignature = verifyWebhookSignature(rawBody, signature, secret);

    if (!validSignature) {
      return res.status(400).json({
        success: false,
        message: "Invalid webhook signature",
      });
    }

    let event;

    try {
      event = JSON.parse(rawBody.toString("utf8"));
    } catch {
      return res.status(400).json({
        success: false,
        message: "Invalid webhook JSON",
      });
    }

    if (!event?.event) {
      return res.status(400).json({
        success: false,
        message: "Invalid webhook event",
      });
    }

    const existingEvent = await WebhookEvent.findOne({
      eventId,
    });

    if (existingEvent?.status === "processed") {
      return res.status(200).json({
        success: true,
        message: "Webhook already processed",
        duplicate: true,
      });
    }

    if (existingEvent?.status === "ignored") {
      return res.status(200).json({
        success: true,
        message: "Webhook already ignored",
        duplicate: true,
      });
    }

    if (!existingEvent) {
      webhookEvent = await WebhookEvent.create({
        provider: "razorpay",
        eventId,
        event: event.event,
        payload: event,
        signatureVerified: true,
        status: "processing",
        attempts: 1,
        lastAttemptAt: new Date(),
      });
    } else {
      webhookEvent = existingEvent;

      webhookEvent.status = "processing";
      webhookEvent.signatureVerified = true;
      webhookEvent.attempts += 1;
      webhookEvent.lastAttemptAt = new Date();
      webhookEvent.error = "";

      await webhookEvent.save();
    }

    const payment = event.payload?.payment?.entity;

    if (event.event === "payment.captured" || event.event === "order.paid") {
      if (!payment?.id || !payment?.order_id) {
        throw new Error("Payment information is missing");
      }

      const paymentIntent = await PaymentIntent.findOne({
        razorpayOrderId: payment.order_id,
      });

      if (!paymentIntent) {
        throw new Error("Payment intent not found for Razorpay order");
      }

      if (
        Number(payment.amount) !==
        Math.round(Number(paymentIntent.amount) * 100)
      ) {
        throw new Error("Webhook payment amount does not match payment intent");
      }

      if (payment.currency && payment.currency !== paymentIntent.currency) {
        throw new Error(
          "Webhook payment currency does not match payment intent",
        );
      }

      const result = await finalizePayment({
        paymentIntentId: paymentIntent._id,
        razorpayOrderId: payment.order_id,
        razorpayPaymentId: payment.id,
      });

      await WebhookEvent.updateOne(
        { eventId },
        {
          $set: {
            status: "processed",
            processedAt: new Date(),
            paymentIntent: result.paymentIntent?._id || null,
            order: result.order?._id || null,
            razorpayOrderId: payment.order_id,
            razorpayPaymentId: payment.id,
            error: "",
          },
        },
      );

      return res.status(200).json({
        success: true,
        message: result.alreadyFinalized
          ? "Payment already finalized"
          : "Payment finalized successfully",
        alreadyFinalized: result.alreadyFinalized,
      });
    }

    if (event.event === "payment.failed") {
      if (!payment?.id || !payment?.order_id) {
        throw new Error("Failed payment information is missing");
      }

      const paymentIntent = await PaymentIntent.findOne({
        razorpayOrderId: payment.order_id,
      });

      if (paymentIntent) {
        if (!["paid", "refunded"].includes(paymentIntent.status)) {
          paymentIntent.status = "failed";
          paymentIntent.razorpayPaymentId =
            payment.id || paymentIntent.razorpayPaymentId;
          paymentIntent.failedAt = new Date();
          paymentIntent.failureReason =
            payment.error_description ||
            payment.error_reason ||
            "Razorpay payment failed";

          await paymentIntent.save();
        }
      }

      await WebhookEvent.updateOne(
        { eventId },
        {
          $set: {
            status: "processed",
            processedAt: new Date(),
            paymentIntent: paymentIntent?._id || null,
            razorpayOrderId: payment.order_id,
            razorpayPaymentId: payment.id,
            error: "",
          },
        },
      );

      return res.status(200).json({
        success: true,
        message: "Payment failure processed",
      });
    }

    if (event.event === "payment.authorized") {
      const paymentIntent = payment?.order_id
        ? await PaymentIntent.findOne({
            razorpayOrderId: payment.order_id,
          })
        : null;

      await WebhookEvent.updateOne(
        { eventId },
        {
          $set: {
            status: "processed",
            processedAt: new Date(),
            paymentIntent: paymentIntent?._id || null,
            razorpayOrderId: payment?.order_id || "",
            razorpayPaymentId: payment?.id || "",
          },
        },
      );

      return res.status(200).json({
        success: true,
        message: "Payment authorization received",
      });
    }

    await WebhookEvent.updateOne(
      { eventId },
      {
        $set: {
          status: "ignored",
          processedAt: new Date(),
        },
      },
    );

    return res.status(200).json({
      success: true,
      message: "Webhook event ignored",
    });
  } catch (error) {
    console.error("RAZORPAY WEBHOOK ERROR:", error);

    if (webhookEvent) {
      try {
        await WebhookEvent.updateOne(
          { eventId: webhookEvent.eventId },
          {
            $set: {
              status: "failed",
              error: error.message || "Webhook processing failed",
            },
          },
        );
      } catch (updateError) {
        console.error("WEBHOOK EVENT UPDATE ERROR:", updateError);
      }
    }

    return res.status(500).json({
      success: false,
      message: "Webhook processing failed",
    });
  }
};
