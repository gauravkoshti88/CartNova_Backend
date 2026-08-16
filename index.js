import express from "express";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import cors from "cors";
import dbConnect from "./config/db.js";
import authRouter from "./routes/user/auth.routes.js";
import userRouter from "./routes/user/user.routes.js";
import adminAuthRouter from "./routes/admin/admin.auth.routes.js";
import adminRouter from "./routes/admin/admin.routes.js";
import categoryRouter from "./routes/admin/category.routes.js";
import subCategoryRouter from "./routes/admin/subCategory.routes.js";
import brandRouter from "./routes/admin/brand.routes.js";
import productRouter from "./routes/admin/product.routes.js";
import websiteRouter from "./routes/website.routes.js";
import publicRouter from "./routes/public/public.routes.js";
import childCategoryRouter from "./routes/admin/childCategory.routes.js";
import dns from "dns";
import publicCategoryRouter from "./routes/public/category.routes.js";
import cartRouter from "./routes/user/cartRouter.js";
import orderRouter from "./routes/orderRoutes.js";
import adminOrderRouter from "./routes/admin/adminOrderRoutes.js";
import paymentRouter from "./routes/paymentRoutes.js";
import wishlistRouter from "./routes/user/wishlistRouter.js";
import customerRouter from "./routes/admin/customer.routes.js";
dotenv.config();

const app = express();
const port = process.env.PORT;
dns.setServers(["1.1.1.1", "8.8.8.8"]);

app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: ["http://localhost:5173"],
    credentials: true,
  }),
);
app.use(express.urlencoded({ extended: true }));

// website routes
app.use("/api/website", websiteRouter);

// public routes
app.use("/api/public", publicRouter);

// public category routes
app.use("/api/public/categories", publicCategoryRouter);

app.use("/api/wishlist", wishlistRouter);

// cart routes
app.use("/api/user/cart", cartRouter);

// admin routes
app.use("/api/auth/admin", adminAuthRouter);
app.use("/api/admin", adminRouter);

// admin productBrand routes
app.use("/api/admin", brandRouter);

// admin sub-category routes
app.use("/api/admin", subCategoryRouter);

// admin child-category routes
app.use("/api/admin/child-category", childCategoryRouter);

// admin category routes
app.use("/api/admin", categoryRouter);

// admin product routes
app.use("/api/admin", productRouter);

// admin orders routes
app.use("/api/admin/orders", adminOrderRouter);

// admin customer routes
app.use("/api/admin", customerRouter);

// auth routes
app.use("/api/auth", authRouter);

// user routes
app.use("/api/user", userRouter);

// order routes
app.use("/api/order", orderRouter);

// payment routes
app.use("/api/payment", paymentRouter);

app.listen(port, () => {
  dbConnect();
  console.log(`Server is running at http://localhost:${port}`);
});
