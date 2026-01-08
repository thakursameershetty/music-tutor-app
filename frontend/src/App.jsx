import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';

// Helper to protect routes
const PrivateRoute = ({ children }) => {
  const token = localStorage.getItem("musicTutorToken");
  return token ? children : <Navigate to="/" />;
};

function App() {
  return (
    <Router>
      <div className="antialiased">
        <Routes>
          <Route path="/" element={<Login />} />
          <Route 
            path="/dashboard" 
            element={
              <PrivateRoute>
                <Dashboard />
              </PrivateRoute>
            } 
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;