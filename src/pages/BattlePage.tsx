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
  Input,
  HStack,
} from '@chakra-ui/react';
import { useAuth } from '../hooks/useAuth';
import { useBattle } from '../hooks/useBattle';
import type { Submission } from '../types/battle';

const BattlePage = () => {
  const { battleId = '' } = useParams();
  const { userId, displayName } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [isHost, setIsHost] = useState(false);

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
  });

  useEffect(() => {
    if (!userId || !displayName) {
      navigate('/');
      return;
    }

    // Update host status when battle data is available
    if (battle) {
      setIsHost(battle.metadata.hostId === userId);
    }
  }, [userId, displayName, battle, navigate]);

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

  return (
    <Container maxW="container.xl" py={10}>
      <Grid templateColumns="repeat(12, 1fr)" gap={6}>
        {/* Battle Info */}
        <GridItem colSpan={12}>
          <Stack spacing={4}>
            <Heading>{battle.metadata.name}</Heading>
            <Text>{battle.metadata.description}</Text>
            <Text>
              Round {currentRound?.roundNumber || 0} of {battle.metadata.settings.numRounds}
            </Text>
            {currentRound && (
              <Box p={4} bg="gray.100" borderRadius="md">
                <Text fontWeight="bold">Topic:</Text>
                <Text>{currentRound.topic}</Text>
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

            {currentRound?.status === 'voting' && (
              <Grid templateColumns="repeat(2, 1fr)" gap={6}>
                {Object.entries(currentRound.submissions).map(([submissionUserId, submission]) => (
                  <SubmissionCard
                    key={submissionUserId}
                    submission={submission}
                    displayName={battle.participants[submissionUserId]?.displayName}
                    canVote={canVote && submissionUserId !== userId}
                    onVote={() => handleVote(submissionUserId)}
                  />
                ))}
              </Grid>
            )}

            {currentRound?.status === 'completed' && (
              <RoundResults round={currentRound} battle={battle} />
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
              <Button colorScheme="blue" onClick={startNewRound}>
                Start Next Round
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
      <Text fontSize="sm" color="gray.600">
        {submission.prompt}
      </Text>
      {canVote && (
        <Button mt={2} colorScheme="green" size="sm" onClick={onVote}>
          Vote
        </Button>
      )}
    </Box>
  </Box>
);

interface RoundResultsProps {
  round: any; // TODO: Add proper type
  battle: any; // TODO: Add proper type
}

const RoundResults = ({ round, battle }: RoundResultsProps) => {
  const winner = round.results?.winner;
  const winningSubmission = round.submissions[winner];
  const winnerName = battle.participants[winner]?.displayName;

  return (
    <VStack spacing={4} align="stretch">
      <Heading size="md">Round Results</Heading>
      {winner && (
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