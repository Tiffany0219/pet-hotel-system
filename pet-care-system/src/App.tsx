import { BrowserRouter, Route, Routes } from 'react-router';
import { Toaster } from 'sonner';
import Layout from './components/Layout';
import RequireAuth from './components/RequireAuth';
import RequireAdmin from './components/RequireAdmin';
import RequireWorker from './components/RequireWorker';
import Home from './pages/Home';
import Services from './pages/Services';
import Rooms from './pages/Rooms';
import Grooming from './pages/Grooming';
import About from './pages/About';
import Branches from './pages/Branches';
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import WorkerDashboard from './pages/WorkerDashboard';
import Dashboard from './pages/Dashboard';
import Pets from './pages/Pets';
import Booking from './pages/Booking';
import Orders from './pages/Orders';
import OrderDetail from './pages/OrderDetail';
import Notifications from './pages/Notifications';

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
          <Route path="/branches" element={<Branches />} />
          <Route path="/about" element={<About />} />
          <Route path="/login" element={<Login />} />
          <Route path="/admin" element={<RequireAdmin><AdminDashboard /></RequireAdmin>} />
          <Route path="/workbench" element={<RequireWorker><WorkerDashboard /></RequireWorker>} />
          <Route path="/dashboard" element={<RequireAuth><Dashboard /></RequireAuth>} />
          <Route path="/pets" element={<RequireAuth><Pets /></RequireAuth>} />
          <Route path="/booking" element={<RequireAuth><Booking /></RequireAuth>} />
          <Route path="/orders" element={<RequireAuth><Orders /></RequireAuth>} />
          <Route path="/orders/:id" element={<RequireAuth><OrderDetail /></RequireAuth>} />
          <Route path="/notifications" element={<RequireAuth><Notifications /></RequireAuth>} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
