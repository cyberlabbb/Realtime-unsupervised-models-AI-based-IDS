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
import { useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { CaptureProvider } from "./contexts/CaptureContext";

import { getBatches, getStatus } from "./services/api";
import { closeSocket, setupSocket } from "./services/socket";

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
  const [alertMessage, setAlertMessage] = useState("");
  const [showAlert, setShowAlert] = useState(false);
  const totalPacketCountRef = useRef(0);
  const [totalPacketCount, setTotalPacketCount] = useState(0);
  const location = useLocation();

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
    if (location.state?.refresh) {
      // Fetch lại danh sách batch mới nhất
      getBatches().then((batchRes) => {
        setBatches(batchRes.data || []);
      });
      // Xóa flag refresh để tránh fetch lại khi không cần thiết
      window.history.replaceState({}, document.title);
    }
  }, [location]);
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        // Ngắt kết nối socket khi tab bị ẩn
        if (window.socket) window.socket.disconnect();
      } else if (document.visibilityState === "visible") {
        // Kết nối lại khi tab active
        if (window.socket && !window.socket.connected) window.socket.connect();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    const handleNewPacket = (packet) => {
      bufferRef.current.push(packet);
      totalPacketCountRef.current += 1;
      setTotalPacketCount(totalPacketCountRef.current);

      if (!updateTimerRef.current) {
        updateTimerRef.current = setTimeout(() => {
          setPackets((prev) => {
            const combined = [...bufferRef.current, ...prev].slice(0, 15);
            bufferRef.current = [];
            return combined;
          });
          updateTimerRef.current = null;
        }, 500);
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

      setAlertMessage(alert.message || "Network attack detected!");
      setShowAlert(true);
    };

    if (Notification.permission !== "granted") {
      Notification.requestPermission();
    }

    setupSocket(handleNewBatch, handleNewPacket, handleNewAlert).catch(
      (error) => {
        console.error("Socket connection failed:", error);
      }
    );

    return () => {
      closeSocket();
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
                  ref={dashboardRef}
                  status={status}
                  batches={batches}
                  packets={packets}
                  alertMessage={alertMessage}
                  showAlert={showAlert}
                  setShowAlert={setShowAlert}
                  totalPacketCount={totalPacketCount}
                  setTotalPacketCount={setTotalPacketCount}
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
