import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Container,
  FormControl,
  FormLabel,
  Heading,
  Input,
  NumberInput,
  NumberInputField,
  Stack,
  Switch,
  Text,
  useToast,
  VStack,
} from '@chakra-ui/react';
import { useAuth } from '../hooks/useAuth';
import * as firebaseService from '../services/firebase';
import { OpenAIService } from '../services/openai';
import type { BattleSettings } from '../types/battle';

const CreateBattlePage = () => {
  const { userId, displayName } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [settings, setSettings] = useState<BattleSettings>({
    numRounds: 3,
    promptTimeLimit: 60,
    votingTimeLimit: 30,
    maxContestants: 10,
    spectatorVotingEnabled: true,
    manualWinnerSelection: false,
    useCustomTopics: false,
    customTopics: [],
  });

  useEffect(() => {
    const storedKey = localStorage.getItem('openai_api_key');
    if (storedKey) setApiKey(storedKey);
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!userId || !displayName) {
      toast({
        title: 'Error',
        description: 'You must be logged in to create a battle',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    if (!apiKey.trim()) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    try {
      // Test OpenAI API key
      const openai = new OpenAIService(apiKey);
      await openai.generateTopic();

      // Save API key to local storage
      localStorage.setItem('openai_api_key', apiKey);

      const battleId = await firebaseService.createBattle(
        userId,
        {
          name,
          description,
          settings,
        },
        settings
      );

      toast({
        title: 'Success',
        description: 'Battle created successfully!',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });

      navigate(`/battle/${battleId}`);
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create battle',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  return (
    <Container maxW="container.md" py={10}>
      <VStack spacing={8} alignItems="stretch">
        <Heading>Create a New Battle</Heading>
        
        <Box as="form" onSubmit={handleSubmit}>
          <Stack spacing={6}>
            <FormControl>
              <FormLabel>Battle Name</FormLabel>
              <Input
                value={name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
                placeholder="Enter a name for your battle"
              />
            </FormControl>

            <FormControl>
              <FormLabel>Description</FormLabel>
              <Input
                value={description}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDescription(e.target.value)}
                placeholder="Describe your battle"
              />
            </FormControl>

            <FormControl isRequired>
              <FormLabel>OpenAI API Key</FormLabel>
              <Input
                type="password"
                value={apiKey}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setApiKey(e.target.value)}
                placeholder="Enter your OpenAI API key"
              />
              <Text fontSize="sm" color="gray.500" mt={1}>
                Your API key is only stored in your browser and used to generate images
              </Text>
            </FormControl>

            <FormControl>
              <FormLabel>Number of Rounds</FormLabel>
              <NumberInput
                min={1}
                max={10}
                value={settings.numRounds}
                onChange={(valueString) =>
                  setSettings((prev) => ({ ...prev, numRounds: parseInt(valueString) }))
                }
              >
                <NumberInputField />
              </NumberInput>
            </FormControl>

            <FormControl>
              <FormLabel>Prompt Time Limit (seconds)</FormLabel>
              <NumberInput
                min={30}
                max={300}
                value={settings.promptTimeLimit}
                onChange={(valueString) =>
                  setSettings((prev) => ({ ...prev, promptTimeLimit: parseInt(valueString) }))
                }
              >
                <NumberInputField />
              </NumberInput>
            </FormControl>

            <FormControl>
              <FormLabel>Voting Time Limit (seconds)</FormLabel>
              <NumberInput
                min={15}
                max={180}
                value={settings.votingTimeLimit}
                onChange={(valueString) =>
                  setSettings((prev) => ({ ...prev, votingTimeLimit: parseInt(valueString) }))
                }
              >
                <NumberInputField />
              </NumberInput>
            </FormControl>

            <FormControl>
              <FormLabel>Maximum Contestants</FormLabel>
              <NumberInput
                min={2}
                max={20}
                value={settings.maxContestants}
                onChange={(valueString) =>
                  setSettings((prev) => ({ ...prev, maxContestants: parseInt(valueString) }))
                }
              >
                <NumberInputField />
              </NumberInput>
            </FormControl>

            <FormControl display="flex" alignItems="center">
              <FormLabel mb="0">Enable Spectator Voting</FormLabel>
              <Switch
                isChecked={settings.spectatorVotingEnabled}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setSettings((prev) => ({
                    ...prev,
                    spectatorVotingEnabled: e.target.checked,
                  }))
                }
              />
            </FormControl>

            <FormControl display="flex" alignItems="center">
              <FormLabel mb="0">Manual Winner Selection</FormLabel>
              <Switch
                isChecked={settings.manualWinnerSelection}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setSettings((prev) => ({
                    ...prev,
                    manualWinnerSelection: e.target.checked,
                  }))
                }
              />
            </FormControl>

            <Button type="submit" colorScheme="blue" size="lg">
              Create Battle
            </Button>
          </Stack>
        </Box>
      </VStack>
    </Container>
  );
};

export default CreateBattlePage;
