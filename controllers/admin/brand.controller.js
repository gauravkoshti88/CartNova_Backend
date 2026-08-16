import mongoose from "mongoose";
import ProductBrand from "../../models/brandSchema.js";
import Category from "../../models/categorySchema.js";
import SubCategory from "../../models/subCategorySchema.js";
import {
  deleteFromCloudinary,
  updateCloudinaryImage,
  uploadToCloudinary,
} from "../../utils/cloudinaryFunc.js";
import Product from "../../models/productSchema.js";
import slugify from "slugify";

export const addNewBrand = async (req, res) => {
  try {
    let { categories, name, description } = req.body;

    if (!Array.isArray(categories)) {
      categories = [categories];
    }

    if (!categories || !name || !description) {
      return res.status(400).json({
        success: false,
        message: "Required all fields",
      });
    }

    const categoryExist = await Category.find({
      _id: { $in: categories },
    });

    if (categoryExist.length !== categories.length) {
      return res.status(404).json({
        success: false,
        message: "One or more categories not found",
      });
    }

    const brandExists = await ProductBrand.findOne({
      name: name.trim(),
    });

    if (brandExists) {
      return res.status(400).json({
        success: false,
        message: `${brandExists.name} Product Brand already exists`,
      });
    }

    // Generate Unique Slug
    const baseSlug = slugify(name.trim(), {
      lower: true,
      strict: true,
      trim: true,
    });

    let slug = baseSlug;
    let counter = 1;

    while (await ProductBrand.exists({ slug })) {
      slug = `${baseSlug}-${counter++}`;
    }

    let image = {
      url: "",
      public_id: "",
    };

    if (req.file) {
      const result = await uploadToCloudinary(req.file.buffer, "productbrands");

      image = {
        url: result.secure_url,
        public_id: result.public_id,
      };
    }

    const newBrand = await ProductBrand.create({
      categories,
      name: name.trim(),
      slug,
      description,
      image,
    });

    return res.status(201).json({
      success: true,
      message: "New product brand created successfully ✅",
      newBrand,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: `Add brand error ${error.message}`,
    });
  }
};

export const getAllBrand = async (req, res) => {
  try {
    const brands = await ProductBrand.find({
      isDelete: false,
    })
      .populate("categories", "name slug")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      message: "All Product Brands fetched successfully",
      count: brands.length,
      brands,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Error fetching brands",
      error: error.message,
    });
  }
};

export const getBrandByCategory = async (req, res) => {
  try {
    const { categorySlug } = req.params;

    const category = await Category.findOne({
      slug: categorySlug,
      isDelete: false,
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    const brands = await ProductBrand.find({
      categories: category._id,
      isDelete: false,
    })
      .populate("categories", "name slug")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      message: `Brands under category ${category.name}`,
      count: brands.length,
      brands,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: `Get Brand By Category Error ${error.message}`,
    });
  }
};

export const getBrandBySlug = async (req, res) => {
  try {
    const { slug } = req.params;

    const productBrand = await ProductBrand.findOne({
      slug,
      isDelete: false,
    }).populate("categories", "name slug");

    if (!productBrand) {
      return res.status(404).json({
        success: false,
        message: "Product Brand not found",
      });
    }

    const productCount = await Product.countDocuments({
      "basicInfo.brand": productBrand._id,
    });

    return res.status(200).json({
      success: true,
      message: `Get ${productBrand.name} Product Brand Successfully`,
      productBrand,
      productCount,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      error: `Get Brand Error ${error.message}`,
    });
  }
};

export const updateBrand = async (req, res) => {
  try {
    const { slug } = req.params;
    const { name, description, status, categories } = req.body;

    const productBrand = await ProductBrand.findOne({
      slug,
      isDelete: false,
    }).populate("categories", "name slug");

    if (!productBrand) {
      return res.status(404).json({
        success: false,
        message: "Brand not found",
      });
    }

    // Check duplicate name
    if (name && name.trim() !== productBrand.name) {
      const exists = await ProductBrand.findOne({
        name: name.trim(),
        _id: { $ne: productBrand._id },
      });

      if (exists) {
        return res.status(400).json({
          success: false,
          message: "Product brand already exists",
        });
      }

      // Generate unique slug
      const baseSlug = slugify(name.trim(), {
        lower: true,
        strict: true,
        trim: true,
      });

      let newSlug = baseSlug;
      let counter = 1;

      while (
        await ProductBrand.exists({
          slug: newSlug,
          _id: { $ne: productBrand._id },
        })
      ) {
        newSlug = `${baseSlug}-${counter++}`;
      }

      productBrand.name = name.trim();
      productBrand.slug = newSlug;
    }

    if (categories !== undefined) {
      let categoryIds = categories;

      // Single category ko array mein convert
      if (!Array.isArray(categoryIds)) {
        categoryIds = [categoryIds];
      }

      // Empty array bhi allow karna hai ya nahi
      if (categoryIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: "At least one category is required",
        });
      }

      // Check categories exist
      const categoryExist = await Category.find({
        _id: { $in: categoryIds },
      });

      if (categoryExist.length !== categoryIds.length) {
        return res.status(400).json({
          success: false,
          message: "One or more categories not found",
        });
      }

      productBrand.categories = categoryIds;
    }

    if (req.file) {
      const result = await updateCloudinaryImage(
        req.file.buffer,
        productBrand.image.public_id,
        "productbrands",
      );

      productBrand.image = {
        url: result.secure_url,
        public_id: result.public_id,
      };
    }

    if (description !== undefined) {
      productBrand.description = description;
    }

    if (status) {
      productBrand.status = status;
    }

    await productBrand.save();

    return res.status(200).json({
      success: true,
      message: `Product Brand ${productBrand.name} Updated Successfully`,
      productBrand,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      error: `Update Brand Error ${error.message}`,
    });
  }
};

export const updateBrandStatus = async (req, res) => {
  try {
    const { slug } = req.params;
    const { status } = req.body;

    const brand = await ProductBrand.findOne({
      slug,
      isDelete: false,
    }).populate("categories", "name slug");

    if (!brand) {
      return res.status(404).json({
        success: false,
        message: "Brand not found",
      });
    }

    if (brand.status === status) {
      return res.status(400).json({
        success: false,
        message: `Brand already ${status}`,
      });
    }

    brand.status = status;

    await brand.save();

    return res.status(200).json({
      success: true,
      message: "Status Updated Successfully ✅",
      brand,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      error: `Update Brand Status Error ${error.message}`,
    });
  }
};

export const deleteBrand = async (req, res) => {
  try {
    const { slug } = req.params;

    const brand = await ProductBrand.findOne({
      slug,
      isDelete: false,
    });

    if (!brand) {
      return res.status(404).json({
        success: false,
        message: "Brand not found",
      });
    }

    brand.isDelete = true;

    await brand.save();

    return res.status(200).json({
      success: true,
      message: "Product Brand Deleted Successfully ✅",
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      error: `Delete Brand Error ${error.message}`,
    });
  }
};

export const undoDeletedBrand = async (req, res) => {
  try {
    const { slug } = req.params;

    const brand = await ProductBrand.findOne({
      slug,
      isDelete: true,
    });

    if (!brand) {
      return res.status(404).json({
        success: false,
        message: "Deleted Brand not found",
      });
    }

    brand.isDelete = false;

    await brand.save();

    return res.status(200).json({
      success: true,
      message: "Product Brand Restored Successfully ✅",
      brand,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      error: `Undo Brand Error ${error.message}`,
    });
  }
};

export const getAllDeletedBrand = async (req, res) => {
  try {
    const brands = await ProductBrand.find({
      isDelete: true,
    })
      .populate("categories", "name slug")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      message: "Deleted Product Brands fetched successfully",
      count: brands.length,
      brands,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Error fetching deleted brands",
      error: error.message,
    });
  }
};
