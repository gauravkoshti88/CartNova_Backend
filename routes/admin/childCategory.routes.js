import express from "express";

import {
  getAllChildCategory,
  getChildCategoryBySlug,
  updateChildCategory,
  updateChildCategoryStatus,
  deleteChildCategoryBySlug,
  undoChildCategoryBySlug,
  createChildCategory,
  getChildCategoriesBySubCategorySlug,
} from "../../controllers/admin/childCategory.controller.js";
import { adminAuth } from "../../middleware/Auth.js";
import upload from "../../middleware/multer.js";

const childCategoryRouter = express.Router();

// GET ALL CHILD CATEGORIES
childCategoryRouter.get("/", adminAuth, getAllChildCategory);

childCategoryRouter.get(
  "/sub-category/:slug/child-categories",
  adminAuth,
  getChildCategoriesBySubCategorySlug,
);

childCategoryRouter.post(
  "/create",
  adminAuth,
  upload.single("image"),
  createChildCategory,
);

// GET CHILD CATEGORY BY SLUG
childCategoryRouter.get("/:slug", adminAuth, getChildCategoryBySlug);

// UPDATE CHILD CATEGORY
childCategoryRouter.put(
  "/update/:slug",
  adminAuth,
  upload.single("image"),
  updateChildCategory,
);

// UPDATE CHILD CATEGORY STATUS
childCategoryRouter.patch(
  "/update/:slug/status",
  adminAuth,
  updateChildCategoryStatus,
);

// DELETE CHILD CATEGORY
childCategoryRouter.patch(
  "/:slug/delete",
  adminAuth,
  deleteChildCategoryBySlug,
);

// UNDO CHILD CATEGORY
childCategoryRouter.patch("/:slug/undo", adminAuth, undoChildCategoryBySlug);

export default childCategoryRouter;
