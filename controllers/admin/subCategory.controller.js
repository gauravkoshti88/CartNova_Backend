import SubCategory from "../../models/subCategorySchema.js";
import Category from "../../models/categorySchema.js";
import {
  deleteFromCloudinary,
  updateCloudinaryImage,
  uploadToCloudinary,
} from "../../utils/cloudinaryFunc.js";
import mongoose from "mongoose";
import slugify from "slugify";
import Product from "../../models/productSchema.js";

export const addSubCategory = async (req, res) => {
  try {
    const { category, name, description, status } = req.body;

    // -----------------------------------------
    // VALIDATION
    // -----------------------------------------

    if (!category || !name?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Category and Sub-Category name are required",
      });
    }

    // -----------------------------------------
    // FIND CATEGORY
    // -----------------------------------------

    const categoryExist = await Category.findOne({
      _id: category,
      isDelete: false,
    });

    if (!categoryExist) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    // -----------------------------------------
    // CHECK DUPLICATE SUB-CATEGORY
    // -----------------------------------------

    const trimmedName = name.trim();

    const subCategoryExists = await SubCategory.findOne({
      category: categoryExist._id,
      name: trimmedName,
      isDelete: false,
    });

    if (subCategoryExists) {
      return res.status(409).json({
        success: false,
        message: `${trimmedName} sub-category already exists in this category`,
      });
    }

    // -----------------------------------------
    // IMAGE UPLOAD
    // -----------------------------------------

    let image = {
      url: "",
      public_id: "",
    };

    if (req.file) {
      const result = await uploadToCloudinary(req.file.buffer, "subcategories");

      image = {
        url: result.secure_url,
        public_id: result.public_id,
      };
    }

    // -----------------------------------------
    // GENERATE UNIQUE SLUG
    // -----------------------------------------

    const baseSlug = slugify(trimmedName, {
      lower: true,
      strict: true,
      trim: true,
    });

    let slug = baseSlug;
    let counter = 1;

    while (
      await SubCategory.exists({
        category: categoryExist._id,
        slug,
        isDelete: false,
      })
    ) {
      slug = `${baseSlug}-${counter++}`;
    }

    // -----------------------------------------
    // CREATE SUB-CATEGORY
    // -----------------------------------------

    const subCategory = await SubCategory.create({
      category: categoryExist._id,
      name: trimmedName,
      slug,
      description: description?.trim() || "",
      status: status || "active",
      image,
      isDelete: false,
    });

    // -----------------------------------------
    // RETURN POPULATED DATA
    // -----------------------------------------

    const createdSubCategory = await SubCategory.findById(subCategory._id)
      .populate({
        path: "category",
        select: "name slug",
      })
      .lean();

    return res.status(201).json({
      success: true,
      message: "Sub-Category created successfully",
      subCategory: createdSubCategory,
    });
  } catch (error) {
    console.error("ADD SUB CATEGORY ERROR:", error);

    // -----------------------------------------
    // DUPLICATE KEY ERROR
    // -----------------------------------------

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Sub-Category already exists",
      });
    }

    // -----------------------------------------
    // INVALID OBJECT ID
    // -----------------------------------------

    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid category ID",
      });
    }

    // -----------------------------------------
    // SERVER ERROR
    // -----------------------------------------

    return res.status(500).json({
      success: false,
      message: "Failed to create sub-category",
      error: error.message,
    });
  }
};

export const getAllSubCategory = async (req, res) => {
  try {
    const allSubCategory = await SubCategory.find({
      isDelete: false,
    }).populate("category", "name slug");

    return res.status(200).json({
      success: true,
      message: "Sub-Categories fetched successfully",
      count: allSubCategory.length,
      allSubCategory,
    });
  } catch (error) {
    console.error("Error in getAllSubCategory:", error);

    return res.status(500).json({
      success: false,
      message: "Error fetching sub-categories",
      error: error.message,
    });
  }
};

export const getSubCategoryByCategory = async (req, res) => {
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

    const subCategory = await SubCategory.find({
      category: category._id,
      isDelete: false,
    })
      .populate("category", "name slug")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      message: `Get All Sub-category by ${category.name}`,
      count: subCategory.length,
      subCategory,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: `Get Sub-Category By Category Error ${error}`,
    });
  }
};

export const getSubCategoryBySlug = async (req, res) => {
  try {
    const { slug } = req.params;

    const subCategory = await SubCategory.findOne({
      slug,
      isDelete: false,
    }).populate("category", "name slug");

    if (!subCategory) {
      return res.status(404).json({
        success: false,
        message: "Sub-Category not found",
      });
    }

    const productCount = await Product.countDocuments({
      "basicInfo.subCategory": subCategory._id,
    });

    return res.status(200).json({
      success: true,
      message: `Get ${subCategory.name} Sub-Category Successfully`,
      subCategory,
      productCount,
    });
  } catch (error) {
    console.error("Get SubCategory By Slug Error:", error);

    return res.status(500).json({
      success: false,
      message: "Error fetching sub-category",
      error: error.message,
    });
  }
};

export const updateSubCategory = async (req, res) => {
  try {
    const { slug } = req.params;
    const { name, description, status, category } = req.body;

    const subCategory = await SubCategory.findOne({
      slug,
      isDelete: false,
    });

    if (!subCategory) {
      return res.status(404).json({
        success: false,
        message: "Sub-Category not found",
      });
    }

    if (name && name.trim() !== subCategory.name) {
      const baseSlug = slugify(name.trim(), {
        lower: true,
        strict: true,
        trim: true,
      });

      let newSlug = baseSlug;
      let counter = 1;

      while (
        await SubCategory.exists({
          category: subCategory.category,
          slug: newSlug,
          _id: { $ne: subCategory._id },
        })
      ) {
        newSlug = `${baseSlug}-${counter++}`;
      }

      subCategory.name = name.trim();
      subCategory.slug = newSlug;
    }

    if (category !== undefined) {
      const newCategory = await Category.findOne({
        slug: category,
        isDelete: false,
      });

      if (!newCategory) {
        return res.status(404).json({
          success: false,
          message: "Category not found",
        });
      }

      if (String(subCategory.category) !== String(newCategory._id)) {
        const categoryExists = await SubCategory.exists({
          category: newCategory._id,
          slug: subCategory.slug,
          _id: { $ne: subCategory._id },
          isDelete: false,
        });

        if (categoryExists) {
          return res.status(409).json({
            success: false,
            message:
              "Sub-Category with this name already exists in selected category",
          });
        }

        subCategory.category = newCategory._id;
      }
    }

    if (req.file) {
      if (subCategory.image?.public_id) {
        const result = await updateCloudinaryImage(
          req.file.buffer,
          subCategory.image.public_id,
          "subcategories",
        );

        subCategory.image = {
          url: result.secure_url,
          public_id: result.public_id,
        };
      } else {
        const result = await uploadToCloudinary(
          req.file.buffer,
          "subcategories",
        );

        subCategory.image = {
          url: result.secure_url,
          public_id: result.public_id,
        };
      }
    }

    if (description !== undefined) {
      subCategory.description = description;
    }

    if (status !== undefined) {
      subCategory.status = status;
    }

    await subCategory.save();

    const updatedSubCategory = await SubCategory.findById(
      subCategory._id,
    ).populate("category", "name slug");

    return res.status(200).json({
      success: true,
      message: "Sub-Category Updated Successfully",
      subCategory: updatedSubCategory,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: `Update Sub-Category Error ${error.message}`,
    });
  }
};

export const updateSubCategoryStatus = async (req, res) => {
  try {
    const { slug } = req.params;
    const { status } = req.body;

    const subCategory = await SubCategory.findOne({
      slug,
      isDelete: false,
    }).populate("category", "name slug");

    if (!subCategory) {
      return res.status(404).json({
        success: false,
        message: "Sub-Category not found",
      });
    }

    if (subCategory.status === status) {
      return res.status(400).json({
        success: false,
        message: `Status already ${status}`,
      });
    }

    subCategory.status = status;

    await subCategory.save();

    return res.status(200).json({
      success: true,
      message: "Status Updated Successfully",
      subCategory,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      error: `Update Sub-Category Status Error ${error.message}`,
    });
  }
};

export const deleteSubCategory = async (req, res) => {
  try {
    const { slug } = req.params;

    const subCategory = await SubCategory.findOne({
      slug,
      isDelete: false,
    });

    if (!subCategory) {
      return res.status(404).json({
        success: false,
        message: "Sub-Category not found",
      });
    }

    subCategory.isDelete = true;

    await subCategory.save();

    return res.status(200).json({
      success: true,
      message: "Sub-Category Deleted Successfully",
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      error: `Delete Sub-Category Error ${error.message}`,
    });
  }
};

export const undoSubCategory = async (req, res) => {
  try {
    const { slug } = req.params;

    const subCategory = await SubCategory.findOne({
      slug,
      isDelete: true,
    });

    if (!subCategory) {
      return res.status(404).json({
        success: false,
        message: "Sub-Category not found",
      });
    }

    subCategory.isDelete = false;

    await subCategory.save();

    return res.status(200).json({
      success: true,
      message: "Sub-Category Restored Successfully",
      subCategory,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      error: `Undo Sub-Category Error ${error.message}`,
    });
  }
};

export const getAllDeletedSubCategory = async (req, res) => {
  try {
    const allSubCategory = await SubCategory.find({
      isDelete: true,
    })
      .populate("category", "name slug")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      message: "Deleted Sub-Categories fetched successfully",
      count: allSubCategory.length,
      allSubCategory,
    });
  } catch (error) {
    console.error("Error in getAllDeletedSubCategory:", error);

    return res.status(500).json({
      success: false,
      message: "Error fetching deleted sub-categories",
      error: error.message,
    });
  }
};
