import { Button, Container, Heading, HStack, Text, VStack } from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';

const HomePage = () => {
  const navigate = useNavigate();

  return (
    <Container maxW="container.xl" py={10}>
      <VStack gap={8} align="center">
        <Heading size="2xl">Welcome to Prompt Battle</Heading>
        <Text fontSize="xl" textAlign="center">
          Create or join a battle to start generating AI images!
        </Text>
        <HStack gap={4}>
          <Button colorScheme="blue" onClick={() => navigate('/create')}>
            Create Battle
          </Button>
          <Button colorScheme="green" onClick={() => navigate('/join')}>
            Join Battle
          </Button>
        </HStack>
      </VStack>
    </Container>
  );
};

export default HomePage; 