import { useEffect, useState } from 'react';
import './App.css';
import Admin from './Admin';
import RosterMaker from './RosterMaker';

function App() {
  const [hash, setHash] = useState<string>(window.location.hash);

  useEffect(() => {
    const handleHashChange = () => setHash(window.location.hash);
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  return hash === '#admin' ? <Admin /> : <RosterMaker />;
}

export default App
