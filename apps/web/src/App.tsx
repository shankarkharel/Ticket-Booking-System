import { BrowserRouter, Route, Routes } from 'react-router-dom';
import Home from './pages/Home';
import Booking from './pages/Booking';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/book" element={<Booking />} />
      </Routes>
    </BrowserRouter>
  );
}
