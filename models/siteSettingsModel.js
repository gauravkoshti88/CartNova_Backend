import mongoose from "mongoose";

const mediaSchema = new mongoose.Schema(
    {
        publicId: {
            type: String,
            required: true,
            trim: true,
        },

        url: {
            type: String,
            required: true,
            trim: true,
        },

        alt: {
            type: String,
            default: "",
            trim: true,
        },
    },
    {
        _id: false,
    }
);

const heroBannerSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true,
    },

    subtitle: {
        type: String,
        default: "",
        trim: true,
    },

    buttonText: {
        type: String,
        default: "",
        trim: true,
    },

    buttonLink: {
        type: String,
        default: "",
        trim: true,
    },

    image: {
        type: mediaSchema,
        required: true,
    },

    isActive: {
        type: Boolean,
        default: true,
    },

    order: {
        type: Number,
        default: 0,
    },
});

const offerBannerSchema = new mongoose.Schema({
    title: {
        type: String,
        trim: true,
    },

    link: {
        type: String,
        default: "",
    },

    image: {
        type: mediaSchema,
        required: true,
    },

    order: {
        type: Number,
        default: 0,
    },

    isActive: {
        type: Boolean,
        default: true,
    },
});

const siteSettingsSchema = new mongoose.Schema({
    general: {
        websiteName: {
            type: String,
            required: true,
            trim: true,
        },

        tagline: {
            type: String,
            default: "",
            trim: true,
        },

        lightLogo: mediaSchema,
        darkLogo: mediaSchema,
        favicon: mediaSchema,
    },

    heroBanners: [heroBannerSchema],

    offerBanners: [offerBannerSchema],

    about: {
        heading: String,
        description: String,
        image: mediaSchema,
    },

    contact: {

        email: String,

        phone: String,

        whatsapp: String,

        address: String,

        mapUrl: String,

        supportTime: String,
    },
    social: {

        facebook: String,

        instagram: String,

        twitter: String,

        youtube: String,

        linkedin: String
    },
    footer: {

        copyright: String,

        footerDescription: String
    },
    seo: {

        metaTitle: String,

        metaDescription: String,

        metaKeywords: [String]
    }
}, { timestamps: true });

export const WebSite = mongoose.model("WebSite", siteSettingsSchema);