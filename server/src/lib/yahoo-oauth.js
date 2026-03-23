const axios = require("axios");

const AUTH_URL = "https://api.login.yahoo.com/oauth2/request_auth";
const TOKEN_URL = "https://api.login.yahoo.com/oauth2/get_token";

function getAuthorizationUrl() {
  const params = new URLSearchParams({
    client_id: process.env.YAHOO_CLIENT_ID,
    redirect_uri:
      process.env.YAHOO_REDIRECT_URI ||
      "http://localhost:3000/auth/yahoo/callback",
    response_type: "code",
    language: "en-us",
  });
  return `${AUTH_URL}?${params.toString()}`;
}

async function exchangeCodeForTokens(code) {
  const basicAuth = Buffer.from(
    `${process.env.YAHOO_CLIENT_ID}:${process.env.YAHOO_CLIENT_SECRET}`
  ).toString("base64");

  const response = await axios.post(
    TOKEN_URL,
    new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri:
        process.env.YAHOO_REDIRECT_URI ||
        "http://localhost:3000/auth/yahoo/callback",
    }).toString(),
    {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${basicAuth}`,
      },
    }
  );

  return {
    accessToken: response.data.access_token,
    refreshToken: response.data.refresh_token,
    expiresIn: response.data.expires_in,
    yahooGuid: response.data.xoauth_yahoo_guid,
  };
}

async function refreshAccessToken(refreshToken) {
  const basicAuth = Buffer.from(
    `${process.env.YAHOO_CLIENT_ID}:${process.env.YAHOO_CLIENT_SECRET}`
  ).toString("base64");

  const response = await axios.post(
    TOKEN_URL,
    new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }).toString(),
    {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${basicAuth}`,
      },
    }
  );

  return {
    accessToken: response.data.access_token,
    refreshToken: response.data.refresh_token || refreshToken,
    expiresIn: response.data.expires_in,
  };
}

async function getValidToken(session) {
  if (!session.accessToken) throw new Error("Not authenticated");

  if (Date.now() >= (session.tokenExpiry || 0) - 60000) {
    const tokens = await refreshAccessToken(session.refreshToken);
    session.accessToken = tokens.accessToken;
    session.refreshToken = tokens.refreshToken;
    session.tokenExpiry = Date.now() + tokens.expiresIn * 1000;
  }

  return session.accessToken;
}

module.exports = {
  getAuthorizationUrl,
  exchangeCodeForTokens,
  refreshAccessToken,
  getValidToken,
};
