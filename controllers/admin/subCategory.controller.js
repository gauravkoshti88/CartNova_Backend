import SubCategory from "../../models/admin/subCategorySchema.js";
import Category from '../../models/admin/categorySchema.js'
import { deleteFromCloudinary, updateCloudinaryImage, uploadToCloudinary } from "../../utils/cloudinaryFunc.js";
import mongoose from "mongoose";

export const addSubCategory = async (req, res) => {
    try {
        const { category, name, description } = req.body;

        if (!category && !name) {
            return res.status(400).json({
                success: false,
                message: "Category and Sub-Category are required"
            })
        }

        const categoryExist = await Category.findById(category);

        if (!categoryExist) {
            return res.status(404).json({
                success: false,
                message: "Category not found"
            })
        };

        const subCategoryExists = await SubCategory.findOne({
            category,
            name: name.trim()
        });

        if (subCategoryExists) {
            return res.status(400).json({
                success: false,
                message: `${name} sub-category already exists in this category`
            })
        }

        let image = {
            url: "",
            public_id: ""
        }

        if (req.file) {
            const result = await uploadToCloudinary(req.file.buffer, "subcategories")

            image = {
                url: result.secure_url,
                public_id: result.public_id
            }
        }

        const subCategory = await SubCategory.create({
            category,
            name: name.trim(),
            description,
            image
        })

        return res.status(201).json({
            success: true,
            message: 'Sub-Category Created Successfully',
            subCategory
        })
    } catch (error) {
        return res.status(500).json({
            success: false,
            error: `Add Sub-Category Error ${error}`
        })
    }
}

export const getAllSubCategory = async (req, res) => {
    try {
        const allSubCategory = await SubCategory.find().sort({ createdAt: -1 }).populate("category", "name");

        if (!allSubCategory) {
            return res.status(404).json({
                success: false,
                message: "No Sub-Category Found"
            })
        }
        return res.status(200).json({
            success: true,
            message: `Get All Sub-category`,
            count: allSubCategory.length,
            allSubCategory
        })

    } catch (error) {
        console.error("Error in getAllBrand:", error);

        return res.status(500).json({
            success: false,
            message: "Error fetching brands",
            error: error.message,
        });
    }
};

export const getSubCategoryByCategory = async (req, res) => {
    try {
        const { categoryId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(categoryId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid Category Id"
            })
        }

        const category = await Category.findById(categoryId);

        if (!category) {
            return res.status(404).json({
                success: false,
                message: 'Category not found'
            })
        }

        const subCategory = await SubCategory.find({ category: categoryId }).sort({ createdAt: -1 }).populate("category", "name")

        return res.status(200).json({
            success: true,
            message: `Get All Sub-category by ${category.name}`,
            count: subCategory.length,
            subCategory
        })
    } catch (error) {
        console.log(error);

        return res.status(500).json({
            success: false,
            error: `Get Sub-Category By Category Error ${error}`
        })
    }
}

export const getSubCategoryById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid Sub-Category Id'
            })
        }

        const subCategory = await SubCategory.findById(id).populate("category", "name");

        if (!subCategory) {
            return res.status(404).json({
                success: false,
                message: "Sub-Category not found"
            })
        }

        return res.status(200).json({
            success: true,
            message: `Get ${subCategory.name} Sub-Category`,
            subCategory
        })
    } catch (error) {
        return res.status(500).json({
            success: false,
            error: `Get Sub-Category By Id ${error}`
        })
    }
}

export const updateSubCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description } = req.body;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid Sub-Category Id'
            })
        }

        const subCategory = await SubCategory.findById(id).populate("category", "name");

        if (!subCategory) {
            return res.status(404).json({
                success: false,
                message: "Sub-Category not found"
            })
        }

        if (name && name.trim() !== subCategory.name) {
            const exists = await SubCategory.findOne({
                name: name.trim(),
                _id: { $ne: id },
            })

            if (exists) {
                return res.status(400).json({
                    success: false,
                    message: "Sub-Category already exists",
                })
            }
        }

        if (req.file) {
            if (subCategory.image.public_id) {
                const result = await updateCloudinaryImage(req.file.buffer, subCategory.image.public_id, "subcategories");

                subCategory.image = {
                    url: result.secure_url,
                    public_id: result.public_id
                }
            }
        }

        if (name) subCategory.name = name.trim();
        if (description !== undefined) subCategory.description = description;

        await subCategory.save();

        return res.status(200).json({
            success: true,
            message: "Sub-Category Updated Successfully",
            subCategory
        })

    } catch (error) {
        console.log(error);

        return res.status(500).json({
            success: false,
            error: `Update Sub-Category Error ${error}`
        })
    }
}

export const updateSubCategoryStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid Sub-Category Id'
            });
        }

        const subCategory = await SubCategory.findById(id).populate("category", "name");

        if (!subCategory) {
            return res.status(404).json({
                success: false,
                message: "Sub-Category not found"
            })
        }

        if (subCategory.status == status) {
            return res.status(400).json({
                success: false,
                message: `Status already ${status}`
            })
        }

        if (status) subCategory.status = status;

        await subCategory.save();

        return res.status(200).json({
            success: true,
            message: 'Status Updated Successfully',
            subCategory
        })
    } catch (error) {
        return res.status(500).json({
            success: false,
            error: `Update Sub-Category Status Error ${error}`
        })
    }
}

export const deleteSubCategory = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid Sub-Category Id'
            });
        }

        const subCategory = await SubCategory.findById(id);

        if (!subCategory) {
            return res.status(404).json({
                success: false,
                message: "Sub-Category not found"
            })
        }

        if (subCategory.image.public_id) {
            await deleteFromCloudinary(subCategory.image.public_id);
        }

        await SubCategory.findByIdAndDelete(id);

        return res.status(200).json({
            success: true,
            message: 'Sub-Category Deleted Successfully'
        })
    } catch (error) {
        return res.status(500).json({
            success: false,
            error: `Delete Sub-Category Error ${error}`
        })
    }
}
