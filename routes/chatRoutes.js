import express from "express";

import {
  getUserConversations,
  getOrCreateConversation,
  getUserConversation,
  getUserMessages,
  markUserMessagesRead,
  getAdminConversations,
  getAdminConversation,
  getAdminMessages,
  assignConversation,
  markAdminMessagesRead,
  closeConversation,
  reopenConversation,
  unassignConversation,
  deleteConversation,
  uploadChatAttachments,
} from "../controllers/chatController.js";

import { userAuth, adminAuth } from "../middleware/Auth.js";
import chatUpload from "../middleware/chatUpload.js";
import { chatAuth } from "../middleware/chatAuth.js";

const chatRouter = express.Router();

chatRouter.post(
  "/upload",
  chatAuth,
  chatUpload.array("files", 5),
  uploadChatAttachments,
);

//  USER CHAT

chatRouter.get("/user/conversations", userAuth, getUserConversations);

chatRouter.post("/user/conversations", userAuth, getOrCreateConversation);

chatRouter.get(
  "/user/conversations/:conversationId",
  userAuth,
  getUserConversation,
);

chatRouter.get(
  "/user/conversations/:conversationId/messages",
  userAuth,
  getUserMessages,
);

chatRouter.patch(
  "/user/conversations/:conversationId/read",
  userAuth,
  markUserMessagesRead,
);

//  ADMIN CHAT

chatRouter.get("/admin/conversations", adminAuth, getAdminConversations);

chatRouter.get(
  "/admin/conversations/:conversationId",
  adminAuth,
  getAdminConversation,
);

chatRouter.get(
  "/admin/conversations/:conversationId/messages",
  adminAuth,
  getAdminMessages,
);

chatRouter.patch(
  "/admin/conversations/:conversationId/assign",
  adminAuth,
  assignConversation,
);

chatRouter.patch(
  "/admin/conversations/:conversationId/read",
  adminAuth,
  markAdminMessagesRead,
);

chatRouter.patch(
  "/admin/conversations/:conversationId/close",
  adminAuth,
  closeConversation,
);

chatRouter.patch(
  "/admin/conversations/:conversationId/reopen",
  adminAuth,
  reopenConversation,
);

chatRouter.patch(
  "/admin/conversations/:conversationId/unassign",
  adminAuth,
  unassignConversation,
);

chatRouter.delete(
  "/admin/conversations/:conversationId",
  adminAuth,
  deleteConversation,
);

export default chatRouter;
