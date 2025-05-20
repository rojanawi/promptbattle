import { ref, set, get, push, update, onValue, off } from 'firebase/database';
import { database } from '../config/firebase';
import type {
  Battle,
  BattleMetadata,
  BattleSettings,
  Participant,
  Round,
  Submission,
  Vote,
  Message,
} from '../types/battle';

// Battle Operations
export const createBattle = async (
  hostId: string,
  metadata: Omit<BattleMetadata, 'hostId' | 'battleCode' | 'createdAt' | 'status'>,
  settings: BattleSettings
): Promise<string> => {
  const battleRef = push(ref(database, 'battles'));
  const battleCode = generateBattleCode();
  
  const battle: Battle = {
    metadata: {
      ...metadata,
      hostId,
      battleCode,
      createdAt: Date.now(),
      status: 'waiting',
      settings,
    },
    participants: {
      [hostId]: {
        displayName: metadata.name,
        role: 'host',
        joinedAt: Date.now(),
        status: 'online',
        lastActive: Date.now(),
        score: 0,
      },
    },
    rounds: {},
    messages: {},
  };

  await set(battleRef, battle);
  await set(ref(database, `activeBattles/${battleCode}`), {
    battleId: battleRef.key,
    name: metadata.name,
    hostName: metadata.name,
    status: 'waiting',
    participantCount: 1,
    createdAt: Date.now(),
  });

  return battleRef.key!;
};

export const joinBattle = async (
  battleCode: string,
  userId: string,
  displayName: string,
  role: 'contestant' | 'spectator'
): Promise<string> => {
  const activeBattleRef = ref(database, `activeBattles/${battleCode}`);
  const activeBattle = await get(activeBattleRef);
  
  if (!activeBattle.exists()) {
    throw new Error('Battle not found');
  }

  const battleId = activeBattle.val().battleId;
  const participant: Participant = {
    displayName,
    role,
    joinedAt: Date.now(),
    status: 'online',
    lastActive: Date.now(),
    score: 0,
  };

  await update(ref(database, `battles/${battleId}/participants/${userId}`), participant);
  await update(ref(database, `activeBattles/${battleCode}`), {
    participantCount: activeBattle.val().participantCount + 1,
  });

  return battleId;
};

export const startRound = async (battleId: string, roundNumber: number, topic: string): Promise<void> => {
  const round: Round = {
    roundNumber,
    topic,
    startedAt: Date.now(),
    status: 'prompt_submission',
    promptEndTime: Date.now() + 60000, // 1 minute for prompt submission
    votingEndTime: Date.now() + 120000, // 2 minutes total (including voting)
    submissions: {},
    votes: {},
  };

  await set(ref(database, `battles/${battleId}/rounds/${roundNumber}`), round);
};

export const submitPrompt = async (
  battleId: string,
  roundNumber: number,
  userId: string,
  prompt: string
): Promise<void> => {
  const submission: Submission = {
    prompt,
    submittedAt: Date.now(),
    generationStatus: 'pending',
  };

  await set(
    ref(database, `battles/${battleId}/rounds/${roundNumber}/submissions/${userId}`),
    submission
  );
};

export const updateSubmissionStatus = async (
  battleId: string,
  roundNumber: number,
  userId: string,
  status: 'generating' | 'completed' | 'failed',
  imageUrl?: string,
  error?: string
): Promise<void> => {
  const updates: Partial<Submission> = {
    generationStatus: status,
    ...(imageUrl && { imageUrl }),
    ...(error && { error }),
  };

  await update(
    ref(database, `battles/${battleId}/rounds/${roundNumber}/submissions/${userId}`),
    updates
  );
};

export const submitVote = async (
  battleId: string,
  roundNumber: number,
  voterId: string,
  votedForId: string
): Promise<void> => {
  const vote: Vote = {
    votedFor: votedForId,
    votedAt: Date.now(),
  };

  await set(
    ref(database, `battles/${battleId}/rounds/${roundNumber}/votes/${voterId}`),
    vote
  );
};

export const sendMessage = async (
  battleId: string,
  userId: string,
  content: string,
  type: 'chat' | 'system' | 'announcement' = 'chat'
): Promise<void> => {
  const message: Message = {
    sender: userId,
    content,
    sentAt: Date.now(),
    type,
  };

  await push(ref(database, `battles/${battleId}/messages`), message);
};

export const updateRoundStatus = async (
  battleId: string,
  roundNumber: number,
  status: 'prompt_submission' | 'voting' | 'completed'
): Promise<void> => {
  const roundRef = ref(database, `battles/${battleId}/rounds/${roundNumber}`);
  const roundSnapshot = await get(roundRef);
  const round = roundSnapshot.val();

  if (!round) {
    throw new Error('Round not found');
  }

  const updates: Partial<Round> = {
    status,
    ...(status === 'voting' ? { 
      votingStartedAt: Date.now(),
      votingEndTime: Date.now() + (round.promptEndTime - round.startedAt), // Same duration as prompt phase
      votes: round.votes || {} // Initialize votes object if it doesn't exist
    } : {}),
    ...(status === 'completed' ? { endedAt: Date.now() } : {}),
  };

  await update(roundRef, updates);
};

export const updateRoundResults = async (
  battleId: string,
  roundNumber: number,
  results: { winner: string; declaredAt: number }
): Promise<void> => {
  await update(ref(database, `battles/${battleId}/rounds/${roundNumber}`), {
    results,
  });

  // Update the winner's score
  const battleRef = ref(database, `battles/${battleId}`);
  const battleSnapshot = await get(battleRef);
  const battle = battleSnapshot.val();
  
  if (battle?.participants?.[results.winner]) {
    const currentScore = battle.participants[results.winner].score || 0;
    await update(ref(database, `battles/${battleId}/participants/${results.winner}`), {
      score: currentScore + 1,
    });
  }
};

// Subscriptions
export const subscribeToBattle = (
  battleId: string,
  callback: (battle: Battle) => void
): (() => void) => {
  const battleRef = ref(database, `battles/${battleId}`);
  onValue(battleRef, (snapshot) => {
    callback(snapshot.val());
  });

  return () => off(battleRef);
};

// Helper function to generate a unique 6-character battle code
const generateBattleCode = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}; 
