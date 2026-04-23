import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import PlayerDetail from './pages/PlayerDetail';
import HeadToHead from './pages/HeadToHead';
import Sweeps from './pages/Sweeps';
import Tournaments from './pages/Tournaments';
import Rivalries from './pages/Rivalries';

export default function App() {
  return (
    <Router>
      <Navbar />
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/players/:id" element={<PlayerDetail />} />
        <Route path="/head-to-head" element={<HeadToHead />} />
        <Route path="/sweeps" element={<Sweeps />} />
        <Route path="/tournaments" element={<Tournaments />} />
        <Route path="/rivalries" element={<Rivalries />} />
      </Routes>
    </Router>
  );
}
