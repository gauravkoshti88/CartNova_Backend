import Cart from "../../models/user/cartItemSchema.js";
import Product from "../../models/productSchema.js";

import { findProductVariant } from "../../utils/findProductVariant.js";

// CART POPULATE

const populateCart = async (cart) => {
  await cart.populate({
    path: "items.product",
    select:
      "slug basicInfo media attributes variants inventory shipping warranty publish returnPolicy",
    populate: [
      {
        path: "basicInfo.category",
        select: "name slug",
      },
      {
        path: "basicInfo.brand",
        select: "name slug",
      },
      {
        path: "basicInfo.subCategory",
        select: "name slug",
      },
      {
        path: "basicInfo.childCategory",
        select: "name slug",
      },
    ],
  });

  return cart;
};

// GET CART

export const getCart = async (req, res) => {
  try {
    const userId = req.userId;

    let cart = await Cart.findOne({
      user: userId,
    });

    // --------------------------------------------------
    // Cart doesn't exist
    // --------------------------------------------------

    if (!cart) {
      return res.status(200).json({
        success: true,
        message: "Cart fetched successfully",
        cart: {
          user: userId,
          items: [],
        },
      });
    }

    // --------------------------------------------------
    // Populate products
    // --------------------------------------------------

    cart = await populateCart(cart);

    return res.status(200).json({
      success: true,
      message: "Cart fetched successfully",
      cart,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch cart",
      error: error.message,
    });
  }
};

/*
|--------------------------------------------------------------------------
| ADD TO CART
|--------------------------------------------------------------------------
*/

export const addToCart = async (req, res) => {
  try {
    const userId = req.userId;

    const { productId, variantId, quantity = 1 } = req.body;

    const requestedQuantity = Number(quantity);

    // ==========================================================
    // BASIC VALIDATION
    // ==========================================================

    if (!productId) {
      return res.status(400).json({
        success: false,
        message: "Product is required",
      });
    }

    if (!variantId) {
      return res.status(400).json({
        success: false,
        message: "Variant is required",
      });
    }

    if (!Number.isInteger(requestedQuantity) || requestedQuantity < 1) {
      return res.status(400).json({
        success: false,
        message: "Quantity must be at least 1",
      });
    }

    // ==========================================================
    // FIND PRODUCT
    // ==========================================================

    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // ==========================================================
    // PRODUCT AVAILABILITY
    // ==========================================================

    if (product.publish?.status !== "published") {
      return res.status(400).json({
        success: false,
        message: "Product is not available",
      });
    }

    // ==========================================================
    // FIND VARIANT
    // ==========================================================

    const variant = findProductVariant(product, variantId);

    if (!variant) {
      return res.status(404).json({
        success: false,
        message: "Selected variant not found",
      });
    }

    // ==========================================================
    // INVENTORY SETTINGS
    // ==========================================================

    const trackInventory = product.inventory?.trackInventory !== false;

    const allowBackorder = product.inventory?.allowBackorder === true;

    const maxOrderQty = Number(product.inventory?.maxOrderQty || 10);

    // ==========================================================
    // MAX ORDER QUANTITY - INITIAL REQUEST
    // ==========================================================

    if (requestedQuantity > maxOrderQty) {
      return res.status(400).json({
        success: false,
        message: `You can add a maximum of ${maxOrderQty} items of this product.`,
      });
    }

    // ==========================================================
    // STOCK CHECK - INITIAL REQUEST
    // ==========================================================

    if (
      trackInventory &&
      !allowBackorder &&
      requestedQuantity > variant.stock
    ) {
      return res.status(400).json({
        success: false,
        message: `Only ${variant.stock} items available.`,
      });
    }

    // ==========================================================
    // FIND / CREATE CART
    // ==========================================================

    let cart = await Cart.findOne({
      user: userId,
    });

    if (!cart) {
      cart = new Cart({
        user: userId,
        items: [],
      });
    }

    // ==========================================================
    // FIND EXISTING ITEM
    // ==========================================================

    const existingItem = cart.items.find(
      (item) =>
        String(item.product) === String(productId) &&
        String(item.variantId) === String(variantId),
    );

    // ==========================================================
    // EXISTING ITEM
    // ==========================================================

    if (existingItem) {
      const newQuantity =
        Number(existingItem.quantity || 0) + requestedQuantity;

      // --------------------------------------------------------
      // MAX ORDER QUANTITY
      // --------------------------------------------------------

      if (newQuantity > maxOrderQty) {
        const remainingQuantity = Math.max(
          maxOrderQty - Number(existingItem.quantity || 0),
          0,
        );

        if (remainingQuantity === 0) {
          return res.status(400).json({
            success: false,
            message: `You have already reached the maximum limit of ${maxOrderQty} items for this product.`,
          });
        }

        return res.status(400).json({
          success: false,
          message: `You can add only ${remainingQuantity} more item${
            remainingQuantity > 1 ? "s" : ""
          }. Maximum limit is ${maxOrderQty}.`,
        });
      }

      // --------------------------------------------------------
      // STOCK CHECK
      // --------------------------------------------------------

      if (trackInventory && !allowBackorder && newQuantity > variant.stock) {
        return res.status(400).json({
          success: false,
          message: `Only ${variant.stock} items available.`,
        });
      }

      // --------------------------------------------------------
      // UPDATE EXISTING QUANTITY
      // --------------------------------------------------------

      existingItem.quantity = newQuantity;
    }

    // ==========================================================
    // NEW ITEM
    // ==========================================================
    else {
      cart.items.push({
        product: productId,
        variantId: String(variantId),
        quantity: requestedQuantity,
      });
    }

    // ==========================================================
    // SAVE CART
    // ==========================================================

    await cart.save();

    // ==========================================================
    // POPULATE CART
    // ==========================================================

    cart = await populateCart(cart);

    // ==========================================================
    // RESPONSE
    // ==========================================================

    return res.status(200).json({
      success: true,
      message: "Product added to cart",
      cart,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to add product to cart",
      error: error.message,
    });
  }
};

// Merge cart

export const mergeGuestCart = async (req, res) => {
  try {
    const userId = req.userId;

    const { items } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(200).json({
        success: true,
        message: "No guest cart items to merge",
        cart: {
          user: userId,
          items: [],
        },
      });
    }

    let cart = await Cart.findOne({
      user: userId,
    });

    if (!cart) {
      cart = new Cart({
        user: userId,
        items: [],
      });
    }

    for (const guestItem of items) {
      // IMPORTANT:
      // Guest cart uses productId
      const { productId, variantId, quantity } = guestItem;

      const requestedQuantity = Number(quantity);

      // ---------------------------------------------------------
      // VALIDATION
      // ---------------------------------------------------------

      if (
        !productId ||
        !variantId ||
        !Number.isInteger(requestedQuantity) ||
        requestedQuantity < 1
      ) {
        continue;
      }

      // ---------------------------------------------------------
      // PRODUCT
      // ---------------------------------------------------------

      const product = await Product.findById(productId);

      if (!product) {
        continue;
      }

      // ---------------------------------------------------------
      // PUBLISH STATUS
      // ---------------------------------------------------------

      if (product.publish?.status !== "published") {
        continue;
      }

      // ---------------------------------------------------------
      // VARIANT
      // ---------------------------------------------------------

      const variant = findProductVariant(product, variantId);

      if (!variant) {
        continue;
      }

      // ---------------------------------------------------------
      // INVENTORY
      // ---------------------------------------------------------

      const trackInventory = product.inventory?.trackInventory !== false;

      const allowBackorder = product.inventory?.allowBackorder === true;

      // ---------------------------------------------------------
      // EXISTING ITEM
      // ---------------------------------------------------------

      const existingItem = cart.items.find(
        (item) =>
          String(item.product) === String(productId) &&
          String(item.variantId) === String(variantId),
      );

      // ---------------------------------------------------------
      // UPDATE EXISTING
      // ---------------------------------------------------------

      if (existingItem) {
        let newQuantity = existingItem.quantity + requestedQuantity;

        if (trackInventory && !allowBackorder) {
          newQuantity = Math.min(newQuantity, Number(variant.stock || 0));
        }

        if (newQuantity > 0) {
          existingItem.quantity = newQuantity;
        }
      }

      // ---------------------------------------------------------
      // ADD NEW
      // ---------------------------------------------------------
      else {
        let finalQuantity = requestedQuantity;

        if (trackInventory && !allowBackorder) {
          finalQuantity = Math.min(
            requestedQuantity,
            Number(variant.stock || 0),
          );
        }

        if (finalQuantity > 0) {
          cart.items.push({
            product: productId,
            variantId,
            quantity: finalQuantity,
          });
        }
      }
    }

    // ---------------------------------------------------------
    // SAVE
    // ---------------------------------------------------------

    await cart.save();

    // ---------------------------------------------------------
    // POPULATE
    // ---------------------------------------------------------

    await cart.populate({
      path: "items.product",
      select: "slug basicInfo media attributes variants inventory publish",
    });

    return res.status(200).json({
      success: true,
      message: "Guest cart merged successfully",
      cart,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to merge guest cart",
      error: error.message,
    });
  }
};

/*
|--------------------------------------------------------------------------
| UPDATE CART ITEM QUANTITY
|--------------------------------------------------------------------------
*/

export const updateCartItem = async (req, res) => {
  try {
    const userId = req.userId;

    const { itemId } = req.params;

    const quantity = Number(req.body.quantity);

    // ==========================================================
    // BASIC VALIDATION
    // ==========================================================

    if (!Number.isInteger(quantity) || quantity < 1) {
      return res.status(400).json({
        success: false,
        message: "Quantity must be at least 1",
      });
    }

    // ==========================================================
    // FIND CART
    // ==========================================================

    let cart = await Cart.findOne({
      user: userId,
    });

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: "Cart not found",
      });
    }

    // ==========================================================
    // FIND CART ITEM
    // ==========================================================

    const item = cart.items.id(itemId);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Cart item not found",
      });
    }

    // ==========================================================
    // FIND PRODUCT
    // ==========================================================

    const product = await Product.findById(item.product);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product no longer exists",
      });
    }

    // ==========================================================
    // PRODUCT AVAILABILITY
    // ==========================================================

    if (product.publish?.status !== "published") {
      return res.status(400).json({
        success: false,
        message: "Product is no longer available",
      });
    }

    // ==========================================================
    // FIND VARIANT
    // ==========================================================

    const variant = findProductVariant(product, item.variantId);

    if (!variant) {
      return res.status(404).json({
        success: false,
        message: "Selected variant no longer exists",
      });
    }

    // ==========================================================
    // INVENTORY SETTINGS
    // ==========================================================

    const trackInventory = product.inventory?.trackInventory !== false;

    const allowBackorder = product.inventory?.allowBackorder === true;

    const maxOrderQty = Number(product.inventory?.maxOrderQty || 10);

    // ==========================================================
    // MAX ORDER QUANTITY
    // ==========================================================

    if (quantity > maxOrderQty) {
      return res.status(400).json({
        success: false,
        message: `You can add a maximum of ${maxOrderQty} items of this product.`,
      });
    }

    // ==========================================================
    // STOCK CHECK
    // ==========================================================

    if (trackInventory && !allowBackorder && quantity > variant.stock) {
      return res.status(400).json({
        success: false,
        message: `Only ${variant.stock} items available.`,
      });
    }

    // ==========================================================
    // UPDATE QUANTITY
    // ==========================================================

    item.quantity = quantity;

    // ==========================================================
    // SAVE CART
    // ==========================================================

    await cart.save();

    // ==========================================================
    // POPULATE CART
    // ==========================================================

    cart = await populateCart(cart);

    // ==========================================================
    // RESPONSE
    // ==========================================================

    return res.status(200).json({
      success: true,
      message: "Cart quantity updated",
      cart,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to update cart",
      error: error.message,
    });
  }
};

/*
|--------------------------------------------------------------------------
| REMOVE CART ITEM
|--------------------------------------------------------------------------
*/

export const removeCartItem = async (req, res) => {
  try {
    const userId = req.userId;

    const { itemId } = req.params;

    // --------------------------------------------------
    // FIND CART
    // --------------------------------------------------

    let cart = await Cart.findOne({
      user: userId,
    });

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: "Cart not found",
      });
    }

    // --------------------------------------------------
    // FIND ITEM
    // --------------------------------------------------

    const item = cart.items.id(itemId);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Cart item not found",
      });
    }

    // --------------------------------------------------
    // REMOVE
    // --------------------------------------------------

    item.deleteOne();

    await cart.save();

    // --------------------------------------------------
    // POPULATE
    // --------------------------------------------------

    cart = await populateCart(cart);

    return res.status(200).json({
      success: true,
      message: "Cart item removed",
      cart,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to remove cart item",
      error: error.message,
    });
  }
};

/*
|--------------------------------------------------------------------------
| CLEAR CART
|--------------------------------------------------------------------------
*/

export const clearCart = async (req, res) => {
  try {
    const userId = req.userId;

    // --------------------------------------------------
    // FIND CART
    // --------------------------------------------------

    const cart = await Cart.findOne({
      user: userId,
    });

    // --------------------------------------------------
    // CART DOESN'T EXIST
    // --------------------------------------------------

    if (!cart) {
      return res.status(200).json({
        success: true,
        message: "Cart already empty",
        cart: {
          user: userId,
          items: [],
        },
      });
    }

    // --------------------------------------------------
    // CLEAR ITEMS
    // --------------------------------------------------

    cart.items = [];

    await cart.save();

    return res.status(200).json({
      success: true,
      message: "Cart cleared successfully",
      cart,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to clear cart",
      error: error.message,
    });
  }
};
