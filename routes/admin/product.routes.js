import express from "express";
import { adminAuth } from "../../middleware/Auth.js";
import upload from "../../middleware/multer.js";
import { addNewProduct, getAllProduct,getProductBySlug, updateProduct, updateProductStatus } from "../../controllers/admin/product.controller.js";

const productRouter = express.Router();

productRouter.get("/get-all-products", adminAuth, getAllProduct);

productRouter.get("/get-product/:slug", adminAuth, getProductBySlug);

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

productRouter.put(
    "/update-product/:slug",
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
    updateProduct
);

productRouter.patch("/update-product-status/:slug", adminAuth, updateProductStatus);

export default productRouter;