export type UserRole = 'host' | 'contestant' | 'spectator';
export type BattleStatus = 'waiting' | 'active' | 'completed' | 'cancelled';
export type RoundStatus = 'waiting' | 'prompt_submission' | 'generating' | 'voting' | 'completed';
export type GenerationStatus = 'pending' | 'generating' | 'completed' | 'failed';
export type MessageType = 'chat' | 'system' | 'announcement';

export interface BattleSettings {
  numRounds: number;
  promptTimeLimit: number;
  votingTimeLimit: number;
  maxContestants: number;
  spectatorVotingEnabled: boolean;
  manualWinnerSelection: boolean;
  useCustomTopics: boolean;
  customTopics?: string[];
}

export interface BattleMetadata {
  name: string;
  description: string;
  createdAt: number;
  hostId: string;
  battleCode: string;
  status: BattleStatus;
  settings: BattleSettings;
}

export interface Participant {
  displayName: string;
  role: UserRole;
  joinedAt: number;
  status: 'online' | 'offline' | 'typing';
  lastActive: number;
  score: number;
}

export interface Submission {
  prompt: string;
  submittedAt: number;
  imageUrl?: string;
  generationStatus: GenerationStatus;
  error?: string;
}

export interface Vote {
  votedFor: string;
  votedAt: number;
}

export interface RoundResults {
  winner: string;
  voteCountByUser: Record<string, number>;
  announcedAt: number;
}

export interface Round {
  roundNumber: number;
  topic: string;
  startedAt: number;
  endedAt?: number;
  status: RoundStatus;
  promptEndTime: number;
  votingEndTime: number;
  submissions: Record<string, Submission>;
  votes: Record<string, Vote>;
  results?: RoundResults;
}

export interface Message {
  sender: string;
  content: string;
  sentAt: number;
  type: MessageType;
}

export interface Battle {
  metadata: BattleMetadata;
  participants: Record<string, Participant>;
  rounds: Record<string, Round>;
  messages: Record<string, Message>;
}

export interface User {
  displayName: string;
  lastActive: number;
  activeBattleId?: string;
  battlesHosted: string[];
  battlesJoined: string[];
}

export interface ActiveBattle {
  battleId: string;
  name: string;
  hostName: string;
  status: BattleStatus;
  participantCount: number;
  createdAt: number;
} 