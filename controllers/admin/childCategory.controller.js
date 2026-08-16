import SubCategory from "../../models/subCategorySchema.js";
import ChildCategory from "../../models/childCategorySchema.js";
import {
  updateCloudinaryImage,
  uploadToCloudinary,
} from "../../utils/cloudinaryFunc.js";

export const getAllChildCategory = async (req, res) => {
  try {
    const { subCategorySlug } = req.query;

    let query = {
      isDelete: false,
    };

    if (subCategorySlug) {
      const subCategory = await SubCategory.findOne({
        slug: subCategorySlug,
        isDelete: false,
      }).select("_id");

      if (!subCategory) {
        return res.status(404).json({
          success: false,
          message: "Sub category not found",
        });
      }

      query.subCategories = subCategory._id;
    }

    const childCategories = await ChildCategory.find(query)
      .populate({
        path: "subCategories",
        select: "name slug category",
        populate: {
          path: "category",
          select: "name slug",
        },
      })
      .lean();

    return res.status(200).json({
      success: true,
      message: "Child categories fetched successfully",
      childCategories,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch child categories",
      error: error.message,
    });
  }
};

export const getChildCategoriesBySubCategorySlug = async (req, res) => {
  try {
    const { slug } = req.params;

    // -----------------------------------------
    // Validate Slug
    // -----------------------------------------

    if (!slug?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Sub category slug is required",
      });
    }

    // -----------------------------------------
    // Find Sub Category
    // -----------------------------------------

    const subCategory = await SubCategory.findOne({
      slug: slug.trim().toLowerCase(),
      isDelete: false,
      status: "active",
    }).select("_id name slug");

    if (!subCategory) {
      return res.status(404).json({
        success: false,
        message: "Sub category not found",
      });
    }

    // -----------------------------------------
    // Find Child Categories
    // -----------------------------------------

    const childCategories = await ChildCategory.find({
      subCategories: subCategory._id,
      isDelete: false,
      status: "active",
    })
      .populate({
        path: "subCategories",
        select: "name slug",
      })
      .sort({ name: 1 })
      .lean();

    return res.status(200).json({
      success: true,
      message: "Child categories fetched successfully",
      subCategory,
      childCategories,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch child categories",
      error: error.message,
    });
  }
};

export const createChildCategory = async (req, res) => {
  try {
    const { subCategories, name, description, status } = req.body;

    const subCategoryIds = Array.isArray(subCategories)
      ? subCategories
      : subCategories
        ? [subCategories]
        : [];

    if (!subCategoryIds.length || !name?.trim()) {
      return res.status(400).json({
        success: false,
        message: "At least one sub category and name are required",
      });
    }

    const existingSubCategories = await SubCategory.find({
      _id: { $in: subCategoryIds },
      status: "active",
      isDelete: false,
    }).select("_id");

    if (existingSubCategories.length !== subCategoryIds.length) {
      return res.status(404).json({
        success: false,
        message: "One or more sub categories not found",
      });
    }

    let image = {
      url: "",
      public_id: "",
    };

    if (req.file) {
      const result = await uploadToCloudinary(
        req.file.buffer,
        "child-categories",
      );

      image = {
        url: result.secure_url,
        public_id: result.public_id,
      };
    }

    const childCategory = await ChildCategory.create({
      subCategories: subCategoryIds,
      name: name.trim(),
      description: description || "",
      status: status || "active",
      image,
    });

    const populatedChildCategory = await ChildCategory.findById(
      childCategory._id,
    ).populate({
      path: "subCategories",
      select: "name slug category",
      populate: {
        path: "category",
        select: "name slug",
      },
    });

    return res.status(201).json({
      success: true,
      message: "Child category created successfully",
      childCategory: populatedChildCategory,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Child category already exists",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to create child category",
      error: error.message,
    });
  }
};

export const getChildCategoryBySlug = async (req, res) => {
  try {
    const { slug } = req.params;

    const childCategory = await ChildCategory.findOne({
      slug,
      isDelete: false,
    })
      .populate({
        path: "subCategories",
        select: "name slug category",
        populate: {
          path: "category",
          select: "name slug",
        },
      })
      .lean();

    if (!childCategory) {
      return res.status(404).json({
        success: false,
        message: "Child category not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Child category fetched successfully",
      childCategory,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch child category",
      error: error.message,
    });
  }
};

export const updateChildCategory = async (req, res) => {
  try {
    const { slug } = req.params;
    const { subCategories, name, description, status } = req.body;

    const childCategory = await ChildCategory.findOne({
      slug,
      isDelete: false,
    });

    if (!childCategory) {
      return res.status(404).json({
        success: false,
        message: "Child category not found",
      });
    }

    if (subCategories !== undefined) {
      const subCategoryIds = Array.isArray(subCategories)
        ? subCategories
        : subCategories
          ? [subCategories]
          : [];

      if (!subCategoryIds.length) {
        return res.status(400).json({
          success: false,
          message: "At least one sub category is required",
        });
      }

      const existingSubCategories = await SubCategory.find({
        _id: { $in: subCategoryIds },
        status: "active",
        isDelete: false,
      }).select("_id");

      if (existingSubCategories.length !== subCategoryIds.length) {
        return res.status(404).json({
          success: false,
          message: "One or more sub categories not found",
        });
      }

      childCategory.subCategories = subCategoryIds;
    }

    if (name !== undefined) {
      const trimmedName = name.trim();

      if (!trimmedName) {
        return res.status(400).json({
          success: false,
          message: "Child category name is required",
        });
      }

      if (trimmedName !== childCategory.name) {
        const baseSlug = slugify(trimmedName, {
          lower: true,
          strict: true,
          trim: true,
        });

        let newSlug = baseSlug;
        let counter = 1;

        while (
          await ChildCategory.exists({
            slug: newSlug,
            _id: { $ne: childCategory._id },
          })
        ) {
          newSlug = `${baseSlug}-${counter++}`;
        }

        childCategory.name = trimmedName;
        childCategory.slug = newSlug;
      }
    }

    if (description !== undefined) {
      childCategory.description = description;
    }

    if (status !== undefined) {
      if (!["active", "inactive"].includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid status",
        });
      }

      childCategory.status = status;
    }

    if (req.file) {
      const result = await updateCloudinaryImage(
        req.file.buffer,
        childCategory.image?.public_id,
        "child-categories",
      );

      childCategory.image = {
        url: result.secure_url,
        public_id: result.public_id,
      };
    }

    await childCategory.save();

    const updatedChildCategory = await ChildCategory.findById(childCategory._id)
      .populate({
        path: "subCategories",
        select: "name slug category",
        populate: {
          path: "category",
          select: "name slug",
        },
      })
      .lean();

    return res.status(200).json({
      success: true,
      message: "Child category updated successfully",
      childCategory: updatedChildCategory,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Child category already exists",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to update child category",
      error: error.message,
    });
  }
};

export const updateChildCategoryStatus = async (req, res) => {
  try {
    const { slug } = req.params;
    const { status } = req.body;

    if (!["active", "inactive"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status must be active or inactive",
      });
    }

    const childCategory = await ChildCategory.findOneAndUpdate(
      {
        slug,
        isDelete: false,
      },
      {
        $set: {
          status,
        },
      },
      {
        new: true,
        runValidators: true,
      },
    )
      .populate({
        path: "subCategories",
        select: "name slug category",
        populate: {
          path: "category",
          select: "name slug",
        },
      })
      .lean();

    if (!childCategory) {
      return res.status(404).json({
        success: false,
        message: "Child category not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Child category status updated successfully",
      childCategory,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to update child category status",
      error: error.message,
    });
  }
};

export const deleteChildCategoryBySlug = async (req, res) => {
  try {
    const { slug } = req.params;

    const childCategory = await ChildCategory.findOneAndUpdate(
      {
        slug,
        isDelete: false,
      },
      {
        $set: {
          isDelete: true,
        },
      },
      {
        new: true,
      },
    )
      .populate({
        path: "subCategories",
        select: "name slug",
      })
      .lean();

    if (!childCategory) {
      return res.status(404).json({
        success: false,
        message: "Child category not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Child category deleted successfully",
      childCategory,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to delete child category",
      error: error.message,
    });
  }
};

export const undoChildCategoryBySlug = async (req, res) => {
  try {
    const { slug } = req.params;

    const childCategory = await ChildCategory.findOneAndUpdate(
      {
        slug,
        isDelete: true,
      },
      {
        $set: {
          isDelete: false,
        },
      },
      {
        new: true,
      },
    )
      .populate({
        path: "subCategories",
        select: "name slug",
      })
      .lean();

    if (!childCategory) {
      return res.status(404).json({
        success: false,
        message: "Deleted child category not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Child category restored successfully",
      childCategory,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to restore child category",
      error: error.message,
    });
  }
};
