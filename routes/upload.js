const express = require("express");
const router = express.Router();
const cloudinary = require("cloudinary").v2;


router.post("/", async (req, res) => {
  try {
    if (!req.files || !req.files.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const file = req.files.file;

    const result = await cloudinary.uploader.upload(
      file.tempFilePath,
      {
        folder: "zentara",
        resource_type: "auto", // supports image/video
      }
    );

    res.json({
      url: result.secure_url,
    });

  } catch (err) {
    console.log("Upload Error:", err);
    res.status(500).json({ error: "Upload failed" });
  }
});

module.exports = router;