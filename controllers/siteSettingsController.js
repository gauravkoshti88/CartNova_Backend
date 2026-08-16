import { WebSite } from "../models/siteSettingsModel.js";
import {
  deleteFromCloudinary,
  updateCloudinaryImage,
  uploadToCloudinary,
} from "../utils/cloudinaryFunc.js";

export const getWebsite = async (req, res) => {
  try {
    let website = await WebSite.findOne();

    if (!website) {
      website = await WebSite.create({
        general: {
          websiteName: "G-Shop",
        },
      });
    }

    return res.status(200).json({
      success: true,
      website,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch website settings.",
      error: error.message,
    });
  }
};

export const updateGeneral = async (req, res) => {
  try {
    const { websiteName } = req.body;

    const website = await WebSite.findOne();

    if (!website) {
      return res.status(404).json({
        success: false,
        message: "Website settings not found.",
      });
    }

    // Website Name
    if (websiteName?.trim()) {
      website.general.websiteName = websiteName.trim();
    }

    // Light Logo
    if (req.files?.lightLogo?.length) {
      const result = await updateCloudinaryImage(
        req.files.lightLogo[0].buffer,
        website.general.lightLogo?.publicId,
        "website/light-logo",
      );

      website.general.lightLogo = {
        publicId: result.public_id,
        url: result.secure_url,
        alt: `${website.general.websiteName || "Website"} Light Logo`,
      };
    }

    // Dark Logo
    if (req.files?.darkLogo?.length) {
      const result = await updateCloudinaryImage(
        req.files.darkLogo[0].buffer,
        website.general.darkLogo?.publicId,
        "website/dark-logo",
      );

      website.general.darkLogo = {
        publicId: result.public_id,
        url: result.secure_url,
        alt: `${website.general.websiteName || "Website"} Dark Logo`,
      };
    }

    // Favicon
    if (req.files?.favicon?.length) {
      const result = await updateCloudinaryImage(
        req.files.favicon[0].buffer,
        website.general.favicon?.publicId,
        "website/favicon",
      );

      website.general.favicon = {
        publicId: result.public_id,
        url: result.secure_url,
        alt: `${website.general.websiteName || "Website"} Favicon`,
      };
    }

    await website.save();

    return res.status(200).json({
      success: true,
      message: "General settings updated successfully.",
      website,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const createHeroBanner = async (req, res) => {
  try {
    const { title, subtitle, buttonText, buttonLink, isActive, order } =
      req.body;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Hero banner image is required.",
      });
    }

    const website = await WebSite.findOne();

    if (!website) {
      return res.status(404).json({
        success: false,
        message: "Website settings not found.",
      });
    }

    const MAX_HERO_BANNERS = 7;

    if (website.heroBanners.length >= MAX_HERO_BANNERS) {
      return res.status(400).json({
        success: false,
        message: `Maximum ${MAX_HERO_BANNERS} hero banners are allowed.`,
      });
    }

    // Upload image
    const result = await uploadToCloudinary(
      req.file.buffer,
      "website/hero-banners",
    );

    // Add banner
    website.heroBanners.push({
      title,
      subtitle,
      buttonText,
      buttonLink,

      image: {
        publicId: result.public_id,
        url: result.secure_url,
        alt: title || "Hero Banner",
      },

      isActive: isActive ?? true,
      order: order ?? website.heroBanners.length + 1,
    });

    await website.save();

    return res.status(201).json({
      success: true,
      message: "Hero banner created successfully.",
      website,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const updateHeroBanner = async (req, res) => {
  try {
    const { bannerId } = req.params;

    const { title, subtitle, buttonText, buttonLink, isActive, order } =
      req.body;

    const website = await WebSite.findOne();

    if (!website) {
      return res.status(404).json({
        success: false,
        message: "Website settings not found.",
      });
    }

    const banner = website.heroBanners.id(bannerId);

    if (!banner) {
      return res.status(404).json({
        success: false,
        message: "Hero banner not found.",
      });
    }

    // Update Image
    if (req.file) {
      const result = await updateCloudinaryImage(
        req.file.buffer,
        banner.image.publicId,
        "website/hero-banners",
      );

      banner.image = {
        publicId: result.public_id,
        url: result.secure_url,
        alt: title || banner.title,
      };
    }

    // Update Fields
    if (title !== undefined) banner.title = title;
    if (subtitle !== undefined) banner.subtitle = subtitle;
    if (buttonText !== undefined) banner.buttonText = buttonText;
    if (buttonLink !== undefined) banner.buttonLink = buttonLink;

    if (isActive !== undefined)
      banner.isActive = isActive === "true" || isActive === true;

    if (order !== undefined) banner.order = Number(order);

    await website.save();

    return res.status(200).json({
      success: true,
      message: "Hero banner updated successfully.",
      website,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const deleteHeroBanner = async (req, res) => {
  try {
    const { bannerId } = req.params;

    const website = await WebSite.findOne();

    if (!website) {
      return res.status(404).json({
        success: false,
        message: "Website settings not found.",
      });
    }

    const banner = website.heroBanners.id(bannerId);

    if (!banner) {
      return res.status(404).json({
        success: false,
        message: "Hero banner not found.",
      });
    }

    // Delete image from Cloudinary
    if (banner.image?.publicId) {
      await deleteFromCloudinary(banner.image.publicId);
    }

    // Remove banner
    website.heroBanners.pull(bannerId);

    await website.save();

    return res.status(200).json({
      success: true,
      message: "Hero banner deleted successfully.",
      website,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const toggleHeroBanner = async (req, res) => {
  try {
    const { bannerId } = req.params;

    const website = await WebSite.findOne();

    if (!website) {
      return res.status(404).json({
        success: false,
        message: "Website settings not found.",
      });
    }

    const banner = website.heroBanners.id(bannerId);

    if (!banner) {
      return res.status(404).json({
        success: false,
        message: "Hero banner not found.",
      });
    }

    banner.isActive = !banner.isActive;

    await website.save();

    return res.status(200).json({
      success: true,
      message: `Hero banner ${banner.isActive ? "activated" : "deactivated"} successfully.`,
      website,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const reorderHeroBanners = async (req, res) => {
  try {
    const { bannerIds } = req.body;

    if (!Array.isArray(bannerIds) || bannerIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "bannerIds array is required.",
      });
    }

    const website = await WebSite.findOne();

    if (!website) {
      return res.status(404).json({
        success: false,
        message: "Website settings not found.",
      });
    }

    bannerIds.forEach((id, index) => {
      const banner = website.heroBanners.id(id);

      if (banner) {
        banner.order = index + 1;
      }
    });

    website.heroBanners.sort((a, b) => a.order - b.order);

    await website.save();

    return res.status(200).json({
      success: true,
      message: "Hero banners reordered successfully.",
      website,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const createOfferBanner = async (req, res) => {
  try {
    const { title, link, isActive, order } = req.body;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Offer banner image is required.",
      });
    }

    const website = await WebSite.findOne();

    if (!website) {
      return res.status(404).json({
        success: false,
        message: "Website settings not found.",
      });
    }

    const MAX_OFFER_BANNERS = 8;

    if (website.offerBanners.length >= MAX_OFFER_BANNERS) {
      return res.status(400).json({
        success: false,
        message: `Maximum ${MAX_OFFER_BANNERS} offer banners are allowed.`,
      });
    }

    const result = await uploadToCloudinary(
      req.file.buffer,
      "website/offer-banners",
    );

    website.offerBanners.push({
      title,
      link,

      image: {
        publicId: result.public_id,
        url: result.secure_url,
        alt: title || "Offer Banner",
      },

      isActive: isActive ?? true,
      order: order ?? website.offerBanners.length + 1,
    });

    await website.save();

    return res.status(201).json({
      success: true,
      message: "Offer banner created successfully.",
      website,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const updateOfferBanner = async (req, res) => {
  try {
    const { bannerId } = req.params;

    const { title, link, isActive, order } = req.body;

    const website = await WebSite.findOne();

    if (!website) {
      return res.status(404).json({
        success: false,
        message: "Website settings not found.",
      });
    }

    const banner = website.offerBanners.id(bannerId);

    if (!banner) {
      return res.status(404).json({
        success: false,
        message: "Offer banner not found.",
      });
    }

    // Update Image
    if (req.file) {
      const result = await updateCloudinaryImage(
        req.file.buffer,
        banner.image.publicId,
        "website/offer-banners",
      );

      banner.image = {
        publicId: result.public_id,
        url: result.secure_url,
        alt: title || banner.title,
      };
    }

    // Update Fields
    if (title !== undefined) banner.title = title;

    if (link !== undefined) banner.link = link;

    if (isActive !== undefined) {
      banner.isActive = isActive === "true" || isActive === true;
    }

    if (order !== undefined) {
      banner.order = Number(order);
    }

    await website.save();

    return res.status(200).json({
      success: true,
      message: "Offer banner updated successfully.",
      website,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const deleteOfferBanner = async (req, res) => {
  try {
    const { bannerId } = req.params;

    const website = await WebSite.findOne();

    if (!website) {
      return res.status(404).json({
        success: false,
        message: "Website settings not found.",
      });
    }

    const banner = website.offerBanners.id(bannerId);

    if (!banner) {
      return res.status(404).json({
        success: false,
        message: "Offer banner not found.",
      });
    }

    // Delete image from Cloudinary
    if (banner.image?.publicId) {
      await deleteFromCloudinary(banner.image.publicId);
    }

    // Remove banner
    website.offerBanners.pull(bannerId);

    await website.save();

    return res.status(200).json({
      success: true,
      message: "Offer banner deleted successfully.",
      website,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const toggleOfferBanner = async (req, res) => {
  try {
    const { bannerId } = req.params;

    const website = await WebSite.findOne();

    if (!website) {
      return res.status(404).json({
        success: false,
        message: "Website settings not found.",
      });
    }

    const banner = website.offerBanners.id(bannerId);

    if (!banner) {
      return res.status(404).json({
        success: false,
        message: "Offer banner not found.",
      });
    }

    banner.isActive = !banner.isActive;

    await website.save();

    return res.status(200).json({
      success: true,
      message: `Offer banner ${banner.isActive ? "activated" : "deactivated"} successfully.`,
      website,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const reorderOfferBanners = async (req, res) => {
  try {
    const { bannerIds } = req.body;

    if (!Array.isArray(bannerIds) || bannerIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "bannerIds array is required.",
      });
    }

    const website = await WebSite.findOne();

    if (!website) {
      return res.status(404).json({
        success: false,
        message: "Website settings not found.",
      });
    }

    bannerIds.forEach((id, index) => {
      const banner = website.offerBanners.id(id);

      if (banner) {
        banner.order = index + 1;
      }
    });

    website.offerBanners.sort((a, b) => a.order - b.order);

    await website.save();

    return res.status(200).json({
      success: true,
      message: "Offer banners reordered successfully.",
      website,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const updateAbout = async (req, res) => {
  try {
    const { heading, description } = req.body;

    const website = await WebSite.findOne();

    if (!website) {
      return res.status(404).json({
        success: false,
        message: "Website settings not found.",
      });
    }

    // Update Text
    if (heading !== undefined) {
      website.about.heading = heading;
    }

    if (description !== undefined) {
      website.about.description = description;
    }

    // Update Image
    if (req.file) {
      let result;

      if (website.about.image?.publicId) {
        result = await updateCloudinaryImage(
          req.file.buffer,
          website.about.image.publicId,
          "website/about",
        );
      } else {
        result = await uploadToCloudinary(req.file.buffer, "website/about");
      }

      website.about.image = {
        publicId: result.public_id,
        url: result.secure_url,
        alt: heading || "About Image",
      };
    }

    await website.save();

    return res.status(200).json({
      success: true,
      message: "About section updated successfully.",
      website,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const updateContact = async (req, res) => {
  try {
    const { email, phone, whatsapp, address, mapUrl } = req.body;

    const website = await WebSite.findOne();

    if (!website) {
      return res.status(404).json({
        success: false,
        message: "Website settings not found.",
      });
    }

    if (email !== undefined) {
      website.contact.email = email;
    }

    if (phone !== undefined) {
      website.contact.phone = phone;
    }

    if (whatsapp !== undefined) {
      website.contact.whatsapp = whatsapp;
    }

    if (address !== undefined) {
      website.contact.address = address;
    }

    if (mapUrl !== undefined) {
      website.contact.mapUrl = mapUrl;
    }

    await website.save();

    return res.status(200).json({
      success: true,
      message: "Contact information updated successfully.",
      website,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const updateSocial = async (req, res) => {
  try {
    const { facebook, instagram, twitter, youtube, linkedin } = req.body;

    const website = await WebSite.findOne();

    if (!website) {
      return res.status(404).json({
        success: false,
        message: "Website settings not found.",
      });
    }

    if (facebook !== undefined) {
      website.social.facebook = facebook;
    }

    if (instagram !== undefined) {
      website.social.instagram = instagram;
    }

    if (twitter !== undefined) {
      website.social.twitter = twitter;
    }

    if (youtube !== undefined) {
      website.social.youtube = youtube;
    }

    if (linkedin !== undefined) {
      website.social.linkedin = linkedin;
    }

    await website.save();

    return res.status(200).json({
      success: true,
      message: "Social links updated successfully.",
      website,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const updateFooter = async (req, res) => {
  try {
    const { copyright, footerDescription } = req.body;

    const website = await WebSite.findOne();

    if (!website) {
      return res.status(404).json({
        success: false,
        message: "Website settings not found.",
      });
    }

    if (copyright !== undefined) {
      website.footer.copyright = copyright;
    }

    if (footerDescription !== undefined) {
      website.footer.footerDescription = footerDescription;
    }

    await website.save();

    return res.status(200).json({
      success: true,
      message: "Footer updated successfully.",
      website,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const updateSeo = async (req, res) => {
  try {
    const { metaTitle, metaDescription, metaKeywords } = req.body;

    const website = await WebSite.findOne();

    if (!website) {
      return res.status(404).json({
        success: false,
        message: "Website settings not found.",
      });
    }

    if (metaTitle !== undefined) {
      website.seo.metaTitle = metaTitle.trim();
    }

    if (metaDescription !== undefined) {
      website.seo.metaDescription = metaDescription.trim();
    }

    if (metaKeywords !== undefined) {
      if (Array.isArray(metaKeywords)) {
        website.seo.metaKeywords = metaKeywords;
      } else {
        website.seo.metaKeywords = metaKeywords
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean);
      }
    }

    await website.save();

    return res.status(200).json({
      success: true,
      message: "SEO settings updated successfully.",
      website,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
