import React, { useEffect, useState, useRef } from "react";

import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useNavigate,
} from "react-router-dom";
import { CssBaseline } from "@mui/material";

import Header from "./components/Header";
import Dashboard from "./components/Dashboard";
import Login from "./components/Auth/Login";
import Register from "./components/Auth/Register";
import BatchDetails from "./pages/BatchDetails";
import BatchDetailPage from "./pages/BatchDetailPage";
import Statistics from "./pages/Statistics";

import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { CaptureProvider } from "./contexts/CaptureContext";

import { getBatches, getStatus } from "./services/api";
import { setupSocket } from "./services/socket";

const PrivateRoute = ({ element }) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? element : <Navigate to="/login" replace />;
};

const AppContent = () => {
  const [status, setStatus] = useState(null);
  const [batches, setBatches] = useState([]);
  const [packets, setPackets] = useState([]);
  const dashboardRef = React.useRef();
  const navigate = useNavigate();
  const [capturedPackets, setCapturedPackets] = useState([]);
  const [isCapturingActive, setIsCapturingActive] = useState(false);
  const bufferRef = useRef([]);
  const updateTimerRef = useRef(null);
  
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [statusRes, batchRes] = await Promise.all([
          getStatus(),
          getBatches(),
        ]);
        setStatus(statusRes);
        setBatches(batchRes.data || []);
      } catch (error) {
        console.error("Error loading initial data:", error);
      }
    };

    fetchInitialData();
  }, []);

  useEffect(() => {
    const handleNewPacket = (packet) => {
      bufferRef.current.push(packet);

      if (!updateTimerRef.current) {
        updateTimerRef.current = setTimeout(() => {
          setPackets((prev) => {
            const combined = [...bufferRef.current, ...prev].slice(0, 1000);
            bufferRef.current = [];
            return combined;
          });
          updateTimerRef.current = null;
        }, 500); // Cập nhật mỗi 500ms
      }
    };

    const handleNewBatch = (batch) => {
      setBatches((prev) => [batch, ...prev]);
    };

    const handleNewAlert = (alert) => {
      const notification = new Notification("Network Intrusion Alert!", {
        body: alert.message || "Potential intrusion detected",
        icon: "/warning.png",
      });

      notification.onclick = () => {
        window.focus();
        navigate(`/batches/${alert.batch_id}`);
      };
    };

    if (Notification.permission !== "granted") {
      Notification.requestPermission();
    }

    setupSocket(handleNewBatch, handleNewPacket, handleNewAlert).catch(
      (error) => {
        console.error("Socket connection failed:", error);
      }
    );

    return () => {};
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
                  ref={dashboardRef}
                  status={status}
                  batches={batches}
                  packets={packets}
                />
              }
            />
          }
        />

        <Route
          path="/statistics"
          element={<PrivateRoute element={<Statistics packets={packets} />} />}
        />

        <Route
          path="/batches/:id"
          element={<PrivateRoute element={<BatchDetailPage />} />}
        />
        <Route path="*" element={<Navigate to="/dashboard" />} />
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
