import { ChakraProvider, ChakraProviderProps } from '@chakra-ui/react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';
import HomePage from './pages/HomePage';
import CreateBattlePage from './pages/CreateBattlePage';
import JoinBattlePage from './pages/JoinBattlePage';
import BattlePage from './pages/BattlePage';
import theme from './theme';

function App() {
  return (
    <ChakraProvider theme={theme as ChakraProviderProps['theme']}>
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/create" element={<CreateBattlePage />} />
            <Route path="/join" element={<JoinBattlePage />} />
            <Route path="/battle/:battleId" element={<BattlePage />} />
          </Routes>
        </Router>
      </AuthProvider>
    </ChakraProvider>
  );
}

export default App;
