const express = require("express");
const router = express.Router();
const { getValidToken } = require("../lib/yahoo-oauth");
const { chat } = require("../lib/claude-ai");

router.post("/", async (req, res) => {
  if (!req.session.accessToken) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const { messages, leagueKey, teamKey } = req.body;
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: "messages array required" });
  }

  try {
    const accessToken = await getValidToken(req.session);
    const response = await chat(messages, accessToken, { leagueKey, teamKey });
    res.json({ response });
  } catch (error) {
    console.error("Chat error:", error.message);
    if (error.message === "Not authenticated") {
      return res.status(401).json({ error: "Session expired" });
    }
    res.status(500).json({ error: "Failed to process message" });
  }
});

module.exports = router;
