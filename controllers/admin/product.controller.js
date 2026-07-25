import Product from "../../models/admin/productSchema.js";
import { uploadToCloudinary } from "../../utils/cloudinaryFunc.js";

export const addNewProduct = async (req, res) => {
  try {
    const {
      basicInfo,
      media,
      attributes,
      variants,
      inventory,
      shipping,
      organization,
      seo,
      publish,
    } = req.body;

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

    if(slugExists){
        return res.status(400).json({
            success: false,
            message: "Product slug already exists."
        });
    }

    let mediaInfo = [];

    if(req.files && req.files.length > 0){
        for(const file of req.files){
            const result = await uploadToCloudinary(file.buffer, "products");
            mediaInfo.push({
                publicId: result.public_id,
                url: result.secure_url,
                alt:"",
                isPrimary: media.length === 0,
                attributeValueId: null,
                width: result.width,
                height: result.height
            });
        }
    }

    const product = await Product.create({
      basicInfo,
      media:mediaInfo,
      attributes,
      variants,
      inventory,
      shipping,
      seo:{
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