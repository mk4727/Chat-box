import User from "../models/user.model.js";
import Message from "../models/message.model.js";
import cloudinary from "../lib/cloudinary.js";
import { getReceiverSocketId, io } from "../lib/socket.js";
import path from "path";

const _dirname = path.resolve();

export const getUsersForSidebar = async (req, res) => {
  try {
    const loggedInUserId = req.user._id;
    const filteredUsers = await User.find({ _id: { $ne: loggedInUserId } }).select("-password");

    res.status(200).json(filteredUsers);
  } catch (error) {
    console.error("Error in getUsersForSidebar: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getMessages = async (req, res) => {
  try {
    const { id: userToChatId } = req.params;
    const myId = req.user._id;

    const messages = await Message.find({
      $or: [
        { senderId: myId, receiverId: userToChatId },
        { senderId: userToChatId, receiverId: myId },
      ],
    }).sort({ createdAt: 1 });

    res.status(200).json(messages);
  } catch (error) {
    console.log("Error in getMessages controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const sendMesssage = async (req, res) => {
  try {
    const { text } = req.body; // Text is optional
    const { id: receiverId } = req.params;
    const senderId = req.user._id;
    const imageFile = req.file; // Assuming multer is set up to handle file uploads

    let imageUrl;
    let documentPath;

    // Handle image upload if present
    if (req.body.image) {
      const uploadResponse = await cloudinary.uploader.upload(req.body.image);
      imageUrl = uploadResponse.secure_url;
    }

    // Handle PDF or document upload if present
    if (imageFile) {
      console.log("Uploaded file path:", imageFile.path);
      console.log("Uploaded file filename:", imageFile.filename);
      documentPath = `uploads/${imageFile.filename}`;
    }

    // Create new message with text, image, or document
    const newMessage = new Message({
      senderId,
      receiverId,
      text: text || "", // Allow empty text if only file is sent
      image: imageUrl || undefined,
      document: documentPath || undefined,
      seen: false,
    });

    await newMessage.save();

    // Emit the new message to the receiver via socket
    const receiverSocketId = getReceiverSocketId(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("newMessage", newMessage);
    }

    res.status(201).json(newMessage);
  } catch (error) {
    console.error("Error in sendMesssage: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const markMessagesAsSeen = async (req, res) => {
  try {
    const { messageIds } = req.body;
    const authUserId = req.user._id;

    const updatedMessages = await Message.updateMany(
      { _id: { $in: messageIds }, receiverId: authUserId, seen: false },
      { $set: { seen: true } }
    );

    if (updatedMessages.modifiedCount > 0) {
      const messages = await Message.find({ _id: { $in: messageIds } });

      messages.forEach((msg) => {
        const receiverSocketId = getReceiverSocketId(msg.receiverId);
        if (receiverSocketId) {
          io.to(receiverSocketId).emit("messageSeen", msg);
        }
        const senderSocketId = getReceiverSocketId(msg.senderId);
        if (senderSocketId) {
          io.to(senderSocketId).emit("messageSeen", msg);
        }
      });
    }

    res.status(200).json({
      success: true,
      updatedCount: updatedMessages.modifiedCount,
    });
  } catch (error) {
    console.error("Error in markMessagesAsSeen: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const sendMessageWithPDF = async (req, res) => {
  try {
    const { id: receiverId } = req.params;
    const senderId = req.user._id;
    const pdfFile = req.file;

    if (!pdfFile) {
      return res.status(400).json({ message: "No PDF file uploaded" });
    }

    console.log("Uploaded PDF path:", pdfFile.path);
    console.log("Uploaded PDF filename:", pdfFile.filename);

    const newMessage = new Message({
      senderId,
      receiverId,
      document: `uploads/${pdfFile.filename}`,
      seen: false,
    });

    await newMessage.save();

    const receiverSocketId = getReceiverSocketId(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("newMessage", newMessage);
    }

    res.status(201).json(newMessage);
  } catch (error) {
    console.error("Error in sendMessageWithPDF:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// New function for sending messages with images
export const sendMessageWithImage = async (req, res) => {
  try {
    const { id: receiverId } = req.params;
    const senderId = req.user._id;
    const imageFile = req.file;

    if (!imageFile) {
      return res.status(400).json({ message: "No image file uploaded" });
    }

    console.log("Uploaded image path:", imageFile.path);
    console.log("Uploaded image filename:", imageFile.filename);

    const imageUrl = `/images/${imageFile.filename}`; // Matches /images/ served by index.js

    const newMessage = new Message({
      senderId,
      receiverId,
      image: imageUrl,
      seen: false,
    });

    await newMessage.save();

    const receiverSocketId = getReceiverSocketId(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("newMessage", newMessage);
    }

    res.status(201).json(newMessage);
  } catch (error) {
    console.error("Error in sendMessageWithImage:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};