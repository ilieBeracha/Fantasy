const express = require("express");
const router = express.Router();
const { getValidToken } = require("../lib/yahoo-oauth");
const fantasyApi = require("../lib/yahoo-fantasy");

router.use(async (req, res, next) => {
  if (!req.session.accessToken) return res.status(401).json({ error: "Not authenticated" });
  try {
    req.yahooToken = await getValidToken(req.session);
    next();
  } catch {
    res.status(401).json({ error: "Session expired" });
  }
});

router.get("/leagues/:gameKey?", async (req, res) => {
  try {
    const data = await fantasyApi.getLeagues(req.yahooToken, req.params.gameKey || "nba");
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/standings/:leagueKey", async (req, res) => {
  try {
    const data = await fantasyApi.getStandings(req.yahooToken, req.params.leagueKey);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/scoreboard/:leagueKey", async (req, res) => {
  try {
    const data = await fantasyApi.getScoreboard(req.yahooToken, req.params.leagueKey, req.query.week);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/roster/:teamKey", async (req, res) => {
  try {
    const data = await fantasyApi.getRoster(req.yahooToken, req.params.teamKey);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
