const express = require("express");
const router = express.Router();

const { processAudio } = require("../services/audioProcessorService");

router.post("/process-audio", async (req, res) => {
  try {
    const url = req.body.url;
    const result = await processAudio(url);
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error procesando audio" });
  }
});

module.exports = router;
