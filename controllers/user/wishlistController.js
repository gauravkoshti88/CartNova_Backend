import mongoose from "mongoose";

import Wishlist from "../../models/user/wishlistSchema.js";
import Product from "../../models/productSchema.js";

// ==========================================================
// GET WISHLIST
// ==========================================================

export const getWishlist = async (req, res) => {
  try {
    const userId = req.userId;

    const wishlist = await Wishlist.findOne({
      user: userId,
    })
      .populate({
        path: "products",
        match: {
          "publish.status": "published",
          "publish.visibility": "public",
        },
        populate: [
          {
            path: "basicInfo.brand",
            select: "name slug image",
          },
          {
            path: "basicInfo.category",
            select: "name slug image",
          },
          {
            path: "basicInfo.subCategory",
            select: "name slug",
          },
        ],
      })
      .lean();

    return res.status(200).json({
      success: true,
      message: "Wishlist fetched successfully",
      wishlist: wishlist || {
        user: userId,
        products: [],
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch wishlist",
      error: error.message,
    });
  }
};

// ==========================================================
// ADD TO WISHLIST
// ==========================================================

export const addToWishlist = async (req, res) => {
  try {
    const userId = req.userId;
    const { productId } = req.body;

    if (!productId) {
      return res.status(400).json({
        success: false,
        message: "Product ID is required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID",
      });
    }

    const product = await Product.findOne({
      _id: productId,
      "publish.status": "published",
      "publish.visibility": "public",
    }).select("_id");

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    let wishlist = await Wishlist.findOne({
      user: userId,
    });

    if (!wishlist) {
      wishlist = await Wishlist.create({
        user: userId,
        products: [productId],
      });
    } else {
      const alreadyExists = wishlist.products.some(
        (id) => id.toString() === productId.toString(),
      );

      if (alreadyExists) {
        return res.status(200).json({
          success: true,
          message: "Product is already in wishlist",
          wishlist,
        });
      }

      wishlist.products.push(productId);
      await wishlist.save();
    }

    return res.status(200).json({
      success: true,
      message: "Product added to wishlist",
      wishlist,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to add product to wishlist",
      error: error.message,
    });
  }
};

// ==========================================================
// REMOVE FROM WISHLIST
// ==========================================================

export const removeFromWishlist = async (req, res) => {
  try {
    const userId = req.userId;
    const { productId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID",
      });
    }

    const wishlist = await Wishlist.findOne({
      user: userId,
    });

    if (!wishlist) {
      return res.status(404).json({
        success: false,
        message: "Wishlist not found",
      });
    }

    wishlist.products = wishlist.products.filter(
      (id) => id.toString() !== productId.toString(),
    );

    await wishlist.save();

    return res.status(200).json({
      success: true,
      message: "Product removed from wishlist",
      wishlist,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to remove product from wishlist",
      error: error.message,
    });
  }
};

// ==========================================================
// CLEAR WISHLIST
// ==========================================================

export const clearWishlist = async (req, res) => {
  try {
    const userId = req.userId;

    const wishlist = await Wishlist.findOne({
      user: userId,
    });

    if (!wishlist) {
      return res.status(200).json({
        success: true,
        message: "Wishlist is already empty",
        wishlist: {
          user: userId,
          products: [],
        },
      });
    }

    wishlist.products = [];

    await wishlist.save();

    return res.status(200).json({
      success: true,
      message: "Wishlist cleared successfully",
      wishlist,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to clear wishlist",
      error: error.message,
    });
  }
};

// ==========================================================
// MERGE GUEST WISHLIST
// ==========================================================

export const mergeWishlist = async (req, res) => {
  try {
    const userId = req.userId;
    const { productIds = [] } = req.body;

    if (!Array.isArray(productIds)) {
      return res.status(400).json({
        success: false,
        message: "productIds must be an array",
      });
    }

    // Remove invalid IDs
    const validProductIds = productIds.filter((id) =>
      mongoose.Types.ObjectId.isValid(id),
    );

    if (!validProductIds.length) {
      const wishlist = await Wishlist.findOne({
        user: userId,
      });

      return res.status(200).json({
        success: true,
        message: "Nothing to merge",
        wishlist: wishlist || {
          user: userId,
          products: [],
        },
      });
    }

    // Only allow currently public products
    const products = await Product.find({
      _id: {
        $in: validProductIds,
      },
      "publish.status": "published",
      "publish.visibility": "public",
    }).select("_id");

    const validIds = products.map((product) => product._id);

    let wishlist = await Wishlist.findOne({
      user: userId,
    });

    if (!wishlist) {
      wishlist = await Wishlist.create({
        user: userId,
        products: validIds,
      });
    } else {
      const existingIds = new Set(wishlist.products.map((id) => id.toString()));

      for (const productId of validIds) {
        if (!existingIds.has(productId.toString())) {
          wishlist.products.push(productId);
        }
      }

      await wishlist.save();
    }

    return res.status(200).json({
      success: true,
      message: "Guest wishlist merged successfully",
      wishlist,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to merge wishlist",
      error: error.message,
    });
  }
};
