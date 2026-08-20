import jwt from "jsonwebtoken";

import Conversation from "../models/chat/conversationSchema.js";
import Message from "../models/chat/messageSchema.js";

// Parse cookies from socket handshake
const parseCookies = (cookieHeader = "") => {
  return cookieHeader.split(";").reduce((cookies, cookie) => {
    const [key, ...valueParts] = cookie.trim().split("=");

    if (!key) {
      return cookies;
    }

    cookies[key] = decodeURIComponent(valueParts.join("="));

    return cookies;
  }, {});
};

// Socket authentication
const authenticateSocket = (socket) => {
  try {
    const cookieHeader = socket.handshake.headers.cookie;

    if (!cookieHeader) {
      return null;
    }

    const cookies = parseCookies(cookieHeader);

    // User authentication
    if (cookies.userToken) {
      const decoded = jwt.verify(cookies.userToken, process.env.JWT_SECRET);

      if (!decoded?.userId) {
        return null;
      }

      return {
        type: "user",
        modelType: "User",
        id: decoded.userId,
      };
    }

    // Admin authentication
    if (cookies.adminToken) {
      const decoded = jwt.verify(cookies.adminToken, process.env.JWT_SECRET);

      if (!decoded?.adminId) {
        return null;
      }

      return {
        type: "admin",
        modelType: "Admin",
        id: decoded.adminId,
      };
    }

    return null;
  } catch (error) {
    console.error("SOCKET AUTH ERROR:", error);

    return null;
  }
};

// Message rate limiter
const messageRateLimit = new Map();

const MESSAGE_LIMIT = 10;
const MESSAGE_WINDOW = 10000;

const checkMessageRateLimit = (socketId) => {
  const now = Date.now();

  const current = messageRateLimit.get(socketId);

  if (!current) {
    messageRateLimit.set(socketId, {
      count: 1,
      startedAt: now,
    });

    return true;
  }

  if (now - current.startedAt > MESSAGE_WINDOW) {
    messageRateLimit.set(socketId, {
      count: 1,
      startedAt: now,
    });

    return true;
  }

  if (current.count >= MESSAGE_LIMIT) {
    return false;
  }

  current.count += 1;

  return true;
};

// Validate message payload
const validateMessagePayload = ({ text, attachments }) => {
  const cleanText = typeof text === "string" ? text.trim() : "";

  const validAttachments = Array.isArray(attachments) ? attachments : [];

  if (cleanText.length === 0 && validAttachments.length === 0) {
    return {
      valid: false,
      message: "Message cannot be empty",
    };
  }

  if (cleanText.length > 2000) {
    return {
      valid: false,
      message: "Message cannot exceed 2000 characters",
    };
  }

  if (validAttachments.length > 5) {
    return {
      valid: false,
      message: "Maximum 5 attachments are allowed",
    };
  }

  return {
    valid: true,
    cleanText,
    attachments: validAttachments,
  };
};

// Check whether a user/admin is currently inside a conversation
const isUserOnlineInConversation = (io, conversationId, userType, userId) => {
  if (!userId) {
    return false;
  }

  const room = io.sockets.adapter.rooms.get(`conversation:${conversationId}`);

  if (!room) {
    return false;
  }

  for (const socketId of room) {
    const connectedSocket = io.sockets.sockets.get(socketId);

    if (
      connectedSocket &&
      connectedSocket.userType === userType &&
      connectedSocket.userId.toString() === userId.toString()
    ) {
      return true;
    }
  }

  return false;
};

// Get number of active connections for a user/admin
const getOnlineUserCount = (io, userType, userId) => {
  let count = 0;

  for (const socket of io.sockets.sockets.values()) {
    if (
      socket.userType === userType &&
      socket.userId.toString() === userId.toString()
    ) {
      count += 1;
    }
  }

  return count;
};

// Initialize chat socket
export const initializeChatSocket = (io) => {
  // Socket authentication middleware
  io.use((socket, next) => {
    const authUser = authenticateSocket(socket);

    if (!authUser) {
      return next(new Error("Socket authentication failed"));
    }

    socket.userId = authUser.id;
    socket.userType = authUser.type;
    socket.modelType = authUser.modelType;

    next();
  });

  // Socket connection
  io.on("connection", async (socket) => {
    // Personal room
    const personalRoom = `${socket.userType}:${socket.userId}`;

    socket.join(personalRoom);

    // Admin global room
    if (socket.userType === "admin") {
      socket.join("admins");

      const adminConnections = getOnlineUserCount(io, "admin", socket.userId);

      if (adminConnections === 1) {
        io.to("admins").emit("admin:online", {
          adminId: socket.userId,
        });
      }
    }

    // User online
    if (socket.userType === "user") {
      const userConnections = getOnlineUserCount(io, "user", socket.userId);

      if (userConnections === 1) {
        io.to("admins").emit("user:online", {
          userId: socket.userId,
        });
      }
    }

    // Join conversation
    socket.on("conversation:join", async ({ conversationId }) => {
      try {
        if (!conversationId) {
          socket.emit("conversation:error", {
            message: "Conversation ID is required",
          });

          return;
        }

        const conversation = await Conversation.findById(conversationId);

        if (!conversation) {
          socket.emit("conversation:error", {
            message: "Conversation not found",
          });

          return;
        }

        // User authorization
        if (
          socket.userType === "user" &&
          conversation.userId.toString() !== socket.userId.toString()
        ) {
          socket.emit("conversation:error", {
            message: "You are not allowed to join this conversation",
          });

          return;
        }

        // Admin authorization
        if (
          socket.userType === "admin" &&
          conversation.adminId &&
          conversation.adminId.toString() !== socket.userId.toString()
        ) {
          socket.emit("conversation:error", {
            message: "This conversation is assigned to another admin",
          });

          return;
        }

        // Join conversation room
        const room = `conversation:${conversationId}`;

        socket.join(room);

        socket.emit("conversation:joined", {
          conversationId,
        });
      } catch (error) {
        console.error("JOIN CONVERSATION ERROR:", error);

        socket.emit("conversation:error", {
          message: "Failed to join conversation",
        });
      }
    });

    // Leave conversation
    socket.on("conversation:leave", ({ conversationId }) => {
      if (!conversationId) {
        return;
      }

      socket.leave(`conversation:${conversationId}`);
    });

    // Send message
    socket.on(
      "message:send",
      async ({ conversationId, text = "", attachments = [] }) => {
        try {
          // Rate limit
          if (!checkMessageRateLimit(socket.id)) {
            socket.emit("message:error", {
              message: "Too many messages. Please wait a moment.",
            });

            return;
          }

          // Conversation ID validation
          if (!conversationId) {
            socket.emit("message:error", {
              message: "Conversation ID is required",
            });

            return;
          }

          // Message validation
          const validation = validateMessagePayload({
            text,
            attachments,
          });

          if (!validation.valid) {
            socket.emit("message:error", {
              message: validation.message,
            });

            return;
          }

          const cleanText = validation.cleanText;

          const validAttachments = validation.attachments;

          // Find conversation
          const conversation = await Conversation.findById(conversationId);

          if (!conversation) {
            socket.emit("message:error", {
              message: "Conversation not found",
            });

            return;
          }

          // User authorization
          if (
            socket.userType === "user" &&
            conversation.userId.toString() !== socket.userId.toString()
          ) {
            socket.emit("message:error", {
              message: "You are not allowed to send message here",
            });

            return;
          }

          // Admin authorization
          if (
            socket.userType === "admin" &&
            conversation.adminId &&
            conversation.adminId.toString() !== socket.userId.toString()
          ) {
            socket.emit("message:error", {
              message: "This conversation is assigned to another admin",
            });

            return;
          }

          // Admin auto assignment
          if (socket.userType === "admin" && !conversation.adminId) {
            conversation.adminId = socket.userId;
          }

          // Sender model type
          const senderType = socket.userType === "user" ? "User" : "Admin";

          // Recipient information
          const recipientType = socket.userType === "user" ? "admin" : "user";

          const recipientId =
            socket.userType === "user"
              ? conversation.adminId
              : conversation.userId;

          // Check whether recipient is currently inside conversation
          const recipientOnline = isUserOnlineInConversation(
            io,
            conversationId,
            recipientType,
            recipientId,
          );

          // Initial message status
          const messageStatus = recipientOnline ? "delivered" : "sent";

          // Create message
          const message = await Message.create({
            conversationId,
            senderId: socket.userId,
            senderType,
            text: cleanText,
            attachments: validAttachments,
            messageStatus,
            isRead: false,
            readAt: null,
          });

          // Update conversation
          conversation.lastMessage = message._id;
          const getAttachmentMessageText = (attachments) => {
            if (!attachments?.length) {
              return "";
            }

            const type = attachments[0]?.type?.toLowerCase();

            switch (type) {
              case "image":
                return "📷 Image";

              case "video":
                return "🎥 Video";

              case "audio":
                return "🎵 Audio";

              case "pdf":
                return "📄 PDF";

              case "file":
              case "document":
                return "📎 Document";

              default:
                return "📎 Attachment";
            }
          };

          conversation.lastMessageText =
            cleanText || getAttachmentMessageText(validAttachments);

          conversation.lastMessageAt = new Date();

          // Update unread count
          if (socket.userType === "user") {
            conversation.unreadForAdmin += 1;
          } else {
            conversation.unreadForUser += 1;
          }

          // Save conversation
          await conversation.save();

          // Populate message
          const populatedMessage = await Message.findById(message._id).populate(
            "senderId",
            "firstName lastName email profileImage",
          );

          // Populate conversation
          const populatedConversation = await Conversation.findById(
            conversation._id,
          )
            .populate("userId", "firstName lastName email phone profileImage")
            .populate("adminId", "firstName lastName email")
            .populate(
              "lastMessage",
              "senderId senderType text attachments messageStatus isRead readAt createdAt",
            );

          // Send message to conversation room
          io.to(`conversation:${conversationId}`).emit("message:new", {
            message: populatedMessage,
          });

          // Conversation update
          io.to(`conversation:${conversationId}`).emit("conversation:updated", {
            conversation: populatedConversation,
          });

          // Message delivered event
          if (recipientOnline) {
            io.to(`conversation:${conversationId}`).emit("message:delivered", {
              conversationId,
              messageId: message._id,
            });
          }

          // Admin notification
          if (socket.userType === "user") {
            io.to("admins").emit("admin:new-message", {
              conversationId,
              message: populatedMessage,
              conversation: populatedConversation,
            });
          }

          // User notification
          if (socket.userType === "admin") {
            io.to(`user:${conversation.userId}`).emit("user:new-message", {
              conversationId,
              message: populatedMessage,
              conversation: populatedConversation,
            });
          }
        } catch (error) {
          console.error("SEND MESSAGE SOCKET ERROR:", error);

          socket.emit("message:error", {
            message: "Failed to send message",
          });
        }
      },
    );

    // Typing start
    socket.on("typing:start", ({ conversationId }) => {
      if (!conversationId) {
        return;
      }

      socket.to(`conversation:${conversationId}`).emit("typing:start", {
        conversationId,
        userId: socket.userId,
        userType: socket.userType,
      });
    });

    // Typing stop
    socket.on("typing:stop", ({ conversationId }) => {
      if (!conversationId) {
        return;
      }

      socket.to(`conversation:${conversationId}`).emit("typing:stop", {
        conversationId,
        userId: socket.userId,
        userType: socket.userType,
      });
    });

    // Message read
    socket.on("message:read", async ({ conversationId }) => {
      try {
        if (!conversationId) {
          return;
        }

        const conversation = await Conversation.findById(conversationId);

        if (!conversation) {
          return;
        }

        // User authorization
        if (
          socket.userType === "user" &&
          conversation.userId.toString() !== socket.userId.toString()
        ) {
          return;
        }

        // Admin authorization
        if (
          socket.userType === "admin" &&
          conversation.adminId &&
          conversation.adminId.toString() !== socket.userId.toString()
        ) {
          return;
        }

        // Messages sent by the opposite side
        const senderType = socket.userType === "user" ? "Admin" : "User";

        // Update messages to read
        const readAt = new Date();

        const updatedMessages = await Message.updateMany(
          {
            conversationId,
            senderType,
            messageStatus: {
              $ne: "read",
            },
          },
          {
            $set: {
              messageStatus: "read",
              isRead: true,
              readAt,
            },
          },
        );

        // Reset unread count
        if (socket.userType === "user") {
          conversation.unreadForUser = 0;
        } else {
          conversation.unreadForAdmin = 0;
        }

        await conversation.save();

        // Read update
        io.to(`conversation:${conversationId}`).emit("message:read:update", {
          conversationId,
          readerType: socket.userType,
          modifiedCount: updatedMessages.modifiedCount,
        });

        // Updated conversation
        const updatedConversation = await Conversation.findById(conversationId)
          .populate("userId", "firstName lastName email phone profileImage")
          .populate("adminId", "firstName lastName email")
          .populate(
            "lastMessage",
            "senderId senderType text attachments messageStatus isRead readAt createdAt",
          );

        io.to(`conversation:${conversationId}`).emit("conversation:updated", {
          conversation: updatedConversation,
        });
      } catch (error) {
        console.error("MESSAGE READ SOCKET ERROR:", error);
      }
    });

    // Disconnect
    socket.on("disconnect", () => {
      // Remove rate limiter entry
      messageRateLimit.delete(socket.id);

      // Check remaining connections
      const remainingConnections = getOnlineUserCount(
        io,
        socket.userType,
        socket.userId,
      );

      // User offline
      if (socket.userType === "user" && remainingConnections === 0) {
        io.to("admins").emit("user:offline", {
          userId: socket.userId,
        });
      }

      // Admin offline
      if (socket.userType === "admin" && remainingConnections === 0) {
        io.to("admins").emit("admin:offline", {
          adminId: socket.userId,
        });
      }
    });
  });
};
