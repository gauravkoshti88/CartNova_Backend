import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
      index: true,
    },

    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: "senderType",
    },

    senderType: {
      type: String,
      enum: ["User", "Admin"],
      required: true,
    },

    text: {
      type: String,
      trim: true,
      default: "",
    },

    attachments: [
      {
        url: {
          type: String,
          default: "",
        },

        publicId: {
          type: String,
          default: "",
        },

        type: {
          type: String,
          enum: ["image", "file"],
          default: "image",
        },

        name: {
          type: String,
          default: "",
        },

        size: {
          type: Number,
          default: 0,
        },
      },
    ],

    messageStatus: {
      type: String,
      enum: ["sent", "delivered", "read"],
      default: "sent",
      index: true,
    },

    isRead: {
      type: Boolean,
      default: false,
    },

    readAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

messageSchema.index({
  conversationId: 1,
  createdAt: -1,
});

const Message = mongoose.model("Message", messageSchema);

export default Message;
