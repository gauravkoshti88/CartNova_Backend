import express from "express";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";
import dns from "dns";

import dbConnect from "./config/db.js";

import authRouter from "./routes/user/auth.routes.js";
import userRouter from "./routes/user/user.routes.js";

import adminAuthRouter from "./routes/admin/admin.auth.routes.js";
import adminRouter from "./routes/admin/admin.routes.js";
import categoryRouter from "./routes/admin/category.routes.js";
import subCategoryRouter from "./routes/admin/subCategory.routes.js";
import brandRouter from "./routes/admin/brand.routes.js";
import productRouter from "./routes/admin/product.routes.js";
import childCategoryRouter from "./routes/admin/childCategory.routes.js";

import websiteRouter from "./routes/website.routes.js";
import publicRouter from "./routes/public/public.routes.js";
import publicCategoryRouter from "./routes/public/category.routes.js";

import cartRouter from "./routes/user/cartRouter.js";
import wishlistRouter from "./routes/user/wishlistRouter.js";

import orderRouter from "./routes/orderRoutes.js";
import adminOrderRouter from "./routes/admin/adminOrderRoutes.js";
import paymentRouter from "./routes/paymentRoutes.js";

import customerRouter from "./routes/admin/customer.routes.js";

import chatRouter from "./routes/chatRoutes.js";

import { initializeChatSocket } from "./socket/chatSocket.js";
import razorpayWebhookRouter from "./routes/razorpayWebhookRoutes.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

dns.setServers(["1.1.1.1", "8.8.8.8"]);

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  }),
);

app.use(cookieParser());

// Razorpay webhook raw body
app.use(
  "/api/webhooks/razorpay",
  express.raw({
    type: "application/json",
  }),
  razorpayWebhookRouter,
);

// Normal JSON body
app.use(express.json());

app.use(express.urlencoded({ extended: true }));

// Website routes
app.use("/api/website", websiteRouter);

// Public routes
app.use("/api/public", publicRouter);

// Public category routes
app.use("/api/public/categories", publicCategoryRouter);

// Wishlist routes
app.use("/api/wishlist", wishlistRouter);

// Cart routes
app.use("/api/user/cart", cartRouter);

// Admin auth routes
app.use("/api/auth/admin", adminAuthRouter);

// Admin routes
app.use("/api/admin", adminRouter);

// Admin brand routes
app.use("/api/admin", brandRouter);

// Admin sub-category routes
app.use("/api/admin", subCategoryRouter);

// Admin child-category routes
app.use("/api/admin/child-category", childCategoryRouter);

// Admin category routes
app.use("/api/admin", categoryRouter);

// Admin product routes
app.use("/api/admin", productRouter);

// Admin order routes
app.use("/api/admin/orders", adminOrderRouter);

// Admin customer routes
app.use("/api/admin", customerRouter);

// User auth routes
app.use("/api/auth", authRouter);

// User routes
app.use("/api/user", userRouter);

// Order routes
app.use("/api/order", orderRouter);

// Payment routes
app.use("/api/payment", paymentRouter);

// Chat routes
app.use("/api/chat", chatRouter);

const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:5173",
    credentials: true,
  },
});

initializeChatSocket(io);

httpServer.listen(port, async () => {
  try {
    await dbConnect();

    console.log(`Server is running at http://localhost:${port}`);
    console.log("Socket.IO server is running");
  } catch (error) {
    console.error("Database connection failed:", error);
  }
});
