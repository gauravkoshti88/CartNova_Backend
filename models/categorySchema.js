import mongoose from "mongoose";
import slugify from "slugify";

const categorySchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
            unique: true,
        },

        slug: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
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

// Auto generate slug
categorySchema.pre("validate", function () {

    if (this.name) {
        this.slug = slugify(this.name, {
            lower: true,
            strict: true,
            trim: true,
        });
    }

});

const Category = mongoose.model("Category", categorySchema);

export default Category;