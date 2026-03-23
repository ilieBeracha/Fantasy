const express = require("express");
const router = express.Router();
const oauth = require("../lib/yahoo-oauth");

router.get("/yahoo", (req, res) => {
  res.redirect(oauth.getAuthorizationUrl());
});

router.get("/yahoo/callback", async (req, res) => {
  const { code } = req.query;
  const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";

  if (!code) return res.redirect(`${clientUrl}?auth=error`);

  try {
    const tokens = await oauth.exchangeCodeForTokens(code);
    req.session.accessToken = tokens.accessToken;
    req.session.refreshToken = tokens.refreshToken;
    req.session.tokenExpiry = Date.now() + tokens.expiresIn * 1000;
    req.session.yahooGuid = tokens.yahooGuid;
    console.log("✅ Authenticated. GUID:", tokens.yahooGuid);
    res.redirect(`${clientUrl}?auth=success`);
  } catch (error) {
    console.error("❌ OAuth error:", error.response?.data || error.message);
    res.redirect(`${clientUrl}?auth=error`);
  }
});

router.get("/status", (req, res) => {
  res.json({
    authenticated: !!req.session.accessToken,
    yahooGuid: req.session.yahooGuid || null,
  });
});

router.post("/logout", (req, res) => {
  req.session.destroy(() => res.json({ success: true }));
});

module.exports = router;
