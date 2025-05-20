import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Container,
  Grid,
  GridItem,
  Heading,
  Image,
  Stack,
  Text,
  useToast,
  VStack,
} from '@chakra-ui/react';
import { useAuth } from '../hooks/useAuth';
import { useBattle } from '../hooks/useBattle';
import * as firebaseService from '../services/firebase';
import type { Submission, Round, Battle } from '../types/battle';

const BattlePage = () => {
  const { battleId = '' } = useParams();
  const { userId, displayName } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [isHost, setIsHost] = useState(false);
  const [apiKey, setApiKey] = useState<string | undefined>(undefined);

  // Get the battle data
  const {
    battle,
    currentRound,
    loading,
    error,
    startNewRound,
    submitPrompt,
    submitVote,
  } = useBattle({
    battleId,
    userId: userId || '',
    isHost,
    apiKey,
  });

  // Add debug logging for round status changes
  useEffect(() => {
    if (currentRound) {
      console.log('Round status changed:', {
        status: currentRound.status,
        roundNumber: currentRound.roundNumber,
        submissions: currentRound.submissions,
        votes: currentRound.votes
      });
    }
  }, [currentRound]);

  useEffect(() => {
    if (!userId || !displayName) {
      navigate('/');
      return;
    }
  }, [userId, displayName, navigate]);

  useEffect(() => {
    if (battle && userId) {
      const host = battle.metadata.hostId === userId;
      setIsHost(host);
      if (host) {
        const storedKey = localStorage.getItem('openai_api_key');
        setApiKey(storedKey || undefined);
      } else {
        setApiKey(undefined);
      }
    }
  }, [battle, userId]);

  if (loading) {
    return (
      <Container maxW="container.xl" py={10}>
        <Text>Loading battle...</Text>
      </Container>
    );
  }

  if (error || !battle) {
    return (
      <Container maxW="container.xl" py={10}>
        <Text color="red.500">Error: {error || 'Battle not found'}</Text>
      </Container>
    );
  }

  const isContestant = battle?.participants?.[userId || '']?.role === 'contestant';
  const hasSubmittedPrompt = currentRound?.submissions?.[userId || '']?.prompt;
  const hasVoted = currentRound?.votes?.[userId || '']?.votedFor;
  const canVote =
    currentRound?.status === 'voting' &&
    !hasVoted &&
    (isContestant || battle?.metadata?.settings?.spectatorVotingEnabled);

  const handlePromptSubmit = async (prompt: string) => {
    if (!currentRound || !isContestant) return;

    try {
      await submitPrompt(prompt);
      toast({
        title: 'Success',
        description: 'Prompt submitted successfully!',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to submit prompt',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const handleVote = async (submissionUserId: string) => {
    if (!currentRound || !canVote) return;

    try {
      await submitVote(submissionUserId);
      toast({
        title: 'Success',
        description: 'Vote submitted successfully!',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to submit vote',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const handleStartVoting = async () => {
    if (!currentRound || !isHost) return;

    try {
      console.log('Starting voting phase...', { roundNumber: currentRound.roundNumber });
      await firebaseService.updateRoundStatus(battleId, currentRound.roundNumber, 'voting');
      console.log('Voting phase started successfully');
      
      toast({
        title: 'Success',
        description: 'Voting phase started!',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      console.error('Failed to start voting phase:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to start voting phase',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const handleDeclareWinner = async (winnerId: string) => {
    if (!currentRound || !isHost) return;

    try {
      await firebaseService.updateRoundResults(battleId, currentRound.roundNumber, {
        winner: winnerId,
        declaredAt: Date.now(),
      });
      await firebaseService.updateRoundStatus(battleId, currentRound.roundNumber, 'completed');
      toast({
        title: 'Success',
        description: 'Winner declared!',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to declare winner',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  return (
    <Container maxW="container.lg" py={8}>
      {battle && (
        <Box mb={8} textAlign="center">
          <Heading size="2xl" color="blue.500">
            Join Code: {battle.metadata.battleCode}
          </Heading>
        </Box>
      )}

      <Grid templateColumns="repeat(12, 1fr)" gap={6}>
        {/* Battle Info */}
        <GridItem colSpan={12}>
          <Stack spacing={4}>
            <Heading>{battle.metadata.name}</Heading>
            <Text>{battle.metadata.description}</Text>
            <Text>
              Round {currentRound?.roundNumber || 1} of {battle.metadata.settings.numRounds}
            </Text>
            {currentRound && (
              <Box p={4} bg="gray.100" borderRadius="md">
                <Text fontWeight="bold">Topic:</Text>
                <Text>{currentRound.topic}</Text>
                <Text mt={2} fontWeight="bold">Status: {currentRound.status}</Text>
              </Box>
            )}
          </Stack>
        </GridItem>

        {/* Submissions Grid */}
        <GridItem colSpan={8}>
          <VStack spacing={6} align="stretch">
            {currentRound?.status === 'prompt_submission' && isContestant && !hasSubmittedPrompt && (
              <PromptSubmissionForm onSubmit={handlePromptSubmit} />
            )}

            {currentRound?.status === 'prompt_submission' && isHost && currentRound.submissions && (
              <Box>
                <Heading size="md" mb={4}>Submitted Prompts</Heading>
                <VStack spacing={4} align="stretch">
                  {Object.entries(currentRound.submissions).map(([submissionUserId, submission]) => (
                    <Box
                      key={submissionUserId}
                      p={4}
                      bg="gray.50"
                      borderRadius="md"
                      borderWidth={1}
                    >
                      <Text fontWeight="bold">
                        {battle.participants[submissionUserId]?.displayName}
                      </Text>
                      <Text mt={2}>{submission.prompt}</Text>
                      <Text fontSize="sm" color="gray.500" mt={2}>
                        Submitted at: {new Date(submission.submittedAt).toLocaleTimeString()}
                      </Text>
                    </Box>
                  ))}
                  {Object.keys(currentRound.submissions).length === 0 && (
                    <Text color="gray.500">No prompts submitted yet...</Text>
                  )}
                  <Button
                    colorScheme="blue"
                    onClick={handleStartVoting}
                    isDisabled={Object.keys(currentRound.submissions).length === 0}
                  >
                    Start Voting Phase
                  </Button>
                </VStack>
              </Box>
            )}

            {currentRound?.status === 'voting' && currentRound.submissions && (
              <VStack spacing={6} align="stretch">
                <Heading size="md">Voting Phase</Heading>
                <Text color="gray.600" mb={4}>
                  {canVote 
                    ? "Vote for your favorite submission!"
                    : hasVoted 
                      ? "You have already voted"
                      : "Voting is not available for your role"}
                </Text>
                {Object.keys(currentRound.submissions).length === 0 ? (
                  <Text color="gray.500">No submissions to vote on...</Text>
                ) : (
                  <Grid templateColumns="repeat(2, 1fr)" gap={6}>
                    {Object.entries(currentRound.submissions).map(([submissionUserId, submission]) => {
                      // Count votes for this submission
                      const voteCount = Object.values(currentRound.votes || {}).filter(
                        vote => vote.votedFor === submissionUserId
                      ).length;
                      
                      const hasVotedForThis = currentRound.votes?.[userId || '']?.votedFor === submissionUserId;
                      
                      return (
                        <Box key={submissionUserId}>
                          <SubmissionCard
                            submission={submission}
                            displayName={battle.participants[submissionUserId]?.displayName}
                            canVote={canVote && submissionUserId !== userId}
                            onVote={() => handleVote(submissionUserId)}
                          />
                          {isHost && (
                            <VStack spacing={2} mt={2}>
                              <Box p={2} bg="gray.50" borderRadius="md" width="100%">
                                <Text fontWeight="bold" textAlign="center">
                                  Votes: {voteCount}
                                </Text>
                              </Box>
                              <Button
                                colorScheme="green"
                                onClick={() => handleDeclareWinner(submissionUserId)}
                                width="100%"
                              >
                                Declare Winner
                              </Button>
                            </VStack>
                          )}
                          {!isHost && hasVotedForThis && (
                            <Box mt={2} p={2} bg="green.50" borderRadius="md" textAlign="center">
                              <Text color="green.600" fontWeight="bold">
                                You voted for this submission
                              </Text>
                            </Box>
                          )}
                        </Box>
                      );
                    })}
                  </Grid>
                )}
              </VStack>
            )}

            {currentRound?.status === 'completed' && currentRound.submissions && (
              <VStack spacing={6} align="stretch">
                <RoundResults round={currentRound} battle={battle} />
                
                {isHost && (
                  <Box 
                    p={6} 
                    bg="blue.50" 
                    borderRadius="lg" 
                    borderWidth={1} 
                    borderColor="blue.200"
                    textAlign="center"
                  >
                    <Heading size="md" mb={4}>Round {currentRound.roundNumber} Completed!</Heading>
                    <Text mb={4}>
                      {currentRound.roundNumber < battle.metadata.settings.numRounds 
                        ? `Ready to start round ${currentRound.roundNumber + 1}?`
                        : 'This was the final round of the battle!'}
                    </Text>
                    {currentRound.roundNumber < battle.metadata.settings.numRounds && (
                      <Button
                        colorScheme="blue"
                        size="lg"
                        onClick={startNewRound}
                      >
                        Start Round {currentRound.roundNumber + 1}
                      </Button>
                    )}
                  </Box>
                )}
              </VStack>
            )}
          </VStack>
        </GridItem>

        {/* Participants List */}
        <GridItem colSpan={4}>
          <VStack spacing={4} align="stretch">
            <Heading size="md">Participants</Heading>
            {Object.entries(battle.participants).map(([participantId, participant]) => (
              <Box
                key={participantId}
                p={3}
                bg="gray.50"
                borderRadius="md"
                borderLeft="4px solid"
                borderLeftColor={participant.status === 'online' ? 'green.500' : 'gray.300'}
              >
                <Text>
                  {participant.displayName} ({participant.role})
                  {participant.role === 'contestant' && ` - Score: ${participant.score}`}
                </Text>
              </Box>
            ))}

            {isHost && !currentRound && (
              <Button colorScheme="blue" onClick={startNewRound}>
                Start Battle
              </Button>
            )}

            {isHost && currentRound?.status === 'completed' && (
              <Button 
                colorScheme="blue" 
                onClick={startNewRound}
                isDisabled={currentRound.roundNumber >= battle.metadata.settings.numRounds}
              >
                {currentRound.roundNumber >= battle.metadata.settings.numRounds 
                  ? 'Battle Complete'
                  : `Start Round ${currentRound.roundNumber + 1}`}
              </Button>
            )}
          </VStack>
        </GridItem>
      </Grid>
    </Container>
  );
};

interface PromptSubmissionFormProps {
  onSubmit: (prompt: string) => void;
}

const PromptSubmissionForm = ({ onSubmit }: PromptSubmissionFormProps) => {
  const [prompt, setPrompt] = useState('');

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (prompt.trim()) {
      onSubmit(prompt.trim());
      setPrompt('');
    }
  };

  return (
    <Box as="form" onSubmit={handleSubmit}>
      <Stack spacing={4}>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Enter your prompt..."
          rows={4}
          style={{
            width: '100%',
            padding: '8px',
            borderRadius: '4px',
            border: '1px solid #E2E8F0',
          }}
        />
        <Button type="submit" colorScheme="blue" isDisabled={!prompt.trim()}>
          Submit Prompt
        </Button>
      </Stack>
    </Box>
  );
};

interface SubmissionCardProps {
  submission: Submission;
  displayName: string;
  canVote: boolean;
  onVote: () => void;
}

const SubmissionCard = ({ submission, displayName, canVote, onVote }: SubmissionCardProps) => (
  <Box borderWidth={1} borderRadius="lg" overflow="hidden">
    {submission.imageUrl ? (
      <Image src={submission.imageUrl} alt={`${displayName}'s submission`} />
    ) : (
      <Box height="200px" bg="gray.100" display="flex" alignItems="center" justifyContent="center">
        <Text>{submission.generationStatus}</Text>
      </Box>
    )}
    <Box p={4}>
      <Text fontWeight="bold">{displayName}</Text>
      <Text fontSize="sm" color="gray.600" mt={2}>
        {submission.prompt}
      </Text>
      {canVote && (
        <Button 
          mt={4} 
          colorScheme="green" 
          size="sm" 
          onClick={onVote}
          width="100%"
        >
          Vote for this submission
        </Button>
      )}
    </Box>
  </Box>
);

interface RoundResultsProps {
  round: Round;
  battle: Battle;
}

const RoundResults = ({ round, battle }: RoundResultsProps) => {
  const winner = round.results?.winner;
  const winningSubmission = winner ? round.submissions[winner] : null;
  const winnerName = winner ? battle.participants[winner]?.displayName : null;

  return (
    <VStack spacing={4} align="stretch">
      <Heading size="md">Round Results</Heading>
      {winner && winningSubmission && winnerName && (
        <Box borderWidth={1} borderRadius="lg" p={4}>
          <Text fontWeight="bold">Winner: {winnerName}</Text>
          {winningSubmission.imageUrl && (
            <Image
              src={winningSubmission.imageUrl}
              alt={`Winning submission by ${winnerName}`}
              mt={2}
            />
          )}
          <Text mt={2}>{winningSubmission.prompt}</Text>
        </Box>
      )}
    </VStack>
  );
};

export default BattlePage;
