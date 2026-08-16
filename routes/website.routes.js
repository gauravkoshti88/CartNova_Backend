import express from "express";
import { createHeroBanner, createOfferBanner, deleteHeroBanner, deleteOfferBanner, getWebsite, reorderHeroBanners, reorderOfferBanners, toggleHeroBanner, toggleOfferBanner, updateAbout, updateContact, updateFooter, updateGeneral, updateHeroBanner, updateOfferBanner, updateSeo, updateSocial } from "../controllers/siteSettingsController.js";
import upload from "../middleware/multer.js";
import { adminAuth } from "../middleware/Auth.js";

const websiteRouter = express.Router();

websiteRouter.get("/", getWebsite);

websiteRouter.put(
    "/general",
    adminAuth,
    upload.fields([
        {
            name: "lightLogo",
            maxCount: 1,
        },
        {
            name: "darkLogo",
            maxCount: 1,
        },
        {
            name: "favicon",
            maxCount: 1,
        },
    ]),
    updateGeneral
);

// For Hero Banners
websiteRouter.post("/hero-banner", adminAuth, upload.single("image"), createHeroBanner);

websiteRouter.put("/hero-banner/:bannerId", adminAuth, upload.single("image"), updateHeroBanner);

websiteRouter.delete("/hero-banner/:bannerId", adminAuth, deleteHeroBanner);

websiteRouter.patch("/hero-banner/:bannerId/toggle", adminAuth, toggleHeroBanner);

websiteRouter.patch("/hero-banner/reorder", adminAuth, reorderHeroBanners);

// For Offers Banners
websiteRouter.post("/offer-banner", adminAuth, upload.single("image"), createOfferBanner);

websiteRouter.put("/offer-banner/:bannerId", adminAuth, upload.single("image"), updateOfferBanner);

websiteRouter.delete("/offer-banner/:bannerId", adminAuth, deleteOfferBanner);

websiteRouter.patch("/offer-banner/:bannerId/toggle", adminAuth, toggleOfferBanner);

websiteRouter.patch("/offer-banner/reorder", adminAuth, reorderOfferBanners);

// For About
websiteRouter.put("/about", adminAuth, upload.single("image"), updateAbout);

// For Contact
websiteRouter.put("/contact", adminAuth, updateContact);

// For Social
websiteRouter.put("/social", adminAuth, updateSocial);

// For Footer
websiteRouter.put("/footer", adminAuth, updateFooter);

// For Seo
websiteRouter.put("/seo", adminAuth, updateSeo);

export default websiteRouter;