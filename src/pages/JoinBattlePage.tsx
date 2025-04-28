import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Container,
  FormControl,
  FormLabel,
  Heading,
  Input,
  Radio,
  RadioGroup,
  Stack,
  Text,
  useToast,
  VStack,
} from '@chakra-ui/react';
import { useAuth } from '../hooks/useAuth';
import * as firebaseService from '../services/firebase';
import type { UserRole } from '../types/battle';

const JoinBattlePage = () => {
  const { userId, displayName } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const [battleCode, setBattleCode] = useState('');
  const [role, setRole] = useState<UserRole>('contestant');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!userId || !displayName) {
      toast({
        title: 'Error',
        description: 'You must be logged in to join a battle',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    if (!battleCode.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a battle code',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    try {
      const battleId = await firebaseService.joinBattle(
        battleCode.toUpperCase(),
        userId,
        displayName,
        role === 'host' ? 'contestant' : role // Prevent joining as host
      );

      toast({
        title: 'Success',
        description: 'Successfully joined the battle!',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });

      navigate(`/battle/${battleId}`);
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to join battle',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  return (
    <Container maxW="container.md" py={10}>
      <VStack spacing={8} alignItems="stretch">
        <Heading>Join a Battle</Heading>
        
        <Box as="form" onSubmit={handleSubmit}>
          <Stack spacing={6}>
            <FormControl isRequired>
              <FormLabel>Battle Code</FormLabel>
              <Input
                value={battleCode}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBattleCode(e.target.value)}
                placeholder="Enter the 6-character battle code"
                maxLength={6}
                minLength={6}
                textTransform="uppercase"
              />
            </FormControl>

            <FormControl as="fieldset">
              <FormLabel as="legend">Join as</FormLabel>
              <RadioGroup value={role} onChange={(value: UserRole) => setRole(value)}>
                <Stack direction="row" spacing={4}>
                  <Radio value="contestant">Contestant</Radio>
                  <Radio value="spectator">Spectator</Radio>
                </Stack>
              </RadioGroup>
            </FormControl>

            <Button type="submit" colorScheme="blue" size="lg">
              Join Battle
            </Button>
          </Stack>
        </Box>
      </VStack>
    </Container>
  );
};

export default JoinBattlePage; 