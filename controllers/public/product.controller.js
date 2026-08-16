import Product from "../../models/productSchema.js";
import Category from "../../models/categorySchema.js";
import SubCategory from "../../models/subCategorySchema.js";
import ChildCategory from "../../models/childCategorySchema.js";
import Brand from "../../models/brandSchema.js";

export const getProducts = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 12,

      category,
      subCategory,
      brand,

      search,

      minPrice,
      maxPrice,

      stock,

      featured,
      newArrival,
      bestSeller,

      sort = "latest",
    } = req.query;

    // ==========================================================
    // PAGINATION
    // ==========================================================

    const currentPage = Math.max(Number(page) || 1, 1);

    const perPage = Math.min(Math.max(Number(limit) || 12, 1), 100);

    // ==========================================================
    // BASE QUERY
    // ==========================================================

    const query = {
      "publish.status": "published",
      "publish.visibility": "public",
    };

    // ==========================================================
    // CATEGORY
    // ==========================================================

    if (category?.trim()) {
      const categoryDoc = await Category.findOne({
        slug: category.trim(),
      }).select("_id");

      if (!categoryDoc) {
        return res.status(200).json({
          success: true,
          message: "Products fetched successfully",
          products: [],
          totalProducts: 0,
          totalPages: 0,
          currentPage,
          limit: perPage,
          hasNextPage: false,
        });
      }

      query["basicInfo.category"] = categoryDoc._id;
    }

    // ==========================================================
    // SUB CATEGORY
    // ==========================================================

    if (subCategory?.trim()) {
      const subCategoryDoc = await SubCategory.findOne({
        slug: subCategory.trim(),
      }).select("_id");

      if (!subCategoryDoc) {
        return res.status(200).json({
          success: true,
          message: "Products fetched successfully",
          products: [],
          totalProducts: 0,
          totalPages: 0,
          currentPage,
          limit: perPage,
          hasNextPage: false,
        });
      }

      query["basicInfo.subCategory"] = subCategoryDoc._id;
    }

    // ==========================================================
    // BRAND
    // ==========================================================

    if (brand?.trim()) {
      const brandDoc = await Brand.findOne({
        slug: brand.trim(),
      }).select("_id");

      if (!brandDoc) {
        return res.status(200).json({
          success: true,
          message: "Products fetched successfully",
          products: [],
          totalProducts: 0,
          totalPages: 0,
          currentPage,
          limit: perPage,
          hasNextPage: false,
        });
      }

      query["basicInfo.brand"] = brandDoc._id;
    }

    // ==========================================================
    // SEARCH
    // ==========================================================

    if (search?.trim()) {
      query.$text = {
        $search: search.trim(),
      };
    }

    // ==========================================================
    // FEATURED
    // ==========================================================

    if (featured === "true") {
      query["publish.featured"] = true;
    }

    // ==========================================================
    // NEW ARRIVAL
    // ==========================================================

    if (newArrival === "true") {
      query["publish.newArrival"] = true;
    }

    // ==========================================================
    // BEST SELLER
    // ==========================================================

    if (bestSeller === "true") {
      query["publish.bestSeller"] = true;
    }

    // ==========================================================
    // VARIANT FILTERS
    // ==========================================================

    const variantFilter = {};

    // ----------------------------------------------------------
    // PRICE
    // ----------------------------------------------------------

    const parsedMinPrice = Number(minPrice);
    const parsedMaxPrice = Number(maxPrice);

    const hasMinPrice =
      minPrice !== undefined &&
      minPrice !== "" &&
      Number.isFinite(parsedMinPrice);

    const hasMaxPrice =
      maxPrice !== undefined &&
      maxPrice !== "" &&
      Number.isFinite(parsedMaxPrice);

    if (hasMinPrice || hasMaxPrice) {
      variantFilter.salePrice = {};

      if (hasMinPrice) {
        variantFilter.salePrice.$gte = parsedMinPrice;
      }

      if (hasMaxPrice) {
        variantFilter.salePrice.$lte = parsedMaxPrice;
      }
    }

    // ----------------------------------------------------------
    // STOCK
    // ----------------------------------------------------------

    if (stock === "true") {
      variantFilter.stock = {
        $gt: 0,
      };
    }

    // ----------------------------------------------------------
    // APPLY VARIANT FILTER
    // ----------------------------------------------------------

    if (Object.keys(variantFilter).length > 0) {
      query.variants = {
        $elemMatch: variantFilter,
      };
    }

    // ==========================================================
    // SORT
    // ==========================================================

    let sortOption = {
      createdAt: -1,
    };

    switch (sort) {
      case "latest":
        sortOption = {
          createdAt: -1,
        };
        break;

      case "oldest":
        sortOption = {
          createdAt: 1,
        };
        break;

      case "name":
        sortOption = {
          "basicInfo.productName": 1,
        };
        break;

      case "price-low":
        sortOption = {
          "variants.salePrice": 1,
        };
        break;

      case "price-high":
        sortOption = {
          "variants.salePrice": -1,
        };
        break;

      default:
        sortOption = {
          createdAt: -1,
        };
    }

    // ==========================================================
    // TOTAL
    // ==========================================================

    const totalProducts = await Product.countDocuments(query);

    const totalPages =
      totalProducts > 0 ? Math.ceil(totalProducts / perPage) : 0;

    // ==========================================================
    // PRODUCTS
    // ==========================================================

    const products = await Product.find(query)
      .populate("basicInfo.brand", "name slug image")
      .populate("basicInfo.category", "name slug image")
      .populate("basicInfo.subCategory", "name slug")
      .sort(sortOption)
      .skip((currentPage - 1) * perPage)
      .limit(perPage)
      .lean();

    // ==========================================================
    // RESPONSE
    // ==========================================================

    return res.status(200).json({
      success: true,

      message: "Products fetched successfully",

      products,

      totalProducts,

      totalPages,

      currentPage,

      limit: perPage,

      hasNextPage: currentPage < totalPages,

      hasPreviousPage: currentPage > 1,
    });
  } catch (error) {
    console.error("GET PUBLIC PRODUCTS ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch products",
      error: error.message,
    });
  }
};

export const getProductDetails = async (req, res) => {
  try {
    const { slug } = req.params;

    const product = await Product.findOne({
      slug: slug,
      "publish.status": "published",
      "publish.visibility": "public",
    })
      .populate("basicInfo.brand")
      .populate("basicInfo.category")
      .populate("basicInfo.subCategory")
      .populate("basicInfo.childCategory");

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    return res.status(200).json({
      success: true,
      product,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Get product failed",
      error: error.message,
    });
  }
};

export const getFeaturedProducts = async (req, res) => {
  try {
    const products = await Product.find({
      "publish.featured": true,
      "publish.status": "published",
      "publish.visibility": "public",
    })
      .populate("basicInfo.brand", "name slug image")
      .populate("basicInfo.category", "name slug image")
      .populate("basicInfo.subCategory", "name slug")
      .sort({
        createdAt: -1,
      })
      .limit(8)
      .lean();

    return res.status(200).json({
      success: true,
      message: "Featured products fetched successfully",
      products,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Get featured products failed",
      error: error.message,
    });
  }
};

export const getBestSellerProducts = async (req, res) => {
  try {
    const products = await Product.find({
      "publish.bestSeller": true,
      "publish.status": "published",
      "publish.visibility": "public",
    })
      .populate("basicInfo.brand", "name slug image")
      .populate("basicInfo.category", "name slug image")
      .populate("basicInfo.subCategory", "name slug")
      .sort({
        createdAt: -1,
      })
      .limit(8)
      .lean();

    return res.status(200).json({
      success: true,
      message: "Best seller products fetched successfully",
      products,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Get best seller products failed",
      error: error.message,
    });
  }
};

export const getNewArrivalProducts = async (req, res) => {
  try {
    const products = await Product.find({
      "publish.newArrival": true,
      "publish.status": "published",
      "publish.visibility": "public",
    })
      .populate("basicInfo.brand", "name slug image")
      .populate("basicInfo.category", "name slug image")
      .populate("basicInfo.subCategory", "name slug")
      .sort({
        createdAt: -1,
      })
      .limit(8)
      .lean();

    return res.status(200).json({
      success: true,
      message: "New arrival products fetched successfully",
      products,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Get new arrival products failed",
      error: error.message,
    });
  }
};

export const getRelatedProducts = async (req, res) => {
  try {
    const { slug } = req.params;

    if (!slug) {
      return res.status(400).json({
        success: false,
        message: "Product slug is required",
      });
    }

    // ============================================
    // CURRENT PRODUCT
    // ============================================

    const currentProduct = await Product.findOne({ slug }).lean();

    if (!currentProduct) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // ============================================
    // CATEGORY SELECTION
    // ============================================

    const childCategory = currentProduct?.basicInfo?.childCategory;

    const subCategory = currentProduct?.basicInfo?.subCategory;

    let categoryFilter = {};

    // ============================================
    // PRIORITY:
    // Child Category > Sub Category
    // ============================================

    if (childCategory) {
      categoryFilter = {
        "basicInfo.childCategory": childCategory,
      };
    } else if (subCategory) {
      categoryFilter = {
        "basicInfo.subCategory": subCategory,
      };
    } else {
      // Agar childCategory aur subCategory dono nahi hain
      // to related products nahi milenge
      return res.status(200).json({
        success: true,
        products: [],
      });
    }

    // ============================================
    // RELATED PRODUCTS
    // ============================================

    const products = await Product.find({
      _id: {
        $ne: currentProduct._id,
      },

      ...categoryFilter,

      "publish.status": "published",
      "publish.visibility": "public",
    })
      .populate("basicInfo.brand")
      .limit(8)
      .lean();

    // ============================================
    // RESPONSE
    // ============================================

    return res.status(200).json({
      success: true,
      products,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Get related products failed",
      error: error.message,
    });
  }
};

// Get All Products By Category Slug

export const getAllProductsByCategorySlug = async (req, res) => {
  try {
    const { slug } = req.params;

    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.max(Number(req.query.limit) || 20, 1);
    const skip = (page - 1) * limit;

    const category = await Category.findOne({
      slug: slug.toLowerCase(),
    }).select("_id name slug");

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    const filter = {
      "basicInfo.category": category._id,
      "publish.status": "published",
      "publish.visibility": "public",
    };

    const [products, totalProducts] = await Promise.all([
      Product.find(filter)
        .populate("basicInfo.brand", "name slug")
        .populate("basicInfo.category", "name slug")
        .populate("basicInfo.subCategory", "name slug")
        .populate("basicInfo.childCategory", "name slug")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),

      Product.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      message: "Products fetched successfully",
      category,
      products,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalProducts / limit),
        totalProducts,
        limit,
        hasNextPage: page < Math.ceil(totalProducts / limit),
        hasPrevPage: page > 1,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch products by category",
      error: error.message,
    });
  }
};

// Get All Products By Sub CateogrySlug

export const getAllProductsBySubCategorySlug = async (req, res) => {
  try {
    const { slug } = req.params;

    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.max(Number(req.query.limit) || 20, 1);
    const skip = (page - 1) * limit;

    const subCategory = await SubCategory.findOne({
      slug: slug.toLowerCase(),
    }).select("_id name slug");

    if (!subCategory) {
      return res.status(404).json({
        success: false,
        message: "Sub category not found",
      });
    }

    const filter = {
      "basicInfo.subCategory": subCategory._id,
      "publish.status": "published",
      "publish.visibility": "public",
    };

    const [products, totalProducts] = await Promise.all([
      Product.find(filter)
        .populate("basicInfo.brand", "name slug")
        .populate("basicInfo.category", "name slug")
        .populate("basicInfo.subCategory", "name slug")
        .populate("basicInfo.childCategory", "name slug")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),

      Product.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      message: "Products fetched successfully",
      subCategory,
      products,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalProducts / limit),
        totalProducts,
        limit,
        hasNextPage: page < Math.ceil(totalProducts / limit),
        hasPrevPage: page > 1,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch products by sub category",
      error: error.message,
    });
  }
};

// Get All Products By Child Category Slug

export const getAllProductsByChildCategorySlug = async (req, res) => {
  try {
    const { slug } = req.params;

    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.max(Number(req.query.limit) || 20, 1);
    const skip = (page - 1) * limit;

    const childCategory = await ChildCategory.findOne({
      slug: slug.toLowerCase(),
    }).select("_id name slug");

    if (!childCategory) {
      return res.status(404).json({
        success: false,
        message: "Child category not found",
      });
    }

    const filter = {
      "basicInfo.childCategory": childCategory._id,
      "publish.status": "published",
      "publish.visibility": "public",
    };

    const [products, totalProducts] = await Promise.all([
      Product.find(filter)
        .populate("basicInfo.brand", "name slug")
        .populate("basicInfo.category", "name slug")
        .populate("basicInfo.subCategory", "name slug")
        .populate("basicInfo.childCategory", "name slug")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),

      Product.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      message: "Products fetched successfully",
      childCategory,
      products,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalProducts / limit),
        totalProducts,
        limit,
        hasNextPage: page < Math.ceil(totalProducts / limit),
        hasPrevPage: page > 1,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch products by child category",
      error: error.message,
    });
  }
};

export const getProductDetailsById = async (req, res) => {
  try {
    const { productId } = req.params;

    if (!productId) {
      return res.status(400).json({
        success: false,
        message: "Product ID is required",
      });
    }

    const product = await Product.findById(productId)
      .populate("basicInfo.brand", "name slug image")
      .populate("basicInfo.category", "name slug image")
      .populate("basicInfo.subCategory", "name slug")
      .populate("basicInfo.childCategory", "name slug")
      .lean();

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    return res.status(200).json({
      success: true,
      product,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch product",
    });
  }
};

export const getProductById = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await Product.findOne({
      _id: id,
      "publish.status": "published",
      "publish.visibility": "public",
    })
      .populate("basicInfo.brand", "name slug image")
      .populate("basicInfo.category", "name slug image")
      .populate("basicInfo.subCategory", "name slug")
      .populate("basicInfo.childCategory", "name slug")
      .lean();

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    return res.status(200).json({
      success: true,
      product,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch product",
      error: error.message,
    });
  }
};

export const getProductsWithHighDiscount = async (req, res) => {
  try {
    const products = await Product.find({
      "publish.status": "published",
      "publish.visibility": "public",
      variants: {
        $elemMatch: {
          discountPercentage: { $gte: 40 },
        },
      },
    })
      .populate("basicInfo.brand", "name slug")
      .populate("basicInfo.category", "name slug")
      .populate("basicInfo.subCategory", "name slug")
      .populate("basicInfo.childCategory", "name slug")
      .lean();

    const formattedProducts = products.map((product) => {
      const discounts = (product.variants || [])
        .map((variant) => Number(variant.discountPercentage) || 0)
        .filter((discount) => discount > 0);

      return {
        ...product,
        minDiscountPercent: discounts.length ? Math.min(...discounts) : 0,

        maxDiscountPercent: discounts.length ? Math.max(...discounts) : 0,
      };
    });

    return res.status(200).json({
      success: true,
      message: "40%+ discount products fetched successfully",
      count: formattedProducts.length,
      products: formattedProducts,
    });
  } catch (error) {
    console.error("GET 40%+ DISCOUNT PRODUCTS ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch discounted products",
      error: error.message,
    });
  }
};
