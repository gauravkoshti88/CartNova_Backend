import express from "express";
import { adminAuth } from "../../middleware/Auth.js";
import { addNewBrand, deleteBrandById, getAllBrand, getBrandByCategory, getBrandById, updateBrandById, updateBrandStatusById } from "../../controllers/admin/brand.controller.js";
import upload from "../../middleware/multer.js";

const brandRouter = express.Router();

brandRouter.get("/category/get-all-brands", adminAuth, getAllBrand);

brandRouter.get("/category/get-brand/:categoryId", adminAuth, getBrandByCategory);

brandRouter.get("/category/brand/:brandId", adminAuth, getBrandById);

brandRouter.post("/category/add-new-brand", adminAuth, upload.single("image"), addNewBrand);

brandRouter.put("/category/update-brand/:brandId", adminAuth, upload.single("image"), updateBrandById);

brandRouter.patch("/category/update-brand-status/:brandId", adminAuth, updateBrandStatusById);

brandRouter.delete("/category/delete-brand/:brandId", adminAuth, deleteBrandById);

export default brandRouter;