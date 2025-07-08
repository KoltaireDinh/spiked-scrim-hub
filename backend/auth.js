const axios = require("axios");
const db = require("./db");
const client_id = process.env.DISCORD_CLIENT_ID;
const client_secret = process.env.DISCORD_CLIENT_SECRET;
const redirect_uri = "http://localhost:3001/api/auth/discord/callback";

const discordRedirect = (_, res) => {
  const params = new URLSearchParams({
    client_id,
    redirect_uri,
    response_type: "code",
    scope: "identify",
  }).toString();
  res.redirect(`https://discord.com/oauth2/authorize?${params}`);
};

const discordCallback = async (req, res) => {
  const { code } = req.query;
  const tokenRes = await axios.post(
    "https://discord.com/api/oauth2/token",
    new URLSearchParams({
      client_id,
      client_secret,
      grant_type: "authorization_code",
      code,
      redirect_uri,
      scope: "identify",
    }),
    {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    }
  );

  const userRes = await axios.get("https://discord.com/api/users/@me", {
    headers: { Authorization: `Bearer ${tokenRes.data.access_token}` },
  });

  const { id: discord_id, username, avatar } = userRes.data;
  const avatar_url = `https://cdn.discordapp.com/avatars/${discord_id}/${avatar}.png`;

  const existing = db
    .prepare("SELECT * FROM users WHERE discord_id = ?")
    .get(discord_id);
  if (!existing) {
    db.prepare(
      "INSERT INTO users (discord_id, username, avatar_url) VALUES (?, ?, ?)"
    ).run(discord_id, username, avatar_url);
  }

  res.redirect(`http://localhost:5173/dashboard?discord_id=${discord_id}`);
};

const authenticate = (req, res, next) => {
  const discord_id = req.headers["x-discord-id"];
  const user = db
    .prepare("SELECT * FROM users WHERE discord_id = ?")
    .get(discord_id);
  if (!user) return res.status(401).json({ error: "Unauthorized" });
  req.user = user;
  next();
};

module.exports = { discordRedirect, discordCallback, authenticate };
