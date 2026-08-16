import express from "express";
import {
  getUser,
  rateProduct,
  updateProfile,
} from "../../controllers/user/user.controller.js";
import { userAuth } from "../../middleware/Auth.js";
import upload from "../../middleware/multer.js";

const userRouter = express.Router();

userRouter.get("/profile", userAuth, getUser);

userRouter.put(
  "/update-profile",
  userAuth,
  upload.single("profileImage"),
  updateProfile,
);

userRouter.post("/product/:slug/rating", userAuth, rateProduct);

export default userRouter;
