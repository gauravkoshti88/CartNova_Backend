import express from "express";
import { adminAuth } from "../../middleware/Auth.js";
import { addCategory, categoryList, deleteCategory, deletedCategoryList, getSingleCategory, undoCategory, updateCategory, updateCategoryStatus } from "../../controllers/admin/category.controller.js";
import upload from "../../middleware/multer.js";

const categoryRouter = express.Router();

categoryRouter.get("/category-list", adminAuth, categoryList);

categoryRouter.get("/deleted-category-list", adminAuth, deletedCategoryList);

categoryRouter.get("/category/:id", adminAuth, getSingleCategory);

categoryRouter.post("/add-category", adminAuth, upload.single("image"), addCategory);

categoryRouter.put("/update-category/:id", adminAuth, upload.single("image"), updateCategory);

categoryRouter.put("/undo-deleted-category/:id", adminAuth, undoCategory);

categoryRouter.patch("/update-category-status/:id", adminAuth, updateCategoryStatus);

categoryRouter.delete("/delete-category/:id", adminAuth, deleteCategory);

export default categoryRouter;