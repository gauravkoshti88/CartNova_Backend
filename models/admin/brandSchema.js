import mongoose from "mongoose";

const brandSchema = new mongoose.Schema({
    categories: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Category",
            required: true
        }
    ],
    name: {
        type: String,
        required: true,
        trim: true,
        unique: true
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

const ProductBrand = mongoose.model("ProductBrand", brandSchema);

export default ProductBrand;