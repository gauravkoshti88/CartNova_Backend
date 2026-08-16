import express from "express";

import {
  getCart,
  addToCart,
  updateCartItem,
  removeCartItem,
  clearCart,
  mergeGuestCart,
} from "../../controllers/user/cartController.js";

import { userAuth } from "../../middleware/Auth.js";

const cartRouter = express.Router();

cartRouter.get("/", userAuth, getCart);

cartRouter.post("/add", userAuth, addToCart);

cartRouter.post("/merge", userAuth, mergeGuestCart);

cartRouter.patch("/item/:itemId", userAuth, updateCartItem);

cartRouter.delete("/item/:itemId", userAuth, removeCartItem);

cartRouter.delete("/clear", userAuth, clearCart);

export default cartRouter;
