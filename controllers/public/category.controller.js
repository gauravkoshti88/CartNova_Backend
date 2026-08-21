import Category from "../../models/categorySchema.js";
import SubCategory from "../../models/subCategorySchema.js";
import ProductBrand from "../../models/brandSchema.js";
import ChildCategory from "../../models/childCategorySchema.js";

// =====================================================
// GET CATEGORIES
// =====================================================

export const getCategories = async (req, res) => {
  try {
    const filter = {
      status: "active",
      isDelete: false,
    };

    const categories = await Category.find(filter).lean();

    return res.status(200).json({
      success: true,
      message: "Categories fetched successfully",
      categories,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch categories",
      error: error.message,
    });
  }
};

// =====================================================
// GET SUB CATEGORIES BY CATEGORY SLUG
// =====================================================

export const getSubCategoriesByCategorySlug = async (req, res) => {
  try {
    const { categorySlug } = req.params;

    // Find category by slug
    const category = await Category.findOne({
      slug: categorySlug,
      status: "active",
      isDelete: false,
    }).select("_id");

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    const subCategories = await SubCategory.find({
      category: category._id,
      status: "active",
      isDelete: false,
    }).lean();

    return res.status(200).json({
      success: true,
      message: "Sub categories fetched successfully",
      subCategories,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch sub categories",
      error: error.message,
    });
  }
};

// =====================================================
// GET BRANDS BY CATEGORY SLUG
// =====================================================

export const getBrandsByCategorySlug = async (req, res) => {
  try {
    const { categorySlug } = req.params;

    // Find category by slug
    const category = await Category.findOne({
      slug: categorySlug,
      status: "active",
      isDelete: false,
    }).select("_id");

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    const brands = await ProductBrand.find({
      categories: category._id,
      status: "active",
      isDelete: false,
    }).lean();

    return res.status(200).json({
      success: true,
      message: "Brands fetched successfully",
      brands,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch brands by category",
      error: error.message,
    });
  }
};

// GET CHILD CATEGORY BY CATEGORY SLUG

export const getChildCategoriesByCategory = async (req, res) => {
  try {
    const { categorySlug } = req.params;

    // 1. Category find by slug
    const category = await Category.findOne({
      slug: categorySlug,
      isDelete: false,
      status: "active",
    }).select("_id name slug");

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    // 2. Get all active sub-categories of this category
    const subCategories = await SubCategory.find({
      category: category._id,
      isDelete: false,
      status: "active",
    }).select("_id");

    const subCategoryIds = subCategories.map((subCategory) => subCategory._id);

    // 3. Find child categories having any of these sub-category IDs
    const childCategories = await ChildCategory.find({
      subCategories: {
        $in: subCategoryIds,
      },
      isDelete: false,
      status: "active",
    })
      .select("-__v")
      .sort({ name: 1 });

    return res.status(200).json({
      success: true,
      count: childCategories.length,
      category: {
        _id: category._id,
        name: category.name,
        slug: category.slug,
      },
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

// GET CHILD CATEGORY BY SUBCATEGORYSLUG

export const getChildCategoriesBySubCategory = async (req, res) => {
  try {
    const { subCategorySlug } = req.params;

    // Find sub category
    const subCategory = await SubCategory.findOne({
      slug: subCategorySlug,
      status: "active",
      isDelete: false,
    }).select("_id");

    if (!subCategory) {
      return res.status(404).json({
        success: false,
        message: "Sub category not found",
      });
    }

    // Find child categories
    const childCategories = await ChildCategory.find({
      subCategories: subCategory._id,
      status: "active",
      isDelete: false,
    }).lean();

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
