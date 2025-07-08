import { useEffect, useState } from "react";
import { User, Team } from "../types";


const Dashboard = () => {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [teamToDelete, setTeamToDelete] = useState<number | null>(null);
  const params = new URLSearchParams(window.location.search);
  const discord_id = params.get("discord_id") ?? "";
  const username = params.get("username") ?? "";
  const avatar = params.get("avatar") ?? "";

  const [user, setUser] = useState<User | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamName, setTeamName] = useState("");
  const [members, setMembers] = useState<Record<number, User[]>>({});
  const [userTeams, setUserTeams] = useState<number[]>([]);

  useEffect(() => {
    fetch(`http://localhost:3001/api/users/me`, {
      headers: { "x-discord-id": discord_id },
    })
      .then((res) => res.json())
      .then(setUser);

    fetchTeams();
  }, []);

  const fetchTeams = async () => {
    const res = await fetch(`http://localhost:3001/api/teams`);
    const data = await res.json();
    setTeams(data);

    const newUserTeams: number[] = [];
    const newMembers: Record<number, User[]> = {};

    for (const team of data) {
      const r = await fetch(`http://localhost:3001/api/teams/${team.id}/members`);
      const m = await r.json();
      newMembers[team.id] = m;

      if (m.find((mem: User) => mem.discord_id === discord_id)) {
        newUserTeams.push(team.id);
      }
    }

    setMembers(newMembers);
    setUserTeams(newUserTeams);
  };

  const createTeam = async () => {
    if (!teamName.trim()) return alert("Please enter a valid team name.");

    const res = await fetch(`http://localhost:3001/api/teams`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-discord-id": discord_id,
      },
      body: JSON.stringify({ name: teamName }),
    });

    if (res.ok) {
      setTeamName("");
      await fetchTeams();
    }
  };

  const toggleStatus = async (id: number, newStatus: "IDLE" | "LFS") => {
    await fetch(`http://localhost:3001/api/teams/${id}/status`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "x-discord-id": discord_id,
      },
      body: JSON.stringify({ status: newStatus }),
    });
    fetchTeams();
  };

  const joinTeam = async (id: number) => {
    await fetch(`http://localhost:3001/api/teams/${id}/join`, {
      method: "POST",
      headers: { "x-discord-id": discord_id },
    });
    fetchTeams();
  };

  const leaveTeam = async (id: number) => {
    await fetch(`http://localhost:3001/api/teams/${id}/leave`, {
      method: "POST",
      headers: { "x-discord-id": discord_id },
    });
    fetchTeams();
  };

  const deleteTeam = async () => {
    if (!teamToDelete) return;

    await fetch(`http://localhost:3001/api/teams/${teamToDelete}`, {
      method: "DELETE",
      headers: { "x-discord-id": discord_id },
    });

    setTeamToDelete(null);
    setShowDeleteModal(false);
    fetchTeams();
  };

  const logout = () => {
    window.location.href = "/";
  };

  return (
    <div style={{ padding: 30 }}>
      <h2>
        Welcome, {username}
        <button onClick={logout} style={{ marginLeft: 10 }}>
          Logout
        </button>
      </h2>
      <img
        src={`https://cdn.discordapp.com/avatars/${discord_id}/${avatar}.png`}
        width="50"
        style={{ borderRadius: "50%" }}
      />

      <h3>Create Team</h3>
      <input
        value={teamName}
        placeholder="Team name"
        onChange={(e) => setTeamName(e.target.value)}
      />
      <button onClick={createTeam}>Create</button>

      <h3>Teams:</h3>
      <ul>
        {teams.map((team) => (
          <li key={team.id} style={{ marginBottom: 20 }}>
            <strong>{team.name}</strong> – Captain: {team.username} –{" "}
            {team.status === "LFS" ? "🟢 LFS" : "⚪ Idle"}

            {Number(user?.id) === team.captain_id && (
              <>
                <button
                  onClick={() => {
                    setTeamToDelete(team.id);
                    setShowDeleteModal(true);
                  }}
                  style={{ color: "red", marginLeft: 5 }}
                >
                  Remove
                </button>
                <button
                  onClick={() =>
                    toggleStatus(team.id, team.status === "IDLE" ? "LFS" : "IDLE")
                  }
                >
                  {team.status === "IDLE"
                    ? "Set Looking For Scrim"
                    : "Set Idle"}
                </button>
              </>
            )}

            {showDeleteModal && teamToDelete === team.id && (
              <div
                style={{
                  position: "fixed",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: "rgba(0,0,0,0.5)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  zIndex: 1000,
                }}
              >
                <div
                  style={{
                    background: "#6b8ec8",
                    padding: "20px 30px",
                    borderRadius: 8,
                    textAlign: "center",
                    maxWidth: 400,
                    width: "100%",
                  }}
                >
                  <h3>Are you sure you want to delete this team?</h3>
                  <p>This action cannot be undone.</p>
                  <div style={{ marginTop: 20 }}>
                    <button
                      onClick={() => setShowDeleteModal(false)}
                      style={{ marginRight: 10 }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={deleteTeam}
                      style={{ background: "red", color: "white" }}
                    >
                      Confirm Delete
                    </button>
                  </div>
                </div>
              </div>
            )}

            {userTeams.includes(team.id) &&
              Number(user?.id) !== team.captain_id && (
                <button onClick={() => leaveTeam(team.id)}>Leave Team</button>
              )}

            {!userTeams.includes(team.id) && (
              <button onClick={() => joinTeam(team.id)}>Join Team</button>
            )}

            <div style={{ marginTop: 5, marginLeft: 10 }}>
              <strong>Members:</strong>
              <ul>
                {members[team.id]?.map((m) => (
                  <li key={m.id}>
                    <img
                      src={m.avatar_url}
                      width={20}
                      style={{
                        verticalAlign: "middle",
                        borderRadius: "50%",
                        marginRight: 5,
                      }}
                    />
                    {m.username}
                  </li>
                ))}
              </ul>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Dashboard;
