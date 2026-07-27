import mongoose, { Schema } from "mongoose";

const subCategorySchema = new mongoose.Schema({
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Category",
        required: true
    },
    name: {
        type: String,
        required: true,
        trim: true,
    },
    image: {
        url: {
            type: String,
            default: ""
        },
        public_id: {
            type: String,
            default: ""
        }
    },
    description: {
        type: String,
        default: ""
    },
    status: {
        type: String,
        enum: ["active", "inactive"],
        default: "active"
    },
    isDelete: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

subCategorySchema.index(
    { category: 1, name: 1, status: 1 },
    { unique: true }
);

const SubCategory = mongoose.model("SubCategory", subCategorySchema);

export default SubCategory;