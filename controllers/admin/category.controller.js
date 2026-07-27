import mongoose from "mongoose";
import Category from "../../models/admin/categorySchema.js";
import SubCategory from '../../models/admin/subCategorySchema.js'
import Product from '../../models/admin/productSchema.js'
import { deleteFromCloudinary, updateCloudinaryImage, uploadToCloudinary } from "../../utils/cloudinaryFunc.js";

export const addCategory = async (req, res) => {
    try {
        const { name, description } = req.body;

        if (!name) {
            return res.status(400).json({
                success: false,
                message: "Category name is required"
            })
        }

        const categoryExists = await Category.findOne({ name: name.trim() });

        if (categoryExists) {
            return res.status(400).json({
                success: false,
                message: `${categoryExists.name} Category already exists`
            })
        }

        let image = {
            url: "",
            public_id: ""
        }

        if (req.file) {
            const result = await uploadToCloudinary(req.file.buffer, "categories");
            image = {
                url: result.secure_url,
                public_id: result.public_id
            }
        }

        const category = await Category.create({
            name: name.trim(),
            description,
            image
        });

        return res.status(201).json({
            success: true,
            message: "Category Added Successfully ✅",
            category
        })

    } catch (error) {
        console.log(error);

        return res.status(500).json({
            success: false,
            error: `Add Category Error ${error}`
        })
    }
}

export const categoryList = async (req, res) => {
    try {
        const categories = await Category.find({ isDelete: false }).sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            message: "Get Categories List Successfully",
            count: categories.length,
            categories
        })
    } catch (error) {
        return res.status(500).json({
            success: false,
            error: `Category List Error ${error}`
        })
    }
}

export const getSingleCategory = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid Category Id'
            });
        }

        const category = await Category.findById(id);

        if (!category) {
            return res.status(404).json({
                success: false,
                message: `Category not found`
            });
        }

        const subCategory = await SubCategory.find({ category: category._id }).select("name -_id");

        const productCount = await Product.countDocuments({ "basicInfo.category": category._id });

        return res.status(200).json({
            success: true,
            message: `Get ${category?.name} Category Successfully`,
            category,
            existSubCategory: subCategory,
            productCount
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            error: `Get Single Category Error ${error}`
        })
    }
}

export const updateCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, status } = req.body;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid Category Id'
            });
        }

        const category = await Category.findById(id);

        if (!category) {
            return res.status(404).json({
                success: false,
                message: "Category not found"
            })
        }

        if (name && name.trim() !== category.name) {
            const exists = await Category.findOne({
                name: name.trim(),
                _id: { $ne: id },
            })

            if (exists) {
                return res.status(400).json({
                    success: false,
                    message: "Category already exists",
                })
            }
        }

        if (req.file) {
            if (category.image.public_id) {
                const result = await updateCloudinaryImage(req.file.buffer, category.image.public_id, "categories");

                category.image = {
                    url: result.secure_url,
                    public_id: result.public_id
                }
            }
        }

        if (name) category.name = name.trim();
        if (description !== undefined) category.description = description;
        if (status) category.status = status;
        await category.save();

        return res.status(200).json({
            success: true,
            message: "Category Updated Successfully",
            category
        })
    } catch (error) {
        return res.status(500).json({
            success: false,
            error: `Update Category Error ${error}`
        })
    }
}

export const updateCategoryStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid Category Id'
            });
        }

        const category = await Category.findById(id);

        if (!category) {
            return res.status(404).json({
                success: false,
                message: "Category not found"
            })
        }

        if (category.status == status) {
            return res.status(400).json({
                success: false,
                message: `Status already ${status}`
            })
        }

        if (status) category.status = status;

        await category.save();

        return res.status(200).json({
            success: true,
            message: 'Status Update Successfully',
            category
        })
    } catch (error) {
        return res.status(500).json({
            success: false,
            error: `Update Category Status Error ${error}`
        })
    }
}

export const deleteCategory = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid Category Id'
            });
        }

        const category = await Category.findById(id);

        if (!category) {
            return res.status(404).json({
                success: false,
                message: "Category not found"
            })
        }

        category.isDelete = true;
        await category.save();

        return res.status(200).json({
            success: true,
            message: 'Category Delete Successfully'
        })
    } catch (error) {
        return res.status(500).json({
            success: false,
            error: `Delete Category Error ${error}`
        })
    }
}

export const undoCategory = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid Category Id'
            });
        }

        const category = await Category.findById(id);

        if (!category) {
            return res.status(404).json({
                success: false,
                message: "Category not found"
            })
        }

        category.isDelete = false;
        await category.save();

        return res.status(200).json({
            success: true,
            message: 'Category Undo Successfully',
            category
        })
    } catch (error) {
        return res.status(500).json({
            success: false,
            error: `Delete Category Error ${error}`
        })
    }
}

export const deletedCategoryList = async (req, res) => {
    try {
        const categories = await Category.find({ isDelete: true }).sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            message: "Get Deleted Categories List Successfully",
            count: categories.length,
            categories
        })
    } catch (error) {
        return res.status(500).json({
            success: false,
            error: `Deleted Category List Error ${error}`
        })
    }
}