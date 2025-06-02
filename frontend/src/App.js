import React, { useEffect, useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { CssBaseline } from "@mui/material";

import Header from "./components/Header";
import Dashboard from "./components/Dashboard";
import Login from "./components/Auth/Login";
import Register from "./components/Auth/Register";
import AlertDetails from "./pages/AlertDetails";
import BatchDetails from "./pages/BatchDetails";
import Statistics from "./pages/Statistics"; // 👈 nếu bạn đã tạo trang thống kê
import AlertDetailPage from "./pages/AlertDetailPage";

import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { CaptureProvider } from "./contexts/CaptureContext";

import { getAlerts, getBatches, getStatus } from "./services/api";
import { setupSocket } from "./services/socket";

const PrivateRoute = ({ element }) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? element : <Navigate to="/login" replace />;
};

const AppContent = () => {
  const [status, setStatus] = useState(null);
  const [batches, setBatches] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [recentAlert, setRecentAlert] = useState(null);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [statusRes, batchRes, alertRes] = await Promise.all([
          getStatus(),
          getBatches(),
          getAlerts(),
        ]);
        setStatus(statusRes);
        setBatches(batchRes.data || []);
        setAlerts(alertRes.data || []);
      } catch (error) {
        console.error("Error loading initial data:", error);
      }
    };

    fetchInitialData();
  }, []);

  useEffect(() => {
    let cleanupSocket;

    const handleNewAlert = (alert) => {
      setRecentAlert(alert);
      setAlerts((prev) => [alert, ...prev]);
    };

    const initSocket = async () => {
      try {
        cleanupSocket = await setupSocket(handleNewAlert);
      } catch (error) {
        console.error("Socket connection failed:", error);
      }
    };

    initSocket();

    return () => {
      if (cleanupSocket) cleanupSocket();
    };
  }, []);

  return (
    <>
      <Header />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route
          path="/dashboard"
          element={
            <PrivateRoute
              element={
                <Dashboard
                  status={status}
                  batches={batches}
                  alerts={alerts}
                  recentAlert={recentAlert}
                />
              }
            />
          }
        />

        <Route
          path="/statistics"
          element={
            <PrivateRoute
              element={
                <Statistics
                  alerts={alerts}
                  batches={batches}
                  packets={[]} // 👈 nếu muốn truyền packets, cần thêm capture context
                />
              }
            />
          }
        />

        <Route
          path="/alerts/:id"
          element={<PrivateRoute element={<AlertDetails />} />}
        />
        <Route
          path="/batches/:id"
          element={<PrivateRoute element={<BatchDetails />} />}
        />
        <Route path="*" element={<Navigate to="/dashboard" />} />
        <Route
          path="/alerts/:id"
          element={<PrivateRoute element={<AlertDetailPage />} />}
        />
      </Routes>
    </>
  );
};

const App = () => {
  return (
    <Router>
      <AuthProvider>
        <CaptureProvider>
          <CssBaseline />
          <AppContent />
        </CaptureProvider>
      </AuthProvider>
    </Router>
  );
};

export default App;
