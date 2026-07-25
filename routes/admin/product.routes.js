import express from "express";
import { adminAuth } from "../../middleware/Auth.js";
import upload from "../../middleware/multer.js";
import { addNewProduct } from "../../controllers/admin/product.controller.js";

const productRouter = express.Router();

productRouter.post("/add-new-product", adminAuth, upload.array("images",20), addNewProduct);

export default productRouter;