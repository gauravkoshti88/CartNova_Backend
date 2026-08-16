import express from "express";
import {
  getAllProductsByCategorySlug,
  getAllProductsByChildCategorySlug,
  getAllProductsBySubCategorySlug,
  getBestSellerProducts,
  getFeaturedProducts,
  getNewArrivalProducts,
  getProductById,
  getProductDetails,
  getProductDetailsById,
  getProducts,
  getProductsWithHighDiscount,
  getRelatedProducts,
} from "../../controllers/public/product.controller.js";
import {
  getBrandsByCategorySlug,
  getCategories,
  getSubCategoriesByCategorySlug,
} from "../../controllers/public/category.controller.js";

const publicRouter = express.Router();

publicRouter.get("/products", getProducts);

publicRouter.get("/products/featured", getFeaturedProducts);

publicRouter.get("/products/best-sellers", getBestSellerProducts);

publicRouter.get("/products/new-arrivals", getNewArrivalProducts);

publicRouter.get("/products/related/:slug", getRelatedProducts);

publicRouter.get("/product/:slug", getProductDetails);

publicRouter.get("/categories", getCategories);

publicRouter.get(
  "/categories/:categorySlug/sub-categories",
  getSubCategoriesByCategorySlug,
);

publicRouter.get("/categories/:categorySlug/brands", getBrandsByCategorySlug);

publicRouter.get("/products/category/:slug", getAllProductsByCategorySlug);

publicRouter.get(
  "/products/subcategory/:slug",
  getAllProductsBySubCategorySlug,
);

publicRouter.get(
  "/products/child-category/:slug",
  getAllProductsByChildCategorySlug,
);

publicRouter.get("/products/id/:productId", getProductDetailsById);

publicRouter.get("/product/id/:id", getProductById);

publicRouter.get("/products/discounted", getProductsWithHighDiscount);

export default publicRouter;
