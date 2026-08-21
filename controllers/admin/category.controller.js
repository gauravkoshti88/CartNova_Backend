import mongoose from "mongoose";
import slugify from "slugify";
import Category from "../../models/categorySchema.js";
import SubCategory from "../../models/subCategorySchema.js";
import Product from "../../models/productSchema.js";
import {
  deleteFromCloudinary,
  updateCloudinaryImage,
  uploadToCloudinary,
} from "../../utils/cloudinaryFunc.js";

export const addCategory = async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Category name is required",
      });
    }

    const categoryExists = await Category.findOne({ name: name.trim() });

    if (categoryExists) {
      return res.status(400).json({
        success: false,
        message: `${categoryExists.name} Category already exists`,
      });
    }

    let image = {
      url: "",
      public_id: "",
    };

    if (req.file) {
      const result = await uploadToCloudinary(req.file.buffer, "categories");
      image = {
        url: result.secure_url,
        public_id: result.public_id,
      };
    }

    const baseSlug = slugify(name.trim(), {
      lower: true,
      strict: true,
      trim: true,
    });

    let slug = baseSlug;
    let counter = 1;

    while (await Category.exists({ slug })) {
      slug = `${baseSlug}-${counter++}`;
    }

    const category = await Category.create({
      name: name.trim(),
      slug,
      description,
      image,
    });

    return res.status(201).json({
      success: true,
      message: "Category Added Successfully ✅",
      category,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: `Add Category Error ${error}`,
    });
  }
};

export const categoryList = async (req, res) => {
  try {
    const categories = await Category.find({
      isDelete: false,
    }).select("name slug image description status createdAt");

    return res.status(200).json({
      success: true,
      message: "Get Categories List Successfully",
      count: categories.length,
      categories,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: `Category List Error ${error}`,
    });
  }
};

export const getCategoryBySlug = async (req, res) => {
  try {
    const { slug } = req.params;

    const category = await Category.findOne({
      slug,
      isDelete: false,
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    const subCategories = await SubCategory.find({
      category: category._id,
      isDelete: false,
    }).select("name slug image");

    const productCount = await Product.countDocuments({
      "basicInfo.category": category._id,
    });

    return res.status(200).json({
      success: true,
      message: `Get ${category?.name} Category Successfully`,
      category,
      existSubCategory: subCategories,
      productCount,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: `Get Single Category Error ${error}`,
    });
  }
};

export const updateCategory = async (req, res) => {
  try {
    const { slug } = req.params;
    const { name, description, status } = req.body;

    const category = await Category.findOne({
      slug,
      isDelete: false,
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    if (name && name.trim() !== category.name) {
      const baseSlug = slugify(name.trim(), {
        lower: true,
        strict: true,
        trim: true,
      });

      let newSlug = baseSlug;
      let counter = 1;

      while (
        await Category.exists({
          slug: newSlug,
          _id: { $ne: category._id },
        })
      ) {
        newSlug = `${baseSlug}-${counter++}`;
      }

      category.name = name.trim();
      category.slug = newSlug;
    }

    if (req.file) {
      const result = await updateCloudinaryImage(
        req.file.buffer,
        category.image.public_id,
        "categories",
      );

      category.image = {
        url: result.secure_url,
        public_id: result.public_id,
      };
    }

    if (description !== undefined) {
      category.description = description;
    }

    if (status) {
      category.status = status;
    }

    await category.save();

    return res.status(200).json({
      success: true,
      message: "Category Updated Successfully",
      category,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: `Update Category Error ${error.message}`,
    });
  }
};

export const updateCategoryStatus = async (req, res) => {
  try {
    const { slug } = req.params;
    const { status } = req.body;

    if (!["active", "inactive"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status",
      });
    }

    const category = await Category.findOne({
      slug,
      isDelete: false,
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    if (category.status == status) {
      return res.status(400).json({
        success: false,
        message: `Status already ${status}`,
      });
    }

    if (status) category.status = status;

    await category.save();

    return res.status(200).json({
      success: true,
      message: "Status Update Successfully",
      category,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: `Update Category Status Error ${error}`,
    });
  }
};

export const deleteCategory = async (req, res) => {
  try {
    const { slug } = req.params;

    const category = await Category.findOne({
      slug,
      isDelete: false,
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    category.isDelete = true;
    await category.save();

    return res.status(200).json({
      success: true,
      message: "Category deleted successfully.",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: `Delete Category Error ${error}`,
    });
  }
};

export const undoCategory = async (req, res) => {
  try {
    const { slug } = req.params;

    const category = await Category.findOne({
      slug,
      isDelete: true,
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    category.isDelete = false;
    await category.save();

    return res.status(200).json({
      success: true,
      message: "Category restored successfully.",
      category,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: `Undo Category Error ${error}`,
    });
  }
};

export const deletedCategoryList = async (req, res) => {
  try {
    const categories = await Category.find({
      isDelete: true,
    })
      .select("name slug image status createdAt")
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      message: "Deleted categories fetched successfully.",
      count: categories.length,
      categories,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: `Deleted Category List Error: ${error.message}`,
    });
  }
};
