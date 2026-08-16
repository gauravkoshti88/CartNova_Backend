import express from "express";
import { adminAuth } from '../../middleware/Auth.js'
import { addSubCategory, deleteSubCategory, getAllDeletedSubCategory, getAllSubCategory, getSubCategoryByCategory, getSubCategoryBySlug, undoSubCategory, updateSubCategory, updateSubCategoryStatus } from "../../controllers/admin/subCategory.controller.js";
import upload from '../../middleware/multer.js'

const subCategoryRouter = express.Router();

subCategoryRouter.get("/category/get-all-sub-category", adminAuth, getAllSubCategory);

subCategoryRouter.get("/category/get-all-deleted-sub-category", adminAuth, getAllDeletedSubCategory);

subCategoryRouter.get("/category/get-sub-category/:categorySlug", adminAuth, getSubCategoryByCategory);

subCategoryRouter.get("/category/sub-category/:slug", adminAuth, getSubCategoryBySlug);

subCategoryRouter.post("/category/add-sub-category", adminAuth, upload.single("image"), addSubCategory);

subCategoryRouter.put("/category/update-sub-category/:slug", adminAuth, upload.single("image"), updateSubCategory);

subCategoryRouter.put("/category/undo-deleted-sub-category/:slug", adminAuth, undoSubCategory);

subCategoryRouter.patch("/category/update-sub-category-status/:slug", adminAuth, updateSubCategoryStatus);

subCategoryRouter.delete("/category/delete-sub-category/:slug", adminAuth, deleteSubCategory);

export default subCategoryRouter;