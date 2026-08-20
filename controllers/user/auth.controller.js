import User from "../../models/user/userSchema.js";
import validator from "validator";
import bcrypt from "bcrypt";
import { genrateToken } from "../../config/token.js";
import crypto from "crypto";

import LoginOtp from "../../models/user/loginOtpSchema.js";
import PasswordResetOtp from "../../models/user/passwordResetOtpSchema.js";
import { generateOtp, generateResetToken, hashOtp } from "../../utils/otp.js";

export const userRegister = async (req, res) => {
  try {
    const { firstName, lastName, email, password, phone } = req.body;

    const existUser = await User.findOne({ email });

    if (existUser) {
      return res.status(409).json({
        success: false,
        message: `User with email ${email} already exists.`,
      });
    }

    if (!firstName || !lastName || !email || !password || !phone) {
      return res.status(400).json({
        success: false,
        message: "Required all fields are required",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters long.",
      });
    }

    if (!validator.isEmail(email)) {
      return res.status(400).json({
        success: false,
        message: "Invalid email format.",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      firstName,
      lastName,
      email,
      password: hashedPassword,
      phone,
    });

    const token = genrateToken(newUser._id);

    res.cookie("userToken", token, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    const userObj = newUser.toObject();
    delete userObj.password;

    return res.status(201).json({
      success: true,
      message: "User Register Successfully ✅",
      user: {
        firstName,
        lastName,
        email,
        phone,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: `User Register Error ${error}`,
    });
  }
};

export const userLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    const existUser = await User.findOne({ email });

    if (!existUser) {
      return res.status(409).json({
        success: false,
        message: `User with email ${email} does not exists.`,
      });
    }

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required.",
      });
    }

    const comparePassword = await bcrypt.compare(password, existUser.password);

    if (!comparePassword) {
      return res.status(400).json({
        success: false,
        message: "Password mismatch",
      });
    }

    const token = genrateToken(existUser._id);

    res.cookie("userToken", token, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    const userObj = existUser.toObject();
    delete userObj.password;

    return res.status(200).json({
      success: true,
      message: "User Login Successfully ✅",
      userObj,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: `User Login Error ${error}`,
    });
  }
};

export const userLogout = async (req, res) => {
  try {
    res.clearCookie("userToken", {
      httpOnly: true,
      secure: true,
      sameSite: "none",
    });

    return res.status(200).json({
      success: true,
      message: "User logged out successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: `User Logout Error ${error}`,
    });
  }
};

export const sendLoginOtp = async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({
        success: false,
        message: "Phone number is required.",
      });
    }

    const normalizedPhone = String(phone).trim();

    const existUser = await User.findOne({
      phone: normalizedPhone,
    });

    if (!existUser) {
      return res.status(404).json({
        success: false,
        message: "No account found with this phone number.",
      });
    }

    if (existUser.isBlocked) {
      return res.status(403).json({
        success: false,
        message: existUser.blockedReason || "Your account has been blocked.",
      });
    }

    const otp = crypto.randomInt(100000, 1000000).toString();

    const otpHash = await bcrypt.hash(otp, 10);

    await LoginOtp.deleteMany({
      phone: normalizedPhone,
    });

    await LoginOtp.create({
      phone: normalizedPhone,
      otpHash,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      attempts: 0,
    });

    return res.status(200).json({
      success: true,
      message: "OTP sent successfully.",

      // DEV ONLY
      ...(process.env.NODE_ENV !== "production" && {
        devOtp: otp,
      }),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to send OTP.",
    });
  }
};

// ==================================================
// VERIFY LOGIN OTP
// ==================================================

export const verifyLoginOtp = async (req, res) => {
  try {
    const { phone, otp } = req.body;

    if (!phone || !otp) {
      return res.status(400).json({
        success: false,
        message: "Phone number and OTP are required.",
      });
    }

    const normalizedPhone = String(phone).trim();
    const normalizedOtp = String(otp).trim();

    if (!/^\d{6}$/.test(normalizedOtp)) {
      return res.status(400).json({
        success: false,
        message: "OTP must be 6 digits.",
      });
    }

    const otpRecord = await LoginOtp.findOne({
      phone: normalizedPhone,
    });

    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        message: "OTP expired or not found. Please request a new OTP.",
      });
    }

    if (otpRecord.expiresAt < new Date()) {
      await LoginOtp.deleteOne({
        _id: otpRecord._id,
      });

      return res.status(400).json({
        success: false,
        message: "OTP has expired. Please request a new OTP.",
      });
    }

    if (otpRecord.attempts >= 5) {
      await LoginOtp.deleteOne({
        _id: otpRecord._id,
      });

      return res.status(429).json({
        success: false,
        message: "Too many incorrect attempts. Please request a new OTP.",
      });
    }

    const isValidOtp = await bcrypt.compare(normalizedOtp, otpRecord.otpHash);

    if (!isValidOtp) {
      otpRecord.attempts += 1;
      await otpRecord.save();

      return res.status(400).json({
        success: false,
        message: "Invalid OTP.",
      });
    }

    const existUser = await User.findOne({
      phone: normalizedPhone,
    });

    if (!existUser) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    if (existUser.isBlocked) {
      return res.status(403).json({
        success: false,
        message: existUser.blockedReason || "Your account has been blocked.",
      });
    }

    await LoginOtp.deleteOne({
      _id: otpRecord._id,
    });

    const token = genrateToken(existUser._id);

    res.cookie("userToken", token, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    const userObj = existUser.toObject();

    delete userObj.password;

    return res.status(200).json({
      success: true,
      message: "Login with OTP successful ✅",
      userObj,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "OTP verification failed.",
    });
  }
};

export const sendResetPasswordOtp = async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({
        success: false,
        message: "Phone number is required.",
      });
    }

    const user = await User.findOne({ phone });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "No account found with this phone number.",
      });
    }

    if (user.isBlocked) {
      return res.status(403).json({
        success: false,
        message: "Your account is blocked.",
      });
    }

    // Remove old OTP
    await PasswordResetOtp.deleteMany({
      phone,
    });

    const otp = generateOtp();
    const otpHash = hashOtp(otp);

    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await PasswordResetOtp.create({
      phone,
      otpHash,
      expiresAt,
    });

    const response = {
      success: true,
      message: "OTP sent successfully.",
    };

    // DEVELOPMENT ONLY
    if (process.env.NODE_ENV !== "production") {
      response.devOtp = otp;
    }

    return res.status(200).json(response);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to send OTP.",
    });
  }
};

export const verifyResetPasswordOtp = async (req, res) => {
  try {
    const { phone, otp } = req.body;

    if (!phone || !otp) {
      return res.status(400).json({
        success: false,
        message: "Phone number and OTP are required.",
      });
    }

    const otpRecord = await PasswordResetOtp.findOne({
      phone,
      verified: false,
    }).sort({ createdAt: -1 });

    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        message: "OTP not found. Please request a new OTP.",
      });
    }

    if (otpRecord.expiresAt < new Date()) {
      await PasswordResetOtp.deleteOne({
        _id: otpRecord._id,
      });

      return res.status(400).json({
        success: false,
        message: "OTP has expired. Please request a new OTP.",
      });
    }

    if (otpRecord.attempts >= 5) {
      await PasswordResetOtp.deleteOne({
        _id: otpRecord._id,
      });

      return res.status(429).json({
        success: false,
        message: "Too many invalid attempts. Please request a new OTP.",
      });
    }

    const hashedOtp = hashOtp(otp);

    if (hashedOtp !== otpRecord.otpHash) {
      otpRecord.attempts += 1;

      await otpRecord.save();

      return res.status(400).json({
        success: false,
        message: "Invalid OTP.",
      });
    }

    const resetToken = generateResetToken();

    const resetTokenHash = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    otpRecord.verified = true;

    await otpRecord.save();

    // Store reset token temporarily
    await PasswordResetOtp.findByIdAndUpdate(otpRecord._id, {
      resetTokenHash,
      resetTokenExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
    });

    return res.status(200).json({
      success: true,
      message: "OTP verified successfully.",
      resetToken,
    });
  } catch (error) {
    console.error("VERIFY RESET PASSWORD OTP ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "OTP verification failed.",
    });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { phone, resetToken, newPassword, confirmPassword } = req.body;

    if (!phone || !resetToken || !newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "All fields are required.",
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Passwords do not match.",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters.",
      });
    }

    const resetTokenHash = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    const otpRecord = await PasswordResetOtp.findOne({
      phone,
      verified: true,
      resetTokenHash,
    });

    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired reset session.",
      });
    }

    if (
      !otpRecord.resetTokenExpiresAt ||
      otpRecord.resetTokenExpiresAt < new Date()
    ) {
      await PasswordResetOtp.deleteOne({
        _id: otpRecord._id,
      });

      return res.status(400).json({
        success: false,
        message: "Reset session has expired. Please start again.",
      });
    }

    const user = await User.findOne({ phone });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    if (user.password) {
      const isSamePassword = await bcrypt.compare(newPassword, user.password);

      if (isSamePassword) {
        return res.status(400).json({
          success: false,
          message:
            "This password is already in use. Please choose a different password.",
        });
      }
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    user.password = hashedPassword;

    await user.save();

    await PasswordResetOtp.deleteOne({
      _id: otpRecord._id,
    });

    return res.status(200).json({
      success: true,
      message: "Password reset successfully.",
    });
  } catch (error) {
    console.error("RESET PASSWORD ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to reset password.",
    });
  }
};
