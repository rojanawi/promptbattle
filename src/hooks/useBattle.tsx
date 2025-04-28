import { useState, useEffect } from 'react';
import { OpenAIService } from '../services/openai';
import * as firebaseService from '../services/firebase';
import type { Battle, Round, Submission } from '../types/battle';

interface UseBattleProps {
  battleId: string;
  userId: string;
  isHost: boolean;
  apiKey?: string;
}

export const useBattle = ({ battleId, userId, isHost, apiKey }: UseBattleProps) => {
  const [battle, setBattle] = useState<Battle | null>(null);
  const [currentRound, setCurrentRound] = useState<Round | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openai, setOpenai] = useState<OpenAIService | null>(null);

  useEffect(() => {
    if (isHost && apiKey) {
      setOpenai(new OpenAIService(apiKey));
    }
  }, [isHost, apiKey]);

  useEffect(() => {
    const unsubscribe = firebaseService.subscribeToBattle(battleId, (updatedBattle) => {
      setBattle(updatedBattle);
      
      // Update current round
      const rounds = Object.values(updatedBattle.rounds || {});
      const activeRound = rounds.find(r => r.status !== 'completed');
      setCurrentRound(activeRound || null);
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, [battleId]);

  const startNewRound = async () => {
    if (!isHost || !openai) {
      throw new Error('Only the host can start a new round');
    }

    try {
      const roundNumber = Object.keys(battle?.rounds || {}).length + 1;
      const topic = await openai.generateTopic();
      await firebaseService.startRound(battleId, roundNumber, topic);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start round');
      throw err;
    }
  };

  const submitPrompt = async (prompt: string) => {
    if (!currentRound) {
      throw new Error('No active round');
    }

    try {
      await firebaseService.submitPrompt(
        battleId,
        currentRound.roundNumber,
        userId,
        prompt
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit prompt');
      throw err;
    }
  };

  const generateImage = async (submission: Submission) => {
    if (!isHost || !openai) {
      throw new Error('Only the host can generate images');
    }

    try {
      await firebaseService.updateSubmissionStatus(
        battleId,
        currentRound!.roundNumber,
        userId,
        'generating'
      );

      const imageUrl = await openai.generateImage(submission.prompt);

      await firebaseService.updateSubmissionStatus(
        battleId,
        currentRound!.roundNumber,
        userId,
        'completed',
        imageUrl
      );
    } catch (err) {
      await firebaseService.updateSubmissionStatus(
        battleId,
        currentRound!.roundNumber,
        userId,
        'failed',
        undefined,
        err instanceof Error ? err.message : 'Failed to generate image'
      );
      throw err;
    }
  };

  const submitVote = async (votedForId: string) => {
    if (!currentRound) {
      throw new Error('No active round');
    }

    try {
      await firebaseService.submitVote(
        battleId,
        currentRound.roundNumber,
        userId,
        votedForId
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit vote');
      throw err;
    }
  };

  const sendMessage = async (content: string, type: 'chat' | 'system' | 'announcement' = 'chat') => {
    try {
      await firebaseService.sendMessage(battleId, userId, content, type);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
      throw err;
    }
  };

  return {
    battle,
    currentRound,
    loading,
    error,
    startNewRound,
    submitPrompt,
    generateImage,
    submitVote,
    sendMessage,
  };
}; 