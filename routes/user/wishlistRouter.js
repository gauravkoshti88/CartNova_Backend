import express from "express";

import {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  clearWishlist,
  mergeWishlist,
} from "../../controllers/user/wishlistController.js";

import { userAuth } from "../../middleware/Auth.js";

const wishlistRouter = express.Router();

// Get wishlist
wishlistRouter.get("/", userAuth, getWishlist);

// Add product
wishlistRouter.post("/add", userAuth, addToWishlist);

// Remove product
wishlistRouter.delete("/remove/:productId", userAuth, removeFromWishlist);

// Clear wishlist
wishlistRouter.delete("/clear", userAuth, clearWishlist);

// Merge guest wishlist after login
wishlistRouter.post("/merge", userAuth, mergeWishlist);

export default wishlistRouter;
