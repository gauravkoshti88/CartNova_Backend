import mongoose from "mongoose";
import slugify from "slugify";

const childCategorySchema = new mongoose.Schema(
  {
    subCategories: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "SubCategory",
        required: true,
      },
    ],

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
  },
);

childCategorySchema.index({ name: 1 }, { unique: true });

childCategorySchema.index({ slug: 1 }, { unique: true });

childCategorySchema.pre("validate", function () {
  if (this.name) {
    this.slug = slugify(this.name, {
      lower: true,
      strict: true,
      trim: true,
    });
  }
});

const ChildCategory = mongoose.model("ChildCategory", childCategorySchema);

export default ChildCategory;
