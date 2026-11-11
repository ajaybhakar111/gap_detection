require("dotenv").config();

const express = require("express");
const cors = require("cors");
const multer = require("multer");
const axios = require("axios");
const FormData = require("form-data");
const mongoose = require("mongoose");

const authRoutes = require("./src/routes/authRoutes");

// Set MODEL_SERVICE_URL on Render, e.g. https://gap-detection-model.onrender.com
const MODEL_SERVICE_URL = (
  process.env.MODEL_SERVICE_URL || "https://gap-detection-model.onrender.com"
).replace(/\/$/, "");

const app = express();
app.use(cors({ origin: process.env.CLIENT_ORIGIN || true }));
app.use(express.json());

// ---------- Auth ----------
app.use("/api/auth", authRoutes);

// ---------- Detection ----------
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 },
});

const ALLOWED_TYPES = ["image/jpeg", "image/png", "application/pdf"];

app.post("/api/detect", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    if (!ALLOWED_TYPES.includes(req.file.mimetype)) {
      return res.status(400).json({ error: "Only JPG, PNG or PDF files are allowed" });
    }

    // spacing values arrive in FEET
    const rowSpacingFt = parseFloat(req.body.rowSpacingFt);
    const plantSpacingFt = parseFloat(req.body.plantSpacingFt);
    if (!(rowSpacingFt > 0) || !(plantSpacingFt > 0)) {
      return res.status(400).json({ error: "Row spacing and plant spacing (ft) are required" });
    }

    const formData = new FormData();
    formData.append("file", req.file.buffer, {
      filename: req.file.originalname,
      contentType: req.file.mimetype,
    });
    formData.append("row_spacing_ft", String(rowSpacingFt));
    formData.append("plant_spacing_ft", String(plantSpacingFt));
    formData.append("confidence", req.body.confidence ?? "0.25");

    const response = await axios.post(`${MODEL_SERVICE_URL}/predict`, formData, {
      headers: formData.getHeaders(),
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
      timeout: 180000,
    });

    res.json(response.data);
  } catch (err) {
    console.error(err.response?.data || err.message);
    const status = err.response?.status || 500;
    const detail = err.response?.data?.detail;
    res.status(status).json({
      error: typeof detail === "string" ? detail : "Detection failed",
    });
  }
});

// ---------- Start ----------
const PORT = process.env.PORT || 3000;

mongoose
  .connect(process.env.MONGO_URL)
  .then(() => {
    console.log("MongoDB connected");
    app.listen(PORT, () => console.log(`Express backend running on port ${PORT}`));
  })
  .catch((err) => {
    console.error("MongoDB connection failed:", err.message);
    process.exit(1);
  });