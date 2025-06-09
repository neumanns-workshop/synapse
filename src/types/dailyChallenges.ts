export interface DailyChallenge {
  id: string;
  date: string;
  startWord: string;
  targetWord: string;
  optimalPathLength: number;
  aiSolution?: {
    path: string[];
    stepsTaken: number;
    model: string;
  };
}

export interface DailyChallengesData {
  version: string;
  lastUpdated: string;
  description: string;
  challenges: DailyChallenge[];
}

export interface DailyChallengeProgress {
  challengeId: string;
  completed: boolean;
  status: "won" | "given_up";
  completedAt?: string;
  playerMoves?: number;
  playerPath?: string[];
  score?: number;
  // Add more scoring metrics as needed
}

export interface DailyChallengeState {
  todaysChallenge: DailyChallenge | null;
  hasPlayedToday: boolean;
  remainingFreeGames: number;
  isPremium: boolean;
  progress: Record<string, DailyChallengeProgress>;
}
