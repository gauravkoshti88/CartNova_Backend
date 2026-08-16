import mongoose from "mongoose";
import slugify from "slugify";

const subCategorySchema = new mongoose.Schema(
    {
        category: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Category",
            required: true,
        },

        name: {
            type: String,
            required: true,
            trim: true,
        },

        slug: {
            type: String,
            required: true,
            trim: true,
            lowercase: true,
        },

        image: {
            url: {
                type: String,
                default: "",
            },

            public_id: {
                type: String,
                default: "",
            },
        },

        description: {
            type: String,
            default: "",
        },

        status: {
            type: String,
            enum: ["active", "inactive"],
            default: "active",
        },

        isDelete: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true,
    }
);

// Unique subcategory name in same category
subCategorySchema.index(
    { category: 1, name: 1 },
    { unique: true }
);

// Unique slug in same category
subCategorySchema.index(
    { category: 1, slug: 1 },
    { unique: true }
);

// Auto generate slug
subCategorySchema.pre("validate", function () {

    if (this.name) {

        this.slug = slugify(this.name, {
            lower: true,
            strict: true,
            trim: true,
        });

    }
});

const SubCategory = mongoose.model(
    "SubCategory",
    subCategorySchema
);

export default SubCategory;