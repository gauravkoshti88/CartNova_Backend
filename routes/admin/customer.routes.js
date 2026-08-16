import express from "express";

import {
  getAllCustomers,
  getCustomerById,
  updateCustomer,
  deleteCustomer,
  blockCustomer,
  unblockCustomer,
} from "../../controllers/admin/customer.controller.js";
import { adminAuth } from "../../middleware/Auth.js";

const customerRouter = express.Router();

customerRouter.get("/customers", adminAuth, getAllCustomers);

customerRouter.get("/customers/:id", adminAuth, getCustomerById);

customerRouter.put("/customers/:id", adminAuth, updateCustomer);

customerRouter.delete("/customers/:id", adminAuth, deleteCustomer);

customerRouter.patch("/customers/:id/block", adminAuth, blockCustomer);

customerRouter.patch("/customers/:id/unblock", adminAuth, unblockCustomer);

export default customerRouter;
