import Product from "../../models/admin/productSchema.js";
import { uploadToCloudinary } from "../../utils/cloudinaryFunc.js";
import crypto from "crypto";

const generateSKU = (productName) => {

  const productCode = productName
    .replace(/[^a-zA-Z0-9]/g, "")
    .substring(0, 5)
    .toUpperCase();


  const timeCode = Date.now()
    .toString()
    .slice(-6);


  const randomCode = crypto
    .randomBytes(2)
    .toString("hex")
    .toUpperCase();


  return `${productCode}-${timeCode}-${randomCode}`;

};

export const addNewProduct = async (req, res) => {
  try {
    let {
      basicInfo,
      attributes,
      variants,
      inventory,
      shipping,
      organization,
      seo,
      publish,
    } = req.body;

    basicInfo = JSON.parse(basicInfo);
    attributes = JSON.parse(attributes);
    variants = JSON.parse(variants);
    inventory = JSON.parse(inventory);
    shipping = JSON.parse(shipping);
    organization = JSON.parse(organization);
    seo = JSON.parse(seo);
    publish = JSON.parse(publish);

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

    const slug = seo.slug?.trim() || slugify(basicInfo.productName, {
      lower: true,
      strict: true
    });

    const slugExists = await Product.findOne({
      "seo.slug": slug
    });

    if (slugExists) {
      return res.status(400).json({
        success: false,
        message: "Product slug already exists."
      });
    }

    // Main Images

    let mediaInfo = [];

    const productImages = req.files?.images || [];

    if (productImages.length > 0) {

      for (let i = 0; i < productImages.length; i++) {

        const file = productImages[i];

        const result = await uploadToCloudinary(
          file.buffer,
          "products"
        );

        mediaInfo.push({

          publicId: result.public_id,

          url: result.secure_url,

          alt: "",

          isPrimary: i === 0,

          attributeValueId: null,

          width: result.width,

          height: result.height
        });
      }
    }

    // Attribute image upload (Color images)

    let attributeImages = [];

    if (req.files?.attributeImages) {

      for (const file of req.files.attributeImages) {

        const result = await uploadToCloudinary(
          file.buffer,
          "products/attributes"
        );

        attributeImages.push({
          publicId: result.public_id,
          url: result.secure_url
        });

      }

    }

    let imageIndex = 0;

    attributes = attributes.map(attribute => ({

      ...attribute,

      values: attribute.values.map(value => {

        if (value.image?.preview) {

          return {
            ...value,
            image: attributeImages[imageIndex++] || null
          };

        }

        return {
          ...value,
          image: null
        };

      })

    }));

    // Auto Generate SKU and Varient Image

    const imageAttribute = attributes.find(
      attr => attr.displayType === "image"
    );

    const processedVariants = variants.map((variant) => {

      const selectedValue = imageAttribute?.values.find(
        value =>
          value.id ===
          variant.attributes[imageAttribute.name]?.id
      );

      return {
        ...variant,
        sku: generateSKU(basicInfo.productName),
        image: selectedValue?.image || {
          url: "",
          publicId: ""
        }
      };

    });

    const product = await Product.create({
      basicInfo,
      media: mediaInfo,
      attributes,
      variants: processedVariants,
      inventory,
      shipping,
      organization,
      seo: {
        ...seo, slug
      },
      publish,
    });

    return res.status(201).json({
      success: true,
      message: "Product created successfully",
      product,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      error: `Add product error ${error.message}`,
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


    if (!products || products.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No Products Found"
      });
    }

    return res.status(200).json({
      success: true,
      message: "Get All Products Successfully",
      products
    });

  } catch (error) {
    console.log(error);

    return res.status(500).json({
      success: false,
      error: `Get all product error ${error.message}`,
    });
  }
};

export const getProductById = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await Product.findById(id)
      .populate("basicInfo.brand", "name image")
      .populate("basicInfo.category", "name image")
      .populate("basicInfo.subCategory", "name");

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }

    return res.status(200).json({
      success: true,
      message: "Product fetched successfully",
      product
    });

  } catch (error) {
    console.log(error);

    return res.status(500).json({
      success: false,
      message: "Get product error",
      error: error.message
    });
  }
};