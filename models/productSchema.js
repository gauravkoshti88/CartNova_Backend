import mongoose from "mongoose";
import slugify from "slugify";

const mediaSchema = new mongoose.Schema(
  {
    publicId: {
      type: String,
      required: false,
      trim: true,
    },

    url: {
      type: String,
      required: false,
      trim: true,
    },

    alt: {
      type: String,
      default: "",
    },

    isPrimary: {
      type: Boolean,
      default: false,
    },

    attributeValueId: {
      type: String,
      default: null,
    },

    width: {
      type: Number,
      default: 0,
    },

    height: {
      type: Number,
      default: 0,
    },
  },
  { _id: false },
);

const attributeSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      default: "",
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    displayType: {
      type: String,
      default: "button",
    },

    isPrimary: {
      type: Boolean,
      default: false,
    },

    values: [
      {
        id: {
          type: String,
          default: "",
        },

        label: {
          type: String,
          required: true,
          trim: true,
        },

        color: {
          type: String,
          default: "",
        },

        images: [mediaSchema],
      },
    ],
  },
  { _id: false },
);

const variantSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
    },

    sku: {
      type: String,
      required: true,
      trim: true,
    },

    mrp: {
      type: Number,
      required: true,
      default: 0,
    },

    discountPercentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },

    salePrice: {
      type: Number,
      required: true,
      default: 0,
    },

    stock: {
      type: Number,
      default: 0,
      min: 0,
    },

    image: {
      type: mediaSchema,
      default: null,
    },

    attributes: {
      type: Map,
      of: Object,
      default: {},
    },
  },
  { _id: false },
);

const productSchema = new mongoose.Schema(
  {
    slug: {
      type: String,
      unique: true,
      trim: true,
      lowercase: true,
    },

    basicInfo: {
      productName: {
        type: String,
        required: true,
        trim: true,
      },

      shortDescription: {
        type: String,
        default: "",
      },

      description: {
        type: String,
        default: "",
      },

      brand: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ProductBrand",
        default: null,
      },

      category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Category",
        required: true,
      },

      subCategory: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "SubCategory",
        default: null,
      },

      childCategory: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ChildCategory",
        default: null,
      },

      tags: [
        {
          type: String,
          trim: true,
        },
      ],
    },

    media: [mediaSchema],

    attributes: [attributeSchema],

    variants: [variantSchema],

    ratings: {
      average: {
        type: Number,
        default: 0,
        min: 0,
        max: 5,
      },

      count: {
        type: Number,
        default: 0,
        min: 0,
      },

      distribution: {
        1: {
          type: Number,
          default: 0,
          min: 0,
        },
        2: {
          type: Number,
          default: 0,
          min: 0,
        },
        3: {
          type: Number,
          default: 0,
          min: 0,
        },
        4: {
          type: Number,
          default: 0,
          min: 0,
        },
        5: {
          type: Number,
          default: 0,
          min: 0,
        },
      },
    },

    inventory: {
      trackInventory: {
        type: Boolean,
        default: true,
      },

      allowBackorder: {
        type: Boolean,
        default: false,
      },

      skuPrefix: {
        type: String,
        default: "",
      },

      barcode: {
        type: String,
        default: "",
      },

      lowStockAlert: {
        type: Number,
        default: 5,
      },

      minOrderQty: {
        type: Number,
        default: 1,
      },

      maxOrderQty: {
        type: Number,
        default: 10,
      },

      weight: {
        type: String,
        default: "",
      },

      length: {
        type: String,
        default: "",
      },

      width: {
        type: String,
        default: "",
      },

      height: {
        type: String,
        default: "",
      },
    },

    shipping: {
      freeShipping: {
        type: Boolean,
        default: false,
      },

      shippingClass: {
        type: String,
        default: "standard",
      },

      packageWeight: {
        type: String,
        default: "",
      },

      packageLength: {
        type: String,
        default: "",
      },

      packageWidth: {
        type: String,
        default: "",
      },

      packageHeight: {
        type: String,
        default: "",
      },

      estimatedDelivery: {
        type: String,
        default: "",
      },

      originCountry: {
        type: String,
        default: "India",
      },
    },

    warranty: {
      hasWarranty: {
        type: Boolean,
        default: false,
      },

      warrantyType: {
        type: String,
        enum: ["brand", "seller", "international", "none"],
        default: "none",
      },

      warrantyDuration: {
        type: Number,
        default: 0,
      },

      warrantyUnit: {
        type: String,
        enum: ["days", "months", "years"],
        default: "months",
      },

      warrantyDescription: {
        type: String,
        default: "",
      },
    },

    organization: {
      brand: {
        type: String,
        default: "",
      },

      vendor: {
        type: String,
        default: "",
      },

      productType: {
        type: String,
        default: "",
      },

      collections: [
        {
          type: String,
        },
      ],

      tags: [
        {
          type: String,
        },
      ],

      countryOfOrigin: {
        type: String,
        default: "",
      },

      manufacturer: {
        type: String,
        default: "",
      },
    },

    seo: {
      metaTitle: {
        type: String,
        default: "",
      },

      metaDescription: {
        type: String,
        default: "",
      },

      keywords: [
        {
          type: String,
        },
      ],

      canonicalUrl: {
        type: String,
        default: "",
      },

      ogImage: {
        type: String,
        default: "",
      },
    },

    publish: {
      status: {
        type: String,
        enum: ["draft", "published", "scheduled", "archived"],
        default: "draft",
      },

      visibility: {
        type: String,
        enum: ["public", "private", "password"],
        default: "public",
      },

      featured: {
        type: Boolean,
        default: false,
      },

      newArrival: {
        type: Boolean,
        default: false,
      },

      bestSeller: {
        type: Boolean,
        default: false,
      },

      scheduledDate: {
        type: String,
        default: "",
      },

      scheduledTime: {
        type: String,
        default: "",
      },
    },
    returnPolicy: {
      returnAvailable: {
        type: Boolean,
        default: true,
      },

      returnType: {
        type: String,
        enum: ["return", "replacement", "return-replacement", "non-returnable"],
        default: "return",
      },

      returnDays: {
        type: Number,
        default: 7,
      },

      returnDescription: {
        type: String,
        default: "",
      },
    },
  },
  {
    timestamps: true,
  },
);

productSchema.index({
  "basicInfo.productName": "text",
});

productSchema.index({
  "basicInfo.category": 1,
});

productSchema.index({
  "basicInfo.brand": 1,
});

productSchema.index({
  "publish.status": 1,
});

productSchema.pre("validate", async function () {
  if (this.isModified("basicInfo.productName") || !this.slug) {
    const baseSlug = slugify(this.basicInfo.productName, {
      lower: true,
      strict: true,
      trim: true,
    });

    let slug = baseSlug;
    let counter = 1;

    while (
      await mongoose.models.Product.exists({
        slug,
        _id: { $ne: this._id },
      })
    ) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    this.slug = slug;
  }
});

const Product = mongoose.model("Product", productSchema);
export default Product;
