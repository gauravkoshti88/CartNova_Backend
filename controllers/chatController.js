import Conversation from "../models/chat/conversationSchema.js";
import Message from "../models/chat/messageSchema.js";
import { uploadToCloudinary } from "../utils/cloudinaryFunc.js";

//    HELPERS ------------->>>>>>>>>>>

const conversationPopulate = [
  {
    path: "userId",
    select: "firstName lastName email phone profileImage",
  },
  {
    path: "adminId",
    select: "firstName lastName email",
  },
  {
    path: "lastMessage",
    select: "senderId senderType text attachments isRead readAt createdAt",
  },
];

//    USER CONTROLLERS -------------->>>>>>>>>>>>>>

/**
 * GET /api/chat/user/conversations
 *
 * Get all conversations of logged-in user
 */
export const getUserConversations = async (req, res) => {
  try {
    const userId = req.userId;

    const conversations = await Conversation.find({
      userId,
    })
      .populate(conversationPopulate)
      .sort({
        lastMessageAt: -1,
        updatedAt: -1,
      })
      .lean();

    return res.status(200).json({
      success: true,
      count: conversations.length,
      conversations,
    });
  } catch (error) {
    console.error("GET USER CONVERSATIONS ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to get user conversations",
    });
  }
};

/**
 * POST /api/chat/user/conversations
 *
 * Get existing open conversation
 * OR create new conversation
 */
export const getOrCreateConversation = async (req, res) => {
  try {
    const userId = req.userId;

    let conversation = await Conversation.findOne({
      userId,
      status: "open",
    });

    //    CREATE NEW CONVERSATION

    if (!conversation) {
      conversation = await Conversation.create({
        userId,
        adminId: null,
        status: "open",
        unreadForUser: 0,
        unreadForAdmin: 0,
      });
    }

    //    POPULATE

    conversation = await Conversation.findById(conversation._id).populate(
      conversationPopulate,
    );

    return res.status(200).json({
      success: true,
      message: "Conversation ready",
      conversation,
    });
  } catch (error) {
    console.error("GET OR CREATE CONVERSATION ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create conversation",
    });
  }
};

/**
 * GET /api/chat/user/conversations/:conversationId
 *
 * Get single conversation
 */
export const getUserConversation = async (req, res) => {
  try {
    const userId = req.userId;
    const { conversationId } = req.params;

    const conversation = await Conversation.findOne({
      _id: conversationId,
      userId,
    }).populate(conversationPopulate);

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: "Conversation not found",
      });
    }

    return res.status(200).json({
      success: true,
      conversation,
    });
  } catch (error) {
    console.error("GET USER CONVERSATION ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to get conversation",
    });
  }
};

/**
 * GET /api/chat/user/conversations/:conversationId/messages
 *
 * Get messages of user's conversation
 */
export const getUserMessages = async (req, res) => {
  try {
    const userId = req.userId;
    const { conversationId } = req.params;

    const limit = Math.min(Math.max(parseInt(req.query.limit) || 30, 1), 50);

    const before = req.query.before;

    const conversation = await Conversation.findOne({
      _id: conversationId,
      userId,
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: "Conversation not found",
      });
    }

    const query = {
      conversationId,
    };

    if (before) {
      const beforeMessage = await Message.findOne({
        _id: before,
        conversationId,
      }).select("createdAt");

      if (beforeMessage) {
        query.createdAt = {
          $lt: beforeMessage.createdAt,
        };
      }
    }

    const messages = await Message.find(query)
      .populate("senderId", "firstName lastName email profileImage")
      .sort({
        createdAt: -1,
      })
      .limit(limit)
      .lean();

    const hasMore = messages.length === limit;

    messages.reverse();

    return res.status(200).json({
      success: true,
      messages,
      hasMore,
    });
  } catch (error) {
    console.error("GET USER MESSAGES ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to get messages",
    });
  }
};

/**
 * PATCH /api/chat/user/conversations/:conversationId/read
 *
 * Mark admin messages as read by user
 */
export const markUserMessagesRead = async (req, res) => {
  try {
    const userId = req.userId;
    const { conversationId } = req.params;

    const conversation = await Conversation.findOne({
      _id: conversationId,
      userId,
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: "Conversation not found",
      });
    }

    //    MARK ADMIN MESSAGES AS READ

    await Message.updateMany(
      {
        conversationId,
        senderType: "Admin",
        isRead: false,
      },
      {
        $set: {
          isRead: true,
          readAt: new Date(),
        },
      },
    );

    //    RESET USER UNREAD COUNT

    conversation.unreadForUser = 0;

    await conversation.save();

    return res.status(200).json({
      success: true,
      message: "Messages marked as read",
    });
  } catch (error) {
    console.error("MARK USER MESSAGES READ ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to mark messages as read",
    });
  }
};

//    ADMIN CONTROLLERS -------------->>>>>>>>>>>>>>

/**
 * GET /api/chat/admin/conversations
 *
 * Get all customer conversations
 */
export const getAdminConversations = async (req, res) => {
  try {
    const conversations = await Conversation.find()
      .populate(conversationPopulate)
      .sort({
        lastMessageAt: -1,
        updatedAt: -1,
      })
      .lean();

    return res.status(200).json({
      success: true,
      count: conversations.length,
      conversations,
    });
  } catch (error) {
    console.error("GET ADMIN CONVERSATIONS ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to get admin conversations",
    });
  }
};

/**
 * GET /api/chat/admin/conversations/:conversationId
 *
 * Get single conversation
 */
export const getAdminConversation = async (req, res) => {
  try {
    const { conversationId } = req.params;

    const conversation =
      await Conversation.findById(conversationId).populate(
        conversationPopulate,
      );

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: "Conversation not found",
      });
    }

    return res.status(200).json({
      success: true,
      conversation,
    });
  } catch (error) {
    console.error("GET ADMIN CONVERSATION ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to get conversation",
    });
  }
};

/**
 * GET /api/chat/admin/conversations/:conversationId/messages
 *
 * Get conversation messages
 */
export const getAdminMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;

    const limit = Math.min(Math.max(parseInt(req.query.limit) || 30, 1), 50);

    const before = req.query.before;

    const conversation = await Conversation.findById(conversationId);

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: "Conversation not found",
      });
    }

    const query = {
      conversationId,
    };

    if (before) {
      const beforeMessage = await Message.findOne({
        _id: before,
        conversationId,
      }).select("createdAt");

      if (beforeMessage) {
        query.createdAt = {
          $lt: beforeMessage.createdAt,
        };
      }
    }

    const messages = await Message.find(query)
      .populate("senderId", "firstName lastName email profileImage")
      .sort({
        createdAt: -1,
      })
      .limit(limit)
      .lean();

    const hasMore = messages.length === limit;

    messages.reverse();

    return res.status(200).json({
      success: true,
      messages,
      hasMore,
    });
  } catch (error) {
    console.error("GET ADMIN MESSAGES ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to get messages",
    });
  }
};

/**
 * PATCH /api/chat/admin/conversations/:conversationId/assign
 *
 * Assign conversation to logged-in admin
 */
export const assignConversation = async (req, res) => {
  try {
    const adminId = req.adminId;
    const { conversationId } = req.params;

    const conversation = await Conversation.findByIdAndUpdate(
      conversationId,
      {
        adminId,
        status: "open",
      },
      {
        new: true,
        runValidators: true,
      },
    ).populate(conversationPopulate);

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: "Conversation not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Conversation assigned successfully",
      conversation,
    });
  } catch (error) {
    console.error("ASSIGN CONVERSATION ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to assign conversation",
    });
  }
};

/**
 * PATCH /api/chat/admin/conversations/:conversationId/read
 *
 * Mark user messages as read by admin
 */
export const markAdminMessagesRead = async (req, res) => {
  try {
    const adminId = req.adminId;
    const { conversationId } = req.params;

    const conversation = await Conversation.findById(conversationId);

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: "Conversation not found",
      });
    }

    //    OPTIONAL ASSIGNMENT CHECK

    if (
      conversation.adminId &&
      conversation.adminId.toString() !== adminId.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: "This conversation is assigned to another admin",
      });
    }

    //    MARK USER MESSAGES AS READ

    await Message.updateMany(
      {
        conversationId,
        senderType: "User",
        isRead: false,
      },
      {
        $set: {
          isRead: true,
          readAt: new Date(),
        },
      },
    );

    //    RESET ADMIN UNREAD COUNT

    conversation.unreadForAdmin = 0;

    await conversation.save();

    return res.status(200).json({
      success: true,
      message: "Messages marked as read",
    });
  } catch (error) {
    console.error("MARK ADMIN MESSAGES READ ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to mark messages as read",
    });
  }
};

/**
 * PATCH /api/chat/admin/conversations/:conversationId/close
 *
 * Close conversation
 */
export const closeConversation = async (req, res) => {
  try {
    const adminId = req.adminId;
    const { conversationId } = req.params;

    const conversation = await Conversation.findById(conversationId);

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: "Conversation not found",
      });
    }

    //    CHECK ASSIGNED ADMIN

    if (
      conversation.adminId &&
      conversation.adminId.toString() !== adminId.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: "This conversation is assigned to another admin",
      });
    }

    conversation.status = "closed";

    await conversation.save();

    const updatedConversation =
      await Conversation.findById(conversationId).populate(
        conversationPopulate,
      );

    return res.status(200).json({
      success: true,
      message: "Conversation closed successfully",
      conversation: updatedConversation,
    });
  } catch (error) {
    console.error("CLOSE CONVERSATION ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to close conversation",
    });
  }
};

/**
 * PATCH /api/chat/admin/conversations/:conversationId/reopen
 *
 * Reopen closed conversation
 */
export const reopenConversation = async (req, res) => {
  try {
    const adminId = req.adminId;
    const { conversationId } = req.params;

    const conversation = await Conversation.findById(conversationId);

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: "Conversation not found",
      });
    }

    conversation.status = "open";
    conversation.adminId = adminId;

    await conversation.save();

    const updatedConversation =
      await Conversation.findById(conversationId).populate(
        conversationPopulate,
      );

    return res.status(200).json({
      success: true,
      message: "Conversation reopened successfully",
      conversation: updatedConversation,
    });
  } catch (error) {
    console.error("REOPEN CONVERSATION ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to reopen conversation",
    });
  }
};

/**
 * PATCH /api/chat/admin/conversations/:conversationId/unassign
 *
 * Remove admin assignment
 */
export const unassignConversation = async (req, res) => {
  try {
    const adminId = req.adminId;
    const { conversationId } = req.params;

    const conversation = await Conversation.findById(conversationId);

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: "Conversation not found",
      });
    }

    if (
      conversation.adminId &&
      conversation.adminId.toString() !== adminId.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: "This conversation is assigned to another admin",
      });
    }

    conversation.adminId = null;

    await conversation.save();

    const updatedConversation =
      await Conversation.findById(conversationId).populate(
        conversationPopulate,
      );

    return res.status(200).json({
      success: true,
      message: "Conversation unassigned successfully",
      conversation: updatedConversation,
    });
  } catch (error) {
    console.error("UNASSIGN CONVERSATION ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to unassign conversation",
    });
  }
};

/**
 * DELETE /api/chat/admin/conversations/:conversationId
 *
 * Delete conversation and its messages
 */

export const deleteConversation = async (req, res) => {
  try {
    const { conversationId } = req.params;

    const conversation = await Conversation.findById(conversationId);

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: "Conversation not found",
      });
    }

    //    DELETE ALL MESSAGES

    await Message.deleteMany({
      conversationId,
    });

    // DELETE CONVERSATION

    await Conversation.findByIdAndDelete(conversationId);

    return res.status(200).json({
      success: true,
      message: "Conversation deleted successfully",
    });
  } catch (error) {
    console.error("DELETE CONVERSATION ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete conversation",
    });
  }
};

// Upload chat attachments
export const uploadChatAttachments = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No files uploaded",
      });
    }

    const uploadedFiles = [];

    for (const file of req.files) {
      const isImage = file.mimetype.startsWith("image/");

      const result = await uploadToCloudinary(file.buffer, "cartnova/chat", {
        resourceType: isImage ? "image" : "auto",
      });

      uploadedFiles.push({
        url: result.secure_url,
        publicId: result.public_id,
        type: isImage ? "image" : "file",
        name: file.originalname,
        size: file.size,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Chat attachments uploaded successfully",
      attachments: uploadedFiles,
    });
  } catch (error) {
    console.error("UPLOAD CHAT ATTACHMENTS ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to upload chat attachments",
    });
  }
};
