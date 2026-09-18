require("dotenv").config();

const express = require("express");
const cors = require("cors");
const multer = require("multer");
const axios = require("axios");
const FormData = require("form-data");
const mongoose = require("mongoose");
const requireAuth = require("./src/middlewares/authMiddleware");

const authRoutes = require("./src/routes/authRoutes");

const app = express();
app.use(cors());
app.use(express.json());

// ---------- Auth ----------
app.use("/api/auth", authRoutes);

// ---------- Detection (unchanged) ----------
const upload = multer(); // stores file in memory, not on disk

app.post("/api/detect", upload.single("image"), async (req, res) => {
  try {
    const formData = new FormData();
    formData.append("file", req.file.buffer, req.file.originalname);

    const response = await axios.post(
  `${process.env.MODEL_SERVICE_URL}/predict`,
  formData,
  { headers: formData.getHeaders() }
);

    res.json(response.data);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Detection failed" });
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