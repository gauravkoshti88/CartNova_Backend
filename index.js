import express from "express";
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv'
import cors from 'cors'
import dbConnect from "./config/db.js";
import authRouter from "./routes/user/auth.routes.js";
import userRouter from "./routes/user/user.routes.js";
import adminAuthRouter from "./routes/admin/admin.auth.routes.js";
import adminRouter from "./routes/admin/admin.routes.js";
import categoryRouter from "./routes/admin/category.routes.js";
import subCategoryRouter from "./routes/admin/subCategory.routes.js";
import brandRouter from "./routes/admin/brand.routes.js";
import productRouter from "./routes/admin/product.routes.js";
dotenv.config()

const app = express()
const port = process.env.PORT

app.use(express.json());
app.use(cookieParser());
app.use(cors({
    origin: [
        "http://localhost:5173"
    ],
    credentials: true
}))
app.use(express.urlencoded({ extended: true }));

// test route
app.get("/", (req, res) => {
    res.send("Server Running ✅")
})

// admin routes
app.use("/api/auth/admin", adminAuthRouter);
app.use("/api/admin", adminRouter);

// admin productBrand routes
app.use("/api/admin", brandRouter);

// admin sub-category routes
app.use("/api/admin", subCategoryRouter);

// admin category routes
app.use("/api/admin", categoryRouter);

// admin product routes
app.use("/api/admin", productRouter);

// user routes
app.use("/api/auth", authRouter);
app.use("/api/user", userRouter);

app.listen(port, () => {
    dbConnect();
    console.log(`Server is running at http://localhost:${port}`);
})