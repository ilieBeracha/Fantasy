const Anthropic = require("@anthropic-ai/sdk");
const fantasyApi = require("./yahoo-fantasy");

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const TOOLS = [
  {
    name: "get_leagues",
    description: "Get the user's Yahoo Fantasy leagues. Call this first if you don't have a league key.",
    input_schema: {
      type: "object",
      properties: {
        game_key: {
          type: "string",
          description: "Sport code: 'nfl', 'mlb', 'nba', or 'nhl'. Defaults to 'nfl'.",
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
        position: { type: "string", description: "Position: QB, RB, WR, TE, K, DEF" },
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
];

const SYSTEM_PROMPT = `You are a fun, knowledgeable Fantasy Sports AI assistant connected to the user's Yahoo Fantasy league with real-time data access.

BEHAVIOR:
- Be conversational, opinionated, and enthusiastic
- Give actionable advice: start/sit, waiver pickups, trade analysis
- Always fetch real data before making recommendations
- If no league key yet, call get_leagues first
- Bold player names and key stats
- Keep responses concise but insightful`;

async function executeTool(toolName, input, accessToken) {
  try {
    switch (toolName) {
      case "get_leagues":
        return await fantasyApi.getLeagues(accessToken, input.game_key || "nfl");
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
