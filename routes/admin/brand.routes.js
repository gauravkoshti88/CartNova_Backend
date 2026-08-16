import express from "express";
import { adminAuth } from "../../middleware/Auth.js";
import { addNewBrand, deleteBrand, getAllBrand, getAllDeletedBrand, getBrandByCategory, getBrandBySlug, undoDeletedBrand, updateBrand, updateBrandStatus} from "../../controllers/admin/brand.controller.js";
import upload from "../../middleware/multer.js";

const brandRouter = express.Router();

brandRouter.get("/category/get-all-brands", adminAuth, getAllBrand);

brandRouter.get("/category/get-all-deleted-brand", adminAuth, getAllDeletedBrand);

brandRouter.get("/category/get-brand/:categorySlug", adminAuth, getBrandByCategory);

brandRouter.get("/category/brand/:slug", adminAuth, getBrandBySlug);

brandRouter.post("/category/add-new-brand", adminAuth, upload.single("image"), addNewBrand);

brandRouter.put("/category/update-brand/:slug", adminAuth, upload.single("image"), updateBrand);

brandRouter.put("/category/undo-deleted-brand/:slug", adminAuth, undoDeletedBrand)

brandRouter.patch("/category/update-brand-status/:slug", adminAuth, updateBrandStatus);

brandRouter.delete("/category/delete-brand/:slug", adminAuth, deleteBrand);

export default brandRouter;