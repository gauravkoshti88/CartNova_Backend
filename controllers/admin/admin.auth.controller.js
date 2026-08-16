import bcrypt from "bcrypt";
import { adminToken, genrateToken } from "../../config/token.js";
import Admin from "../../models/admin/adminSchema.js";

export const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required.",
      });
    }

    const admin = await Admin.findOne({ email });

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Admin account not found",
      });
    }

    const comparePassword = await bcrypt.compare(password, admin.password);

    if (!comparePassword) {
      return res.status(400).json({
        success: false,
        message: "Password mismatch",
      });
    }

    const token = adminToken(admin._id);

    res.cookie("adminToken", token, {
      httpOnly: true,
      secure: false,
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    const adminObj = admin.toObject();
    delete adminObj.password;

    return res.status(200).json({
      success: true,
      message: "Admin Login Successfully ✅",
      adminObj,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: `Admin Login Error ${error}`,
    });
  }
};

export const adminLogout = async (req, res) => {
  try {
    res.clearCookie("adminToken", {
      httpOnly: true,
      secure: false,
      sameSite: "strict",
    });

    return res.status(200).json({
      success: true,
      message: "Admin logged out successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: `Admin Logout Error ${error}`,
    });
  }
};
