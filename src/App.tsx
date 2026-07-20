/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAppStore } from './store';
import Login from './pages/Login';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Assets from './pages/Assets';
import Maintenance from './pages/Maintenance';
import Tracking from './pages/Tracking';

export default function App() {
  const currentUser = useAppStore((state) => state.currentUser);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={!currentUser ? <Login /> : <Navigate to="/" />} />
        
        <Route path="/" element={currentUser ? <Layout /> : <Navigate to="/login" />}>
          <Route index element={<Dashboard />} />
          <Route path="assets" element={<Assets />} />
          <Route path="maintenance" element={<Maintenance />} />
          <Route path="tracking" element={<Tracking />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
