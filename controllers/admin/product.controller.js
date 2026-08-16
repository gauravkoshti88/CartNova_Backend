import mongoose from "mongoose";
import Product from "../../models/productSchema.js";
import { uploadToCloudinary } from "../../utils/cloudinaryFunc.js";
import crypto from "crypto";
import Category from "../../models/categorySchema.js";
import SubCategory from "../../models/subCategorySchema.js";
import ChildCategory from "../../models/childCategorySchema.js";
import ProductBrand from "../../models/brandSchema.js";

const generateSKU = (productName) => {
  const productCode = productName
    .replace(/[^a-zA-Z0-9]/g, "")
    .substring(0, 5)
    .toUpperCase();

  const timeCode = Date.now().toString().slice(-6);

  const randomCode = crypto.randomBytes(2).toString("hex").toUpperCase();

  return `${productCode}-${timeCode}-${randomCode}`;
};

export const normalizePrimaryImages = (images = []) => {
  if (!Array.isArray(images) || images.length === 0) {
    return [];
  }

  const primaryIndex = images.findIndex((image) => image?.isPrimary === true);

  // Primary nahi hai -> first image primary
  if (primaryIndex === -1) {
    return images.map((image, index) => ({
      ...image,
      isPrimary: index === 0,
    }));
  }

  // Primary ko index 0 par move karo
  const primaryImage = images[primaryIndex];

  const reorderedImages = [
    primaryImage,
    ...images.filter((_, index) => index !== primaryIndex),
  ];

  // Safety: only index 0 primary
  return reorderedImages.map((image, index) => ({
    ...image,
    isPrimary: index === 0,
  }));
};

export const addNewProduct = async (req, res) => {
  try {
    let {
      basicInfo,
      attributes,
      variants,
      inventory,
      shipping,
      warranty,
      organization,
      seo,
      publish,
      returnPolicy,
      mediaMeta,
    } = req.body;

    // =========================
    // Parse FormData fields
    // =========================

    basicInfo = JSON.parse(basicInfo);
    attributes = JSON.parse(attributes);
    variants = JSON.parse(variants);
    inventory = JSON.parse(inventory);
    shipping = JSON.parse(shipping);
    warranty = warranty ? JSON.parse(warranty) : {};
    organization = JSON.parse(organization);
    seo = JSON.parse(seo);
    publish = JSON.parse(publish);
    returnPolicy = returnPolicy ? JSON.parse(returnPolicy) : {};
    mediaMeta = mediaMeta ? JSON.parse(mediaMeta) : [];

    // =========================
    // Basic Validation
    // =========================

    if (!basicInfo?.productName?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Product name is required",
      });
    }

    if (!basicInfo?.category) {
      return res.status(400).json({
        success: false,
        message: "Category is required",
      });
    }

    if (!basicInfo?.subCategory) {
      return res.status(400).json({
        success: false,
        message: "Sub Category is required",
      });
    }

    // =========================
    // Category
    // =========================

    const categoryDoc = await Category.findOne({
      slug: basicInfo.category,
      isDelete: false,
    }).select("_id");

    if (!categoryDoc) {
      return res.status(400).json({
        success: false,
        message: "Category not found",
      });
    }

    // =========================
    // Sub Category
    // =========================

    const subCategoryDoc = await SubCategory.findOne({
      slug: basicInfo.subCategory,
      category: categoryDoc._id,
      isDelete: false,
    }).select("_id");

    if (!subCategoryDoc) {
      return res.status(400).json({
        success: false,
        message: "Sub Category not found for selected category",
      });
    }

    // =========================
    // Child Category
    // =========================

    let childCategoryDoc = null;

    if (basicInfo.childCategory) {
      childCategoryDoc = await ChildCategory.findOne({
        slug: basicInfo.childCategory,
        subCategories: subCategoryDoc._id,
        isDelete: false,
      }).select("_id");

      if (!childCategoryDoc) {
        return res.status(400).json({
          success: false,
          message: "Child Category not found for selected sub category",
        });
      }
    }

    // =========================
    // Brand
    // =========================

    let brandDoc = null;

    if (basicInfo.brand) {
      brandDoc = await ProductBrand.findOne({
        slug: basicInfo.brand,
        isDelete: false,
      }).select("_id");

      if (!brandDoc) {
        return res.status(400).json({
          success: false,
          message: "Brand not found",
        });
      }
    }

    // =========================
    // Replace Slugs with IDs
    // =========================

    basicInfo.category = categoryDoc._id;
    basicInfo.subCategory = subCategoryDoc._id;
    basicInfo.childCategory = childCategoryDoc?._id || null;
    basicInfo.brand = brandDoc?._id || null;

    // =========================================================
    // PRODUCT IMAGES
    // =========================================================

    const mediaInfo = [];
    const productImages = req.files?.images || [];

    for (let i = 0; i < productImages.length; i++) {
      const file = productImages[i];
      const meta = mediaMeta[i];

      const result = await uploadToCloudinary(file.buffer, "products");

      mediaInfo.push({
        publicId: result.public_id,
        url: result.secure_url,

        alt: meta?.alt || "",

        isPrimary: meta?.isPrimary === true,

        attributeValueId: meta?.attributeValueId || null,

        width: result.width || 0,
        height: result.height || 0,
      });
    }

    // =========================
    // Ensure Only One Primary
    // =========================

    if (mediaInfo.length > 0) {
      const primaryIndex = mediaInfo.findIndex(
        (item) => item.isPrimary === true,
      );

      if (primaryIndex === -1) {
        mediaInfo[0].isPrimary = true;
      } else {
        mediaInfo.forEach((item, index) => {
          item.isPrimary = index === primaryIndex;
        });
      }
    }

    // =========================================================
    // ATTRIBUTE IMAGES
    // =========================================================

    const attributeImageMeta = req.body.attributeImageMeta
      ? JSON.parse(req.body.attributeImageMeta)
      : [];

    const attributeFiles = req.files?.attributeImages || [];

    const uploadedAttributeImages = [];

    for (let i = 0; i < attributeFiles.length; i++) {
      const file = attributeFiles[i];
      const meta = attributeImageMeta[i];

      if (!meta?.attributeValueId) {
        continue;
      }

      const result = await uploadToCloudinary(
        file.buffer,
        "products/attributes",
      );

      uploadedAttributeImages.push({
        attributeId: meta.attributeId,
        attributeValueId: meta.attributeValueId,
        index: meta.index ?? i,

        image: {
          publicId: result.public_id,
          url: result.secure_url,

          alt: meta?.alt || "",

          isPrimary: meta?.isPrimary === true,

          attributeValueId: meta.attributeValueId,

          width: result.width || 0,
          height: result.height || 0,
        },
      });
    }

    // =========================================================
    // MERGE ATTRIBUTE IMAGES
    // =========================================================

    attributes = attributes.map((attribute) => ({
      ...attribute,

      values: attribute.values.map((value) => {
        // Existing images from frontend
        const existingImages = Array.isArray(value.images)
          ? value.images.filter((image) => image?.url || image?.publicId)
          : [];

        // Uploaded images for this attribute value
        const uploadedImages = uploadedAttributeImages
          .filter((item) => String(item.attributeValueId) === String(value.id))
          .sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
          .map((item) => item.image);

        const images = [...existingImages, ...uploadedImages];

        // ============================================
        // Ensure only one primary image
        // ============================================

        if (images.length > 0) {
          const primaryIndex = images.findIndex(
            (image) => image.isPrimary === true,
          );

          if (primaryIndex === -1) {
            images[0].isPrimary = true;
          } else {
            images.forEach((image, index) => {
              image.isPrimary = index === primaryIndex;
            });
          }
        }

        const orderedImages = normalizePrimaryImages(images);

        return {
          ...value,
          images,
        };
      }),
    }));

    // =========================================================
    // IMAGE ATTRIBUTE
    // =========================================================

    const imageAttribute = attributes.find(
      (attribute) => attribute.displayType === "image",
    );

    // =========================================================
    // PROCESS VARIANTS
    // =========================================================

    const processedVariants = variants.map((variant) => {
      let selectedValue = null;

      if (imageAttribute) {
        selectedValue = imageAttribute.values.find(
          (value) =>
            String(value.id) ===
            String(variant.attributes?.[imageAttribute.name]?.id),
        );
      }

      const selectedImage =
        selectedValue?.images?.find((image) => image.isPrimary === true) ||
        selectedValue?.images?.[0] ||
        null;

      const existingVariantImage = variant.image || {};

      const finalImage = selectedImage
        ? {
            publicId: selectedImage.publicId || "",
            url: selectedImage.url || "",
            alt: selectedImage.alt || "",
            isPrimary: true,
            attributeValueId: selectedValue?.id || null,
            width: Number(selectedImage.width) || 0,
            height: Number(selectedImage.height) || 0,
          }
        : {
            publicId: existingVariantImage.publicId || "",
            url: existingVariantImage.url || "",
            alt: existingVariantImage.alt || "",
            isPrimary: existingVariantImage.isPrimary === true,
            attributeValueId:
              existingVariantImage.attributeValueId ||
              selectedValue?.id ||
              null,
            width: Number(existingVariantImage.width) || 0,
            height: Number(existingVariantImage.height) || 0,
          };

      return {
        id: variant.id,

        sku: variant.sku || generateSKU(basicInfo.productName),

        mrp: Number(variant.mrp) || 0,

        discountPercentage: Number(variant.discountPercentage) || 0,

        salePrice: Number(variant.salePrice) || 0,

        stock: Number(variant.stock) || 0,

        barcode: variant.barcode || "",

        weight: variant.weight || "",

        active: variant.active !== undefined ? variant.active : true,

        attributes: variant.attributes || {},

        image: finalImage,
      };
    });

    const orderedMediaInfo = normalizePrimaryImages(mediaInfo);

    // =========================================================
    // CREATE PRODUCT
    // =========================================================

    const product = await Product.create({
      basicInfo,

      media: orderedMediaInfo,

      attributes,

      variants: processedVariants,

      inventory,

      shipping,

      warranty,

      organization,

      seo,

      publish,

      returnPolicy,
    });

    // =========================================================
    // RESPONSE
    // =========================================================

    return res.status(201).json({
      success: true,
      message: "Product created successfully",
      product,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to create product",
      error: error.message,
    });
  }
};

export const getAllProduct = async (req, res) => {
  try {
    const products = await Product.find()
      .populate("basicInfo.brand")
      .populate("basicInfo.category")
      .populate("basicInfo.subCategory")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      message: "Get All Products Successfully",
      products,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: `Get all product error ${error.message}`,
    });
  }
};

export const getProductBySlug = async (req, res) => {
  try {
    const { slug } = req.params;

    const product = await Product.findOne({ slug })
      .populate("basicInfo.brand", "name slug image")
      .populate("basicInfo.category", "name slug image")
      .populate("basicInfo.subCategory", "name slug")
      .populate("basicInfo.childCategory", "name slug");

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Product fetched successfully",
      product,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Get product error",
      error: error.message,
    });
  }
};

export const updateProduct = async (req, res) => {
  try {
    const { slug } = req.params;

    const product = await Product.findOne({ slug });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    let {
      basicInfo,
      attributes,
      variants,
      inventory,
      shipping,
      warranty,
      organization,
      seo,
      publish,
      returnPolicy,
      existingMedia,
    } = req.body;

    basicInfo = JSON.parse(basicInfo);
    attributes = JSON.parse(attributes);
    variants = JSON.parse(variants);
    inventory = JSON.parse(inventory);
    shipping = JSON.parse(shipping);
    warranty = warranty ? JSON.parse(warranty) : product.warranty;
    organization = JSON.parse(organization);
    seo = JSON.parse(seo);
    publish = JSON.parse(publish);

    returnPolicy = returnPolicy
      ? JSON.parse(returnPolicy)
      : product.returnPolicy;

    existingMedia = existingMedia ? JSON.parse(existingMedia) : [];

    const attributeImageMeta = req.body.attributeImageMeta
      ? JSON.parse(req.body.attributeImageMeta)
      : [];

    if (!basicInfo?.productName?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Product name is required",
      });
    }

    if (!basicInfo?.category) {
      return res.status(400).json({
        success: false,
        message: "Category is required",
      });
    }

    if (!basicInfo?.subCategory) {
      return res.status(400).json({
        success: false,
        message: "Sub Category is required",
      });
    }

    const category = await Category.findOne({
      slug: basicInfo.category,
      isDelete: false,
    }).select("_id");

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    const subCategory = await SubCategory.findOne({
      slug: basicInfo.subCategory,
      category: category._id,
      isDelete: false,
    }).select("_id");

    if (!subCategory) {
      return res.status(404).json({
        success: false,
        message: "Sub Category not found for selected category",
      });
    }

    let childCategory = null;

    if (basicInfo.childCategory) {
      childCategory = await ChildCategory.findOne({
        slug: basicInfo.childCategory,
        subCategories: subCategory._id,
        isDelete: false,
      }).select("_id");

      if (!childCategory) {
        return res.status(400).json({
          success: false,
          message: "Child Category not found for selected sub category",
        });
      }
    }

    let brand = null;

    if (basicInfo.brand) {
      brand = await ProductBrand.findOne({
        slug: basicInfo.brand,
        isDelete: false,
      }).select("_id");

      if (!brand) {
        return res.status(404).json({
          success: false,
          message: "Brand not found",
        });
      }
    }

    basicInfo.category = category._id;
    basicInfo.subCategory = subCategory._id;
    basicInfo.childCategory = childCategory?._id || null;
    basicInfo.brand = brand?._id || null;

    let mediaInfo = Array.isArray(existingMedia)
      ? existingMedia.map((image) => ({
          publicId: image?.publicId || "",
          url: image?.url || "",
          alt: image?.alt || "",
          isPrimary: image?.isPrimary === true,
          attributeValueId: image?.attributeValueId || null,
          width: image?.width || 0,
          height: image?.height || 0,
        }))
      : [];

    const productImages = req.files?.images || [];

    for (let i = 0; i < productImages.length; i++) {
      const file = productImages[i];

      const result = await uploadToCloudinary(file.buffer, "products");

      mediaInfo.push({
        publicId: result.public_id,
        url: result.secure_url,
        alt: "",
        isPrimary: false,
        attributeValueId: null,
        width: result.width || 0,
        height: result.height || 0,
      });
    }

    mediaInfo = normalizePrimaryImages(mediaInfo);

    const uploadedAttributeImages = [];
    const attributeFiles = req.files?.attributeImages || [];

    for (let i = 0; i < attributeFiles.length; i++) {
      const file = attributeFiles[i];
      const meta = attributeImageMeta[i];

      if (!meta?.attributeValueId) {
        continue;
      }

      const result = await uploadToCloudinary(
        file.buffer,
        "products/attributes",
      );

      uploadedAttributeImages.push({
        attributeId: meta.attributeId || null,
        attributeValueId: meta.attributeValueId,
        index: meta.index ?? i,
        image: {
          publicId: result.public_id,
          url: result.secure_url,
          alt: meta?.alt || "",
          isPrimary: meta?.isPrimary === true,
          attributeValueId: meta.attributeValueId,
          width: result.width || 0,
          height: result.height || 0,
        },
      });
    }

    attributes = attributes.map((attribute) => ({
      ...attribute,

      values: attribute.values.map((value) => {
        const existingImages = Array.isArray(value.images)
          ? value.images
              .filter((image) => image?.url || image?.publicId)
              .map((image) => ({
                publicId: image?.publicId || "",
                url: image?.url || "",
                alt: image?.alt || "",
                isPrimary: image?.isPrimary === true,
                attributeValueId: image?.attributeValueId || value.id || null,
                width: image?.width || 0,
                height: image?.height || 0,
              }))
          : [];

        const newImages = uploadedAttributeImages
          .filter((item) => String(item.attributeValueId) === String(value.id))
          .sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
          .map((item) => item.image);

        const images = [...existingImages, ...newImages];

        const orderedImages = normalizePrimaryImages(images);

        return {
          ...value,
          image: undefined,
          images: orderedImages,
        };
      }),
    }));

    const imageAttribute = attributes.find(
      (attribute) => attribute.displayType === "image",
    );

    const processedVariants = variants.map((variant) => {
      const selectedValue = imageAttribute?.values.find(
        (value) =>
          String(value.id) ===
          String(variant.attributes?.[imageAttribute.name]?.id),
      );

      const primaryImage =
        selectedValue?.images?.find((image) => image.isPrimary === true) ||
        selectedValue?.images?.[0] ||
        null;

      const existingVariantImage = variant.image;

      return {
        // IMPORTANT: variant id preserve karo
        id: variant.id,

        sku: variant.sku || generateSKU(basicInfo.productName),

        mrp: Number(variant.mrp) || 0,

        discountPercentage: Number(variant.discountPercentage) || 0,

        salePrice: Number(variant.salePrice) || 0,

        stock: Number(variant.stock) || 0,

        barcode: variant.barcode || "",

        weight: variant.weight || "",

        active: variant.active !== undefined ? variant.active : true,

        attributes: variant.attributes || {},

        image: primaryImage
          ? {
              publicId: primaryImage.publicId || "",
              url: primaryImage.url || "",
              alt: primaryImage.alt || "",
              isPrimary: true,
              attributeValueId: selectedValue?.id || null,
              width: primaryImage.width || 0,
              height: primaryImage.height || 0,
            }
          : {
              publicId: existingVariantImage?.publicId || "",

              url: existingVariantImage?.url || "",

              alt: existingVariantImage?.alt || "",

              isPrimary: existingVariantImage?.isPrimary === true,

              attributeValueId:
                existingVariantImage?.attributeValueId ||
                selectedValue?.id ||
                null,

              width: existingVariantImage?.width || 0,

              height: existingVariantImage?.height || 0,
            },
      };
    });

    product.basicInfo = basicInfo;
    product.media = mediaInfo;
    product.attributes = attributes;
    product.variants = processedVariants;
    product.inventory = inventory;
    product.shipping = shipping;
    product.warranty = warranty;
    product.organization = organization;
    product.seo = seo;
    product.publish = publish;
    product.returnPolicy = returnPolicy;

    await product.save();

    return res.status(200).json({
      success: true,
      message: "Product updated successfully",
      product,
    });
  } catch (error) {
    console.error("UPDATE PRODUCT ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update product",
      error: error.message,
    });
  }
};

export const updateProductStatus = async (req, res) => {
  try {
    const { slug } = req.params;
    const { status } = req.body;

    const allowedStatus = ["draft", "published", "scheduled", "archived"];

    if (!allowedStatus.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product status",
      });
    }

    const product = await Product.findOne({ slug });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    if (product.publish.status === status) {
      return res.status(400).json({
        success: false,
        message: `Product is already ${status}`,
      });
    }

    product.publish.status = status;

    // Scheduled values clear when status is not scheduled
    if (status !== "scheduled") {
      product.publish.scheduledDate = "";
      product.publish.scheduledTime = "";
    }

    await product.save();

    return res.status(200).json({
      success: true,
      message: "Product status updated successfully",
      product,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
