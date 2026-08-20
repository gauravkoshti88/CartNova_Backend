import express from "express";
import {
  googleLogin,
  resetPassword,
  sendLoginOtp,
  sendResetPasswordOtp,
  userLogin,
  userLogout,
  userRegister,
  verifyLoginOtp,
  verifyResetPasswordOtp,
} from "../../controllers/user/auth.controller.js";

const authRouter = express.Router();

authRouter.post("/user-register", userRegister);
authRouter.post("/user-login", userLogin);
authRouter.post("/user-logout", userLogout);

authRouter.post("/google-login", googleLogin);

// OTP LOGIN
authRouter.post("/send-login-otp", sendLoginOtp);
authRouter.post("/verify-login-otp", verifyLoginOtp);

authRouter.post("/forgot-password/send-otp", sendResetPasswordOtp);

authRouter.post("/forgot-password/verify-otp", verifyResetPasswordOtp);

authRouter.post("/forgot-password/reset", resetPassword);

export default authRouter;
