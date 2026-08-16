import express from "express";

import {
  getCategories,
  getSubCategoriesByCategorySlug,
  getBrandsByCategorySlug,
  getChildCategoriesBySubCategory,
  getChildCategoriesByCategory,
} from "../../controllers/public/category.controller.js";

const publicCategoryRouter = express.Router();

publicCategoryRouter.get("/", getCategories);

publicCategoryRouter.get(
  "/:categorySlug/sub-categories",
  getSubCategoriesByCategorySlug,
);

publicCategoryRouter.get("/:categorySlug/brands", getBrandsByCategorySlug);

publicCategoryRouter.get(
  "/sub-category/:subCategorySlug/child-categories",
  getChildCategoriesBySubCategory,
);

publicCategoryRouter.get(
  "/:categorySlug/child-categories",
  getChildCategoriesByCategory,
);

export default publicCategoryRouter;
