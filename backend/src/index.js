import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";
import path from "path";

import authRoutes from "./routes/auth.route.js";
import messageRoutes from "./routes/message.route.js";
import { connectDB } from "./lib/db.js";
import { app, server } from "./lib/socket.js";

dotenv.config();

const PORT = process.env.PORT;
const _dirname = path.resolve();

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use(cookieParser());
app.use(cors({
  origin: "http://localhost:5173",
  credentials: true,
}));

// Serve static files for documents
app.use("/uploads", express.static(path.join(_dirname, "uploads")));

// Serve static files for images (new static path)
app.use("/images", express.static(path.join(_dirname, "images")));

app.use((req, res, next) => {
  req.io = server; // Attach the server instance (which has Socket.IO)
  next();
});

// Custom route for downloading files (existing)
app.get("/debug-download/:filename", (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(_dirname, "uploads", filename);
  console.log("Debug download - Requested filename:", filename);
  console.log("Debug download - Constructed file path:", filePath);

  const fs = require("fs");
  if (!fs.existsSync(filePath)) {
    console.error("Debug download - File does not exist:", filePath);
    return res.status(404).send("File not found");
  }

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  fs.createReadStream(filePath).pipe(res);
});

// New custom route for downloading images (similar to documents)
app.get("/debug-image/:imagename", (req, res) => {
  const imagename = req.params.imagename;
  const imagePath = path.join(_dirname, "images", imagename);
  console.log("Debug image - Requested imagename:", imagename);
  console.log("Debug image - Constructed image path:", imagePath);

  const fs = require("fs");
  if (!fs.existsSync(imagePath)) {
    console.error("Debug image - Image does not exist:", imagePath);
    return res.status(404).send("Image not found");
  }

  // Set appropriate content type based on file extension
  const ext = path.extname(imagename).toLowerCase();
  const contentTypes = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
    ".webp": "image/webp",
  };
  const contentType = contentTypes[ext] || "application/octet-stream";

  res.setHeader("Content-Type", contentType);
  res.setHeader("Content-Disposition", `attachment; filename="${imagename}"`);
  fs.createReadStream(imagePath).pipe(res);
});

app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);

if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(_dirname, "../frontend/dist")));
  app.get("*", (req, res) => {
    res.sendFile(path.resolve(__dirname, "../frontend/dist", "index.html"));
  });
}

server.listen(PORT, () => {
  console.log("server is running on PORT:" + PORT);
  connectDB();
});