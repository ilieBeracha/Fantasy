const axios = require("axios");
const BASE_URL = "https://fantasysports.yahooapis.com/fantasy/v2";

async function yahooGet(accessToken, path) {
  const separator = path.includes("?") ? "&" : "?";
  const url = `${BASE_URL}${path}${separator}format=json`;
  const response = await axios.get(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return response.data;
}

async function getLeagues(accessToken, gameKey = "nba") {
  return yahooGet(accessToken, `/users;use_login=1/games;game_keys=${gameKey}/leagues`);
}

async function getMyTeams(accessToken, gameKey = "nba") {
  return yahooGet(accessToken, `/users;use_login=1/games;game_keys=${gameKey}/teams`);
}

async function getStandings(accessToken, leagueKey) {
  return yahooGet(accessToken, `/league/${leagueKey}/standings`);
}

async function getScoreboard(accessToken, leagueKey, week) {
  const path = week
    ? `/league/${leagueKey}/scoreboard;week=${week}`
    : `/league/${leagueKey}/scoreboard`;
  return yahooGet(accessToken, path);
}

async function getRoster(accessToken, teamKey) {
  return yahooGet(accessToken, `/team/${teamKey}/roster/players`);
}

async function getLeagueSettings(accessToken, leagueKey) {
  return yahooGet(accessToken, `/league/${leagueKey}/settings`);
}

async function searchPlayers(accessToken, leagueKey, playerName) {
  return yahooGet(
    accessToken,
    `/league/${leagueKey}/players;search=${encodeURIComponent(playerName)}`
  );
}

async function getFreeAgents(accessToken, leagueKey, position) {
  let path = `/league/${leagueKey}/players;status=FA;sort=AR`;
  if (position) path += `;position=${position}`;
  return yahooGet(accessToken, path);
}

async function getTransactions(accessToken, leagueKey) {
  return yahooGet(accessToken, `/league/${leagueKey}/transactions`);
}

async function getTeamMatchups(accessToken, teamKey) {
  return yahooGet(accessToken, `/team/${teamKey}/matchups`);
}

async function getLeagueTeams(accessToken, leagueKey) {
  return yahooGet(accessToken, `/league/${leagueKey}/teams`);
}

async function getLeagueTeamsRosters(accessToken, leagueKey) {
  return yahooGet(
    accessToken,
    `/league/${leagueKey}/teams;out=roster`
  );
}

async function getLeagueTeamsStats(accessToken, leagueKey) {
  return yahooGet(
    accessToken,
    `/league/${leagueKey}/teams;out=stats`
  );
}

async function getPlayerStats(accessToken, leagueKey, playerKey, week) {
  const weekParam = week
    ? `;type=week;week=${week}`
    : "";
  return yahooGet(
    accessToken,
    `/league/${leagueKey}/players;player_keys=${playerKey}/stats${weekParam}`
  );
}

async function getTeamRosterStats(accessToken, teamKey, week) {
  const weekParam = week ? `;week=${week}` : "";
  return yahooGet(
    accessToken,
    `/team/${teamKey}/roster${weekParam}/players/stats`
  );
}

module.exports = {
  getLeagues,
  getMyTeams,
  getStandings,
  getScoreboard,
  getRoster,
  getLeagueSettings,
  searchPlayers,
  getFreeAgents,
  getTransactions,
  getTeamMatchups,
  getLeagueTeams,
  getLeagueTeamsRosters,
  getLeagueTeamsStats,
  getPlayerStats,
  getTeamRosterStats,
};
