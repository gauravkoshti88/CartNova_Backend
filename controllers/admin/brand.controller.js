import mongoose from "mongoose";
import ProductBrand from "../../models/admin/brandSchema.js";
import Category from "../../models/admin/categorySchema.js";
import SubCategory from "../../models/admin/subCategorySchema.js";
import { deleteFromCloudinary, updateCloudinaryImage, uploadToCloudinary } from "../../utils/cloudinaryFunc.js";

export const addNewBrand = async (req, res) => {
    try {
        let { categories, name, description } = req.body;

        if (!Array.isArray(categories)) {
            categories = [categories];
        }

        if (!categories || !name || !description) {
            return res.status(400).json({
                success: false,
                message: 'Required all fields'
            })
        }

        const categoryExist = await Category.find({ _id: { $in: categories } });

        if (!categoryExist || categoryExist.length !== categories.length) {
            return res.status(404).json({
                success: false,
                message: "One or more categories not found"
            });
        }

        const productBrand = await ProductBrand.findOne({ name: name.trim() });
        if (productBrand) {
            return res.status(400).json({
                success: false,
                message: `${productBrand.name} Product Brand already exists`
            });
        }

        let image = {
            url: "",
            public_id: ""
        }

        if (req.file) {
            const result = await uploadToCloudinary(req.file.buffer, "productbrands");

            image = {
                url: result.secure_url,
                public_id: result.public_id
            }
        }

        const newBrand = await ProductBrand.create({
            categories,
            name: name.trim(),
            description,
            image
        })

        return res.status(201).json({
            success: true,
            message: 'New product brand created successfully ✅',
            newBrand
        })
    } catch (error) {
        console.log(error);

        return res.status(500).json({
            success: false,
            error: `Add brand error ${error}`
        })
    }
}

export const getAllBrand = async (req, res) => {

    try {
        const brands = await ProductBrand.find({ isDelete: false }).sort({ createdAt: -1 }).populate("categories", "name");

        if (!brands || brands.length === 0) {
            return res.status(404).json({
                success: false,
                message: "No Product Brands found",
            });
        }

        return res.status(200).json({
            success: true,
            message: "All Product Brands",
            count: brands.length,
            brands,
        });

    } catch (error) {
        console.error("Error in getAllBrand:", error);

        return res.status(500).json({
            success: false,
            message: "Error fetching brands",
            error: error.message,
        });
    }
};

export const getBrandByCategory = async (req, res) => {
    try {
        const { categoryId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(categoryId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid category id 122"
            });
        }

        const category = await Category.findById(categoryId);
        if (!category) {
            return res.status(404).json({
                success: false,
                message: "Category not found"
            });
        }

        const brands = await ProductBrand.find({ categories: categoryId }).sort({ createdAt: -1 }).populate("categories", "name");

        if (!brands || brands.length === 0) {
            return res.status(404).json({
                success: false,
                message: "No Product Brands found for this category"
            });
        }

        return res.status(200).json({
            success: true,
            message: `Brands under category ${category.name}`,
            count: brands.length,
            brands
        });

    } catch (error) {
        console.log(error);

        return res.status(500).json({
            success: false,
            error: `Get brand error ${error}`
        });
    }
};

export const getBrandById = async (req, res) => {
    try {
        const { brandId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(brandId)) {
            return res.status(400).json({
                success: false,
                message: 'Invaild brand Id'
            })
        };

        const productBrand = await ProductBrand.findById(brandId).sort({ createdAt: -1 }).populate("categories", "name");

        if (!productBrand) {
            return res.status(404).json({
                success: false,
                message: 'Product Brand is not found'
            })
        }

        return res.status(200).json({
            success: true,
            message: `Get ${productBrand.name} Product Brand`,
            productBrand
        })

    } catch (error) {
        return res.status(500).json({
            success: false,
            error: `Get brand by Id error ${error}`
        })
    }
}

export const updateBrandById = async (req, res) => {
    try {
        const { brandId } = req.params;
        const { name, description } = req.body;

        if (!mongoose.Types.ObjectId.isValid(brandId)) {
            return res.status(400).json({
                success: false,
                message: 'Invaild brand Id'
            })
        };

        const productBrand = await ProductBrand.findById(brandId).sort({ createdAt: -1 }).populate("categories", "name");

        if (!productBrand) {
            return res.status(404).json({
                success: false,
                message: 'Brand is not found'
            })
        }

        if (name && name.trim() !== productBrand.name) {
            const exists = await ProductBrand.findOne({
                name: name.trim(),
                _id: { $ne: brandId },
            })

            if (exists) {
                return res.status(400).json({
                    success: false,
                    message: "Product brand already exists",
                })
            }
        }

        if (req.file) {
            const result = await updateCloudinaryImage(req.file.buffer, productBrand.image.public_id, 'productbrands');

            productBrand.image = {
                url: result.secure_url,
                public_id: result.public_id
            }
        }

        if (name) productBrand.name = name.trim();
        if (description) productBrand.description = description;

        await productBrand.save();

        return res.status(200).json({
            success: true,
            message: `Product Brand ${productBrand.name} Updated Successfully`,
            productBrand
        })


    } catch (error) {
        return res.status(500).json({
            success: false,
            error: `Update brand by Id error ${error}`
        })
    }
}

export const updateBrandStatusById = async (req, res) => {
    try {
        const { brandId } = req.params;

        const { status } = req.body;

        if (!mongoose.Types.ObjectId.isValid(brandId)) {
            return res.status(400).json({
                success: false,
                message: 'Invaild brand Id'
            })
        };

        const brand = await ProductBrand.findById(brandId).sort({ createdAt: -1 }).populate("categories", "name");

        if (!brand) {
            return res.status(404).json({
                success: false,
                message: 'Brand is not found'
            })
        }

        if (brand.status === status) {
            return res.status(400).json({
                success: false,
                message: `Brand already ${status}`
            })
        }

        brand.status = status;
        await brand.save();

        return res.status(200).json({
            success: true,
            message: 'Status Updated Successfully ✅',
            brand
        })

    } catch (error) {
        return res.status(500).json({
            success: false,
            error: `Update brand status by Id error ${error}`
        })
    }
}

export const deleteBrandById = async (req, res) => {
    try {
        const { brandId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(brandId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid Brand Id'
            })
        }

        const brand = await ProductBrand.findById(brandId);

        if (!brand) {
            return res.status(404).json({
                success: false,
                message: 'Brand not found'
            })
        }

        brand.isDelete = true;
        await brand.save();

        return res.status(200).json({
            success: true,
            message: 'Product Brand Deleted Successfully ✅'
        })
    } catch (error) {
        return res.status(500).json({
            success: false,
            error: `Delete brand by Id error ${error}`
        })
    }
}

export const undoDeletedBrand = async (req, res) => {
    try {
        const { brandId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(brandId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid Brand Id'
            })
        }

        const brand = await ProductBrand.findById(brandId);

        if (!brand) {
            return res.status(404).json({
                success: false,
                message: 'Brand not found'
            })
        }

        brand.isDelete = false;
        await brand.save();

        return res.status(200).json({
            success: true,
            message: 'Product Brand Undo Successfully ✅',
            brand
        })
    } catch (error) {
        return res.status(500).json({
            success: false,
            error: `Undo Delete brand by Id error ${error}`
        })
    }
}

export const getAllDeletedBrand = async (req, res) => {

    try {
        const brands = await ProductBrand.find({ isDelete: true }).sort({ createdAt: -1 }).populate("categories", "name");

        if (!brands || brands.length === 0) {
            return res.status(404).json({
                success: false,
                message: "No Product Brands found",
            });
        }

        return res.status(200).json({
            success: true,
            message: "All Deleted Product Brands",
            count: brands.length,
            brands,
        });

    } catch (error) {
        console.error("Error in getAllBrand:", error);

        return res.status(500).json({
            success: false,
            message: "Error get all deleted brands",
            error: error.message,
        });
    }
};