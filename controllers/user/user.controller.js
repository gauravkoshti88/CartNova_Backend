import User from "../../models/user/userSchema.js";
import Product from "../../models/productSchema.js";
import Review from "../../models/user/reviewSchema.js";

import {
  deleteFromCloudinary,
  uploadToCloudinary,
} from "../../utils/cloudinaryFunc.js";

// ============================================================
// GET USER
// ============================================================

export const getUser = async (req, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: No user ID",
      });
    }

    const user = await User.findById(req.userId).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (user.isBlocked) {
      return res.status(403).json({
        success: false,
        message: "User account is blocked",
      });
    }

    return res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: `Get User Error ${error}`,
    });
  }
};

// ============================================================
// UPDATE USER PROFILE
// ============================================================

export const updateProfile = async (req, res) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (user.isBlocked) {
      return res.status(403).json({
        success: false,
        message: "User account is blocked",
      });
    }

    const { firstName, lastName, email, phone, address } = req.body;

    // ========================================================
    // BASIC FIELDS
    // ========================================================

    if (firstName !== undefined) {
      user.firstName = String(firstName).trim();
    }

    if (lastName !== undefined) {
      user.lastName = String(lastName).trim();
    }

    if (email !== undefined) {
      user.email = String(email).trim().toLowerCase();
    }

    if (phone !== undefined) {
      user.phone = String(phone).trim();
    }

    // ========================================================
    // SINGLE ADDRESS
    // ========================================================

    if (address !== undefined) {
      let parsedAddress = address;

      // multipart/form-data me JSON string aayegi
      if (typeof address === "string") {
        try {
          parsedAddress = JSON.parse(address);
        } catch {
          return res.status(400).json({
            success: false,
            message: "Invalid address format",
          });
        }
      }

      // Address null/empty karna ho
      if (parsedAddress === null) {
        user.address = null;
      } else {
        // Address object hona chahiye
        if (typeof parsedAddress !== "object" || Array.isArray(parsedAddress)) {
          return res.status(400).json({
            success: false,
            message: "Address must be an object",
          });
        }

        user.address = parsedAddress;
      }
    }

    // ========================================================
    // PROFILE IMAGE
    // ========================================================

    if (req.file) {
      // Delete old image
      if (user.profileImage?.publicId) {
        await deleteFromCloudinary(user.profileImage.publicId);
      }

      // Upload new image
      const uploadedImage = await uploadToCloudinary(
        req.file.buffer,
        "cart-nova/users/profile",
      );

      user.profileImage = {
        url: uploadedImage.secure_url,
        publicId: uploadedImage.public_id,
        alt: `${user.firstName} ${user.lastName}`,
      };
    }

    // ========================================================
    // SAVE
    // ========================================================

    await user.save();

    const updatedUser = await User.findById(userId).select("-password");

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    console.error("UPDATE PROFILE ERROR:", error);

    // ========================================================
    // DUPLICATE EMAIL / PHONE
    // ========================================================

    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern || {})[0];

      return res.status(409).json({
        success: false,
        message:
          field === "email"
            ? "Email already exists"
            : field === "phone"
              ? "Phone number already exists"
              : "Email or phone already exists",
      });
    }

    // ========================================================
    // VALIDATION ERROR
    // ========================================================

    if (error.name === "ValidationError") {
      const message = Object.values(error.errors)
        .map((err) => err.message)
        .join(", ");

      return res.status(400).json({
        success: false,
        message,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to update profile",
      error: error.message,
    });
  }
};

export const rateProduct = async (req, res) => {
  try {
    const { slug } = req.params;
    const { rating, comment = "" } = req.body;

    const userId = req.user?._id;

    // -----------------------------------------
    // Validate User
    // -----------------------------------------

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Please login to rate this product",
      });
    }

    // -----------------------------------------
    // Validate Slug
    // -----------------------------------------

    if (!slug?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Product slug is required",
      });
    }

    // -----------------------------------------
    // Validate Rating
    // -----------------------------------------

    const numericRating = Number(rating);

    if (
      !Number.isInteger(numericRating) ||
      numericRating < 1 ||
      numericRating > 5
    ) {
      return res.status(400).json({
        success: false,
        message: "Rating must be between 1 and 5",
      });
    }

    // -----------------------------------------
    // Find Product By Slug
    // -----------------------------------------

    const product = await Product.findOne({
      slug: slug.trim().toLowerCase(),
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // -----------------------------------------
    // Check Existing Review
    // -----------------------------------------

    const existingReview = await Review.findOne({
      user: userId,
      product: product._id,
    });

    // =========================================
    // UPDATE EXISTING RATING
    // =========================================

    if (existingReview) {
      const oldRating = existingReview.rating;

      // Same rating
      if (oldRating === numericRating) {
        return res.status(400).json({
          success: false,
          message: "You have already given this rating",
        });
      }

      // Update review
      existingReview.rating = numericRating;

      if (comment !== undefined) {
        existingReview.comment = String(comment).trim();
      }

      await existingReview.save();

      // -----------------------------------------
      // Ensure Rating Structure Exists
      // -----------------------------------------

      if (!product.ratings) {
        product.ratings = {
          average: 0,
          count: 0,
          distribution: {
            1: 0,
            2: 0,
            3: 0,
            4: 0,
            5: 0,
          },
        };
      }

      if (!product.ratings.distribution) {
        product.ratings.distribution = {
          1: 0,
          2: 0,
          3: 0,
          4: 0,
          5: 0,
        };
      }

      // -----------------------------------------
      // Remove Old Rating
      // -----------------------------------------

      product.ratings.distribution[oldRating] = Math.max(
        0,
        (product.ratings.distribution[oldRating] || 0) - 1,
      );

      // -----------------------------------------
      // Add New Rating
      // -----------------------------------------

      product.ratings.distribution[numericRating] =
        (product.ratings.distribution[numericRating] || 0) + 1;

      // -----------------------------------------
      // Recalculate Rating
      // -----------------------------------------

      const distribution = product.ratings.distribution;

      const totalRatings =
        distribution[1] +
        distribution[2] +
        distribution[3] +
        distribution[4] +
        distribution[5];

      const totalScore =
        distribution[1] * 1 +
        distribution[2] * 2 +
        distribution[3] * 3 +
        distribution[4] * 4 +
        distribution[5] * 5;

      product.ratings.count = totalRatings;

      product.ratings.average =
        totalRatings > 0 ? Number((totalScore / totalRatings).toFixed(1)) : 0;

      await product.save();

      return res.status(200).json({
        success: true,
        message: "Product rating updated successfully",
        review: existingReview,
        ratings: product.ratings,
      });
    }

    // =========================================
    // CREATE NEW RATING
    // =========================================

    const review = await Review.create({
      user: userId,
      product: product._id,
      rating: numericRating,
      comment: String(comment).trim(),
    });

    // -----------------------------------------
    // Ensure Rating Structure Exists
    // -----------------------------------------

    if (!product.ratings) {
      product.ratings = {
        average: 0,
        count: 0,
        distribution: {
          1: 0,
          2: 0,
          3: 0,
          4: 0,
          5: 0,
        },
      };
    }

    if (!product.ratings.distribution) {
      product.ratings.distribution = {
        1: 0,
        2: 0,
        3: 0,
        4: 0,
        5: 0,
      };
    }

    // -----------------------------------------
    // Add Rating To Distribution
    // -----------------------------------------

    product.ratings.distribution[numericRating] =
      (product.ratings.distribution[numericRating] || 0) + 1;

    // -----------------------------------------
    // Calculate Average
    // -----------------------------------------

    const distribution = product.ratings.distribution;

    const totalRatings =
      distribution[1] +
      distribution[2] +
      distribution[3] +
      distribution[4] +
      distribution[5];

    const totalScore =
      distribution[1] * 1 +
      distribution[2] * 2 +
      distribution[3] * 3 +
      distribution[4] * 4 +
      distribution[5] * 5;

    product.ratings.count = totalRatings;

    product.ratings.average =
      totalRatings > 0 ? Number((totalScore / totalRatings).toFixed(1)) : 0;

    await product.save();

    // -----------------------------------------
    // Response
    // -----------------------------------------

    return res.status(201).json({
      success: true,
      message: "Product rated successfully",
      review,
      ratings: product.ratings,
    });
  } catch (error) {
    // -----------------------------------------
    // Duplicate Review Protection
    // -----------------------------------------

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "You have already rated this product",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to rate product",
      error: error.message,
    });
  }
};
