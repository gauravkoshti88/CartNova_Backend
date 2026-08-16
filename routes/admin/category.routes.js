import express from "express";
import { adminAuth } from "../../middleware/Auth.js";
import { addCategory, categoryList, deleteCategory, deletedCategoryList, getCategoryBySlug, undoCategory, updateCategory, updateCategoryStatus } from "../../controllers/admin/category.controller.js";
import upload from "../../middleware/multer.js";

const categoryRouter = express.Router();

categoryRouter.get("/category-list", adminAuth, categoryList);

categoryRouter.get("/deleted-category-list", adminAuth, deletedCategoryList);

categoryRouter.get("/category/:slug", adminAuth, getCategoryBySlug);

categoryRouter.post("/add-category", adminAuth, upload.single("image"), addCategory);

categoryRouter.put("/update-category/:slug", adminAuth, upload.single("image"), updateCategory);

categoryRouter.put("/undo-deleted-category/:slug", adminAuth, undoCategory);

categoryRouter.patch("/update-category-status/:slug", adminAuth, updateCategoryStatus);

categoryRouter.delete("/delete-category/:slug", adminAuth, deleteCategory);

export default categoryRouter;