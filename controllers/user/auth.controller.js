import User from "../../models/user/userSchema.js";
import validator from "validator";
import bycrpt from "bcrypt";
import { genrateToken } from "../../config/token.js";

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

    const hashedPassword = await bycrpt.hash(password, 10);

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
      secure: false,
      sameSite: "strict",
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

    const comparePassword = await bycrpt.compare(password, existUser.password);

    if (!comparePassword) {
      return res.status(400).json({
        success: false,
        message: "Password mismatch",
      });
    }

    const token = genrateToken(existUser._id);

    res.cookie("userToken", token, {
      httpOnly: true,
      secure: false,
      sameSite: "strict",
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
      secure: false,
      sameSite: "strict",
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
