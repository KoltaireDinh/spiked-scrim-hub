export interface User {
  id: string; // từ DB là TEXT (uuid hoặc string) nên dùng string
  discord_id: string;
  username: string;
  avatar_url: string | null;
}

export interface Team {
  id: number;
  name: string;
  captain_id: number;
  status: 'IDLE' | 'LFS' | 'IN_MATCH';
  username?: string; // username của đội trưởng, được backend JOIN thêm
}
