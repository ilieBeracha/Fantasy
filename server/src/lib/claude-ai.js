const Anthropic = require("@anthropic-ai/sdk");
const fantasyApi = require("./yahoo-fantasy");

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const TOOLS = [
  {
    name: "get_my_team",
    description:
      "Get the authenticated user's own fantasy teams. ALWAYS call this first when the user says 'my roster', 'my team', 'my players', or anything referring to their own team. Returns the user's team key(s) directly — do NOT use get_league_teams to guess the user's team.",
    input_schema: {
      type: "object",
      properties: {
        game_key: {
          type: "string",
          description: "Sport code: 'nba', 'nfl', 'mlb', or 'nhl'. Defaults to 'nba'.",
        },
      },
    },
  },
  {
    name: "get_leagues",
    description: "Get the user's Yahoo Fantasy leagues. Call this first if you don't have a league key.",
    input_schema: {
      type: "object",
      properties: {
        game_key: {
          type: "string",
          description: "Sport code: 'nba', 'nfl', 'mlb', or 'nhl'. Defaults to 'nba'.",
        },
      },
    },
  },
  {
    name: "get_standings",
    description: "Get current league standings with rankings, records, and points.",
    input_schema: {
      type: "object",
      properties: {
        league_key: { type: "string", description: "Yahoo league key" },
      },
      required: ["league_key"],
    },
  },
  {
    name: "get_scoreboard",
    description: "Get matchups and scores for a specific week.",
    input_schema: {
      type: "object",
      properties: {
        league_key: { type: "string", description: "Yahoo league key" },
        week: { type: "number", description: "Week number. Omit for current week." },
      },
      required: ["league_key"],
    },
  },
  {
    name: "get_roster",
    description: "Get full roster for a team including players, positions, and injury status.",
    input_schema: {
      type: "object",
      properties: {
        team_key: { type: "string", description: "Yahoo team key" },
      },
      required: ["team_key"],
    },
  },
  {
    name: "get_league_settings",
    description: "Get league settings: scoring rules, roster positions, playoff structure.",
    input_schema: {
      type: "object",
      properties: {
        league_key: { type: "string", description: "Yahoo league key" },
      },
      required: ["league_key"],
    },
  },
  {
    name: "search_players",
    description: "Search for a player by name. Returns stats, ownership, availability.",
    input_schema: {
      type: "object",
      properties: {
        league_key: { type: "string", description: "Yahoo league key" },
        player_name: { type: "string", description: "Player name to search" },
      },
      required: ["league_key", "player_name"],
    },
  },
  {
    name: "get_free_agents",
    description: "Get top available free agents, optionally filtered by position.",
    input_schema: {
      type: "object",
      properties: {
        league_key: { type: "string", description: "Yahoo league key" },
        position: { type: "string", description: "Position: PG, SG, SF, PF, C, G, F, Util" },
      },
      required: ["league_key"],
    },
  },
  {
    name: "get_transactions",
    description: "Get recent league transactions: adds, drops, trades.",
    input_schema: {
      type: "object",
      properties: {
        league_key: { type: "string", description: "Yahoo league key" },
      },
      required: ["league_key"],
    },
  },
  {
    name: "get_team_matchups",
    description: "Get all matchups (past and upcoming) for a specific team.",
    input_schema: {
      type: "object",
      properties: {
        team_key: { type: "string", description: "Yahoo team key" },
      },
      required: ["team_key"],
    },
  },
  {
    name: "get_league_teams",
    description:
      "Get all teams in a league with team keys, names, and managers. Use this to find any team's key in the league, then use that key to fetch their roster or stats.",
    input_schema: {
      type: "object",
      properties: {
        league_key: { type: "string", description: "Yahoo league key" },
      },
      required: ["league_key"],
    },
  },
  {
    name: "get_league_teams_rosters",
    description:
      "Get all teams in the league with their full rosters (all players) in a single call. Use this to compare rosters across the entire league or find which team owns a specific player.",
    input_schema: {
      type: "object",
      properties: {
        league_key: { type: "string", description: "Yahoo league key" },
      },
      required: ["league_key"],
    },
  },
  {
    name: "get_league_teams_stats",
    description:
      "Get all teams in the league with their season stats. Great for comparing team performance across the league.",
    input_schema: {
      type: "object",
      properties: {
        league_key: { type: "string", description: "Yahoo league key" },
      },
      required: ["league_key"],
    },
  },
  {
    name: "get_player_stats",
    description:
      "Get detailed stats for a specific player. Can fetch season stats or stats for a specific week.",
    input_schema: {
      type: "object",
      properties: {
        league_key: { type: "string", description: "Yahoo league key" },
        player_key: { type: "string", description: "Yahoo player key" },
        week: {
          type: "number",
          description: "Week number for weekly stats. Omit for season stats.",
        },
      },
      required: ["league_key", "player_key"],
    },
  },
  {
    name: "get_team_roster_stats",
    description:
      "Get a team's roster with player stats. Works for ANY team in the league, not just the user's team. Use get_league_teams first to find team keys.",
    input_schema: {
      type: "object",
      properties: {
        team_key: {
          type: "string",
          description: "Yahoo team key (works for any team in the league)",
        },
        week: {
          type: "number",
          description: "Week number. Omit for current roster stats.",
        },
      },
      required: ["team_key"],
    },
  },
];

const SYSTEM_PROMPT = `You are a fun, knowledgeable NBA Fantasy Basketball AI assistant connected to the user's Yahoo Fantasy Basketball league with real-time data access.

BEHAVIOR:
- Be conversational, opinionated, and enthusiastic about NBA basketball
- Give actionable advice: start/sit, waiver pickups, trade analysis, streaming picks
- Focus on NBA stats: points, rebounds, assists, steals, blocks, turnovers, FG%, FT%, 3PM
- Always fetch real data before making recommendations
- When the user refers to "my roster", "my team", or "my players", ALWAYS call get_my_team first to get their actual team key — never guess from get_league_teams
- If no league key yet, call get_leagues with game_key "nba" first
- Bold player names and key stats
- Keep responses concise but insightful
- Reference NBA games, schedules, and matchups when relevant

ACCESSING OTHER TEAMS' DATA:
- You can view ANY team's roster and stats in the league, not just the user's team
- To find all teams and their keys, use get_league_teams with the league key
- To get all rosters across the league in one call, use get_league_teams_rosters
- To get any team's roster with stats, use get_team_roster_stats with their team key
- To compare all teams' stats, use get_league_teams_stats
- When the user asks about an opponent or another manager's team, first get the league teams to find the right team key, then fetch that team's data`;

async function executeTool(toolName, input, accessToken) {
  try {
    switch (toolName) {
      case "get_my_team":
        return await fantasyApi.getMyTeams(accessToken, input.game_key || "nba");
      case "get_leagues":
        return await fantasyApi.getLeagues(accessToken, input.game_key || "nba");
      case "get_standings":
        return await fantasyApi.getStandings(accessToken, input.league_key);
      case "get_scoreboard":
        return await fantasyApi.getScoreboard(accessToken, input.league_key, input.week);
      case "get_roster":
        return await fantasyApi.getRoster(accessToken, input.team_key);
      case "get_league_settings":
        return await fantasyApi.getLeagueSettings(accessToken, input.league_key);
      case "search_players":
        return await fantasyApi.searchPlayers(accessToken, input.league_key, input.player_name);
      case "get_free_agents":
        return await fantasyApi.getFreeAgents(accessToken, input.league_key, input.position);
      case "get_transactions":
        return await fantasyApi.getTransactions(accessToken, input.league_key);
      case "get_team_matchups":
        return await fantasyApi.getTeamMatchups(accessToken, input.team_key);
      case "get_league_teams":
        return await fantasyApi.getLeagueTeams(accessToken, input.league_key);
      case "get_league_teams_rosters":
        return await fantasyApi.getLeagueTeamsRosters(accessToken, input.league_key);
      case "get_league_teams_stats":
        return await fantasyApi.getLeagueTeamsStats(accessToken, input.league_key);
      case "get_player_stats":
        return await fantasyApi.getPlayerStats(
          accessToken,
          input.league_key,
          input.player_key,
          input.week
        );
      case "get_team_roster_stats":
        return await fantasyApi.getTeamRosterStats(
          accessToken,
          input.team_key,
          input.week
        );
      default:
        return { error: `Unknown tool: ${toolName}` };
    }
  } catch (error) {
    return { error: error.message };
  }
}

async function chat(messages, accessToken, context = {}) {
  let systemPrompt = SYSTEM_PROMPT;
  if (context.leagueKey) systemPrompt += `\n\nUser's league key: ${context.leagueKey}`;
  if (context.teamKey) systemPrompt += `\nUser's team key: ${context.teamKey}`;

  let response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1500,
    system: systemPrompt,
    tools: TOOLS,
    messages,
  });

  let iterations = 0;
  while (response.stop_reason === "tool_use" && iterations < 10) {
    iterations++;
    const toolBlocks = response.content.filter((b) => b.type === "tool_use");
    const toolResults = [];

    for (const tool of toolBlocks) {
      console.log(`  🔧 ${tool.name}`, JSON.stringify(tool.input));
      const result = await executeTool(tool.name, tool.input, accessToken);
      toolResults.push({
        type: "tool_result",
        tool_use_id: tool.id,
        content: JSON.stringify(result),
      });
    }

    response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1500,
      system: systemPrompt,
      tools: TOOLS,
      messages: [
        ...messages,
        { role: "assistant", content: response.content },
        { role: "user", content: toolResults },
      ],
    });
  }

  return response.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("\n");
}

module.exports = { chat };
