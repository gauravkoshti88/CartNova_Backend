import express from "express";

import { razorpayWebhookController } from "../controllers/razorpayWebhookController.js";

const razorpayWebhookRouter = express.Router();

// Razorpay webhook
razorpayWebhookRouter.post("/", razorpayWebhookController);

export default razorpayWebhookRouter;
