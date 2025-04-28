import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button,
  Container,
  FormControl,
  FormLabel,
  Heading,
  Input,
  VStack,
  useToast,
} from '@chakra-ui/react';
import { useAuth } from '../hooks/useAuth';

const LoginPage = () => {
  const [displayName, setDisplayName] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a display name',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    try {
      await login(displayName);
      navigate('/');
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to login',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  return (
    <Container maxW="container.sm" py={10}>
      <VStack spacing={8} as="form" onSubmit={handleSubmit}>
        <Heading>Login</Heading>
        <FormControl isRequired>
          <FormLabel>Display Name</FormLabel>
          <Input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Enter your display name"
          />
        </FormControl>
        <Button type="submit" colorScheme="blue" width="full">
          Login
        </Button>
      </VStack>
    </Container>
  );
};

export default LoginPage; 