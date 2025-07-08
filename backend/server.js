const axios = require("axios");
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const Database = require("better-sqlite3");

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const db = new Database("spiked.db");

// ====== TẠO BẢNG ======
db.prepare(
  `
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    discord_id TEXT UNIQUE,
    username TEXT,
    avatar_url TEXT
  )
`
).run();

db.prepare(
  `
  CREATE TABLE IF NOT EXISTS teams (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    captain_id INTEGER,
    status TEXT DEFAULT 'IDLE'
  )
`
).run();

db.prepare(
  `
  CREATE TABLE IF NOT EXISTS team_members (
    user_id INTEGER,
    team_id INTEGER,
    PRIMARY KEY (user_id, team_id)
  )
`
).run();

// ====== DISCORD OAUTH ======
const DISCORD_OAUTH_URL = "https://discord.com/api/oauth2/authorize";
const DISCORD_TOKEN_URL = "https://discord.com/api/oauth2/token";
const DISCORD_USER_URL = "https://discord.com/api/users/@me";

// ✅ DÙNG DOMAIN TỪ NGROK/CF THAY `localhost`
const FRONTEND_DOMAIN = process.env.FRONTEND_DOMAIN || "http://localhost:5173";
const BACKEND_DOMAIN = process.env.BACKEND_DOMAIN || "http://localhost:3001";

app.get("/auth/discord", (req, res) => {
  const params = new URLSearchParams({
    client_id: process.env.DISCORD_CLIENT_ID,
    redirect_uri: `${BACKEND_DOMAIN}/auth/callback`,
    response_type: "code",
    scope: "identify email",
  });

  res.redirect(`${DISCORD_OAUTH_URL}?${params}`);
});

app.get("/auth/callback", async (req, res) => {
  const { code } = req.query;
  if (!code) return res.redirect(`${FRONTEND_DOMAIN}/login?error=no_code`);

  try {
    const tokenResponse = await axios.post(
      DISCORD_TOKEN_URL,
      new URLSearchParams({
        client_id: process.env.DISCORD_CLIENT_ID,
        client_secret: process.env.DISCORD_CLIENT_SECRET,
        code,
        grant_type: "authorization_code",
        redirect_uri: `${BACKEND_DOMAIN}/auth/callback`,
      }),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );

    const { access_token } = tokenResponse.data;

    const userResponse = await axios.get(DISCORD_USER_URL, {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    const user = userResponse.data;
    const avatar_url = `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`;

    const existing = db
      .prepare("SELECT * FROM users WHERE discord_id = ?")
      .get(user.id);
    if (!existing) {
      db.prepare(
        "INSERT INTO users (discord_id, username, avatar_url) VALUES (?, ?, ?)"
      ).run(user.id, user.username, avatar_url);
    }

    res.redirect(
      `${FRONTEND_DOMAIN}/dashboard?discord_id=${user.id}&username=${user.username}&avatar=${user.avatar}`
    );
  } catch (error) {
    console.error("Discord auth error:", error);
    res.redirect(`${FRONTEND_DOMAIN}/login?error=auth_failed`);
  }
});

// ====== API NGƯỜI DÙNG ======
app.get("/api/users/me", (req, res) => {
  const discordId = req.headers["x-discord-id"];
  const user = db
    .prepare("SELECT * FROM users WHERE discord_id = ?")
    .get(discordId);
  if (!user) return res.status(401).json({ error: "Unauthorized" });
  res.json(user);
});

// ====== API ĐỘI ======
app.post("/api/teams", (req, res) => {
  const discordId = req.headers["x-discord-id"];
  const user = db
    .prepare("SELECT * FROM users WHERE discord_id = ?")
    .get(discordId);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const { name } = req.body;
  const result = db
    .prepare(
      "INSERT INTO teams (name, captain_id, status) VALUES (?, ?, 'IDLE')"
    )
    .run(name, user.id);

  db.prepare("INSERT INTO team_members (user_id, team_id) VALUES (?, ?)").run(
    user.id,
    result.lastInsertRowid
  );
  const createdTeam = db
    .prepare(
      `SELECT teams.*, users.username 
     FROM teams 
     JOIN users ON teams.captain_id = users.id 
     WHERE teams.id = ?`
    )
    .get(result.lastInsertRowid);

  res.json(createdTeam);
});

app.get("/api/teams", (req, res) => {
  const teams = db
    .prepare(
      `
    SELECT teams.id, teams.name, teams.status, teams.captain_id, users.username
    FROM teams
    JOIN users ON teams.captain_id = users.id
  `
    )
    .all();
  res.json(teams);
});

app.put("/api/teams/:id/status", (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  db.prepare("UPDATE teams SET status = ? WHERE id = ?").run(status, id);
  res.json({ message: "Status updated" });
});

// ====== API THÀNH VIÊN ======
app.post("/api/teams/:teamId/join", (req, res) => {
  const discordId = req.headers["x-discord-id"];
  const user = db
    .prepare("SELECT * FROM users WHERE discord_id = ?")
    .get(discordId);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const { teamId } = req.params;
  db.prepare(
    "INSERT OR IGNORE INTO team_members (user_id, team_id) VALUES (?, ?)"
  ).run(user.id, teamId);
  res.json({ message: "Joined team" });
});

app.post("/api/teams/:teamId/leave", (req, res) => {
  const discordId = req.headers["x-discord-id"];
  const user = db
    .prepare("SELECT * FROM users WHERE discord_id = ?")
    .get(discordId);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const { teamId } = req.params;

  const isCaptain = db
    .prepare("SELECT * FROM teams WHERE id = ? AND captain_id = ?")
    .get(teamId, user.id);
  if (isCaptain)
    return res.status(400).json({ error: "Captain cannot leave the team" });

  db.prepare("DELETE FROM team_members WHERE user_id = ? AND team_id = ?").run(
    user.id,
    teamId
  );
  res.json({ message: "Left team" });
});

app.delete("/api/teams/:teamId", (req, res) => {
  const discordId = req.headers["x-discord-id"];
  const user = db
    .prepare("SELECT * FROM users WHERE discord_id = ?")
    .get(discordId);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const { teamId } = req.params;
  const team = db.prepare("SELECT * FROM teams WHERE id = ?").get(teamId);
  if (!team) return res.status(404).json({ error: "Team not found" });
  if (team.captain_id !== user.id)
    return res.status(403).json({ error: "Only captain can delete team" });

  db.prepare("DELETE FROM team_members WHERE team_id = ?").run(teamId);
  db.prepare("DELETE FROM teams WHERE id = ?").run(teamId);
  res.json({ message: "Team deleted" });
});

app.get("/api/teams/:teamId/members", (req, res) => {
  const { teamId } = req.params;
  const members = db
    .prepare(
      `
    SELECT users.id, users.username, users.avatar_url
    FROM team_members
    JOIN users ON team_members.user_id = users.id
    WHERE team_members.team_id = ?
  `
    )
    .all(teamId);

  res.json(members);
});

// ====== START SERVER ======
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`✅ Backend running at ${BACKEND_DOMAIN}`);
});
