import { BrowserRouter, Route, Routes } from 'react-router';
import { Toaster } from 'sonner';
import Layout from './components/Layout';
import RequireAuth from './components/RequireAuth';
import Home from './pages/Home';
import Services from './pages/Services';
import Rooms from './pages/Rooms';
import Grooming from './pages/Grooming';
import About from './pages/About';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Pets from './pages/Pets';
import Booking from './pages/Booking';
import Orders from './pages/Orders';

export default function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-center" richColors />
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/services" element={<Services />} />
          <Route path="/rooms" element={<Rooms />} />
          <Route path="/grooming" element={<Grooming />} />
          <Route path="/about" element={<About />} />
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={<RequireAuth><Dashboard /></RequireAuth>} />
          <Route path="/pets" element={<RequireAuth><Pets /></RequireAuth>} />
          <Route path="/booking" element={<RequireAuth><Booking /></RequireAuth>} />
          <Route path="/orders" element={<RequireAuth><Orders /></RequireAuth>} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
