import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    text: {
      type: String,
    },
    image: {
      type: String,
    },
    document: {
      type: String,
    }, // Already present, will store PDF path (e.g., "uploads/123456789.pdf")
    seen: {
      type: Boolean,
      default: false, // Default to false (unseen, single tick)
    },
  },
  { timestamps: true } // Already includes createdAt and updatedAt
);

const Message = mongoose.model("Message", messageSchema);

export default Message;