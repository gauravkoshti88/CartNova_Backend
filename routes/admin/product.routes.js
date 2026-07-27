import express from "express";
import { adminAuth } from "../../middleware/Auth.js";
import upload from "../../middleware/multer.js";
import { addNewProduct, getAllProduct, getProductById } from "../../controllers/admin/product.controller.js";

const productRouter = express.Router();

productRouter.get("/get-all-products", adminAuth, getAllProduct);

productRouter.get("/get-product/:id", adminAuth, getProductById);

productRouter.post(
    "/add-new-product",
    adminAuth,
    upload.fields([
        {
            name: "images",
            maxCount: 20
        },
        {
            name: "attributeImages",
            maxCount: 100
        }
    ]),
    addNewProduct
);

export default productRouter;