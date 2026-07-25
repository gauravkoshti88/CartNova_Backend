import express from "express";
import { adminAuth } from '../../middleware/Auth.js'
import { addSubCategory, deleteSubCategory, getAllSubCategory, getSubCategoryByCategory, getSubCategoryById, updateSubCategory, updateSubCategoryStatus } from "../../controllers/admin/subCategory.controller.js";
import upload from '../../middleware/multer.js'

const subCategoryRouter = express.Router();

subCategoryRouter.get("/category/get-all-sub-category", adminAuth, getAllSubCategory);

subCategoryRouter.get("/category/get-sub-category/:categoryId", adminAuth, getSubCategoryByCategory);

subCategoryRouter.get("/category/sub-category/:id", adminAuth, getSubCategoryById);

subCategoryRouter.post("/category/add-sub-category", adminAuth, upload.single("image"), addSubCategory);

subCategoryRouter.put("/category/update-sub-category/:id", adminAuth, upload.single("image"), updateSubCategory);

subCategoryRouter.patch("/category/update-sub-category-status/:id", adminAuth, updateSubCategoryStatus);

subCategoryRouter.delete("/category/delete-sub-category/:id", adminAuth, deleteSubCategory);

export default subCategoryRouter;