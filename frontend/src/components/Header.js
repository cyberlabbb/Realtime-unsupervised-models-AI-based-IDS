import React from "react";
import { AppBar, Toolbar, Typography, Button, Chip, Box } from "@mui/material";
import { Link, useNavigate  } from "react-router-dom";
import { getSocket } from "../services/socket";
import { useCapture } from "../contexts/CaptureContext";
import authService from "../services/auth";
import { useAuth } from "../contexts/AuthContext";

const Header = () => {
  const { isCapturing, setIsCapturing } = useCapture();
  const { isAuthenticated, logout: authLogout } = useAuth();
  const navigate = useNavigate();
  
  const handleLogout = () => {
    authService.logout();
    authLogout();
    navigate("/login");
  };

  React.useEffect(() => {
    const checkStatus = async () => {
      try {
        const response = await fetch("http://localhost:5000/api/status");
        const data = await response.json();
        setIsCapturing(data.is_sniffing);
      } catch (error) {
        console.error("Error checking capture status:", error);
      }
    };
   

    const setupSocketListeners = () => {
      const socket = getSocket();
      if (socket) {
        socket.on("capture_status", handleStatusChange);
      }
    };

    const handleStatusChange = (data) => {
      setIsCapturing(data.is_sniffing);
    };

    checkStatus();
    setupSocketListeners();

    return () => {
      const socket = getSocket();
      if (socket) {
        socket.off("capture_status", handleStatusChange);
      }
    };
  }, [setIsCapturing]);

  const handleStartCapture = async () => {
    try {
      const response = await fetch("http://localhost:5000/api/capture/start", {
        method: "POST",
      });
      const data = await response.json();
      if (data.status === "success") {
        setIsCapturing(true);
      }
    } catch (error) {
      console.error("Error starting capture:", error);
    }
  };

  const handleStopCapture = async () => {
    try {
      const response = await fetch("http://localhost:5000/api/capture/stop", {
        method: "POST",
      });
      const data = await response.json();
      if (data.status === "success") {
        setIsCapturing(false);
      }
    } catch (error) {
      console.error("Error stopping capture:", error);
    }
  };

  return (
    <AppBar position="static">
      <Toolbar>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          Network Monitor
        </Typography>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          {isAuthenticated ? (
            <>
              <Button color="inherit" component={Link} to="/dashboard">
                Dashboard
              </Button>
              <Button color="inherit" component={Link} to="/statistics">
                Statistics
              </Button>
              <Button variant="contained" color="error" onClick={handleLogout}>
                Đăng xuất
              </Button>
            </>
          ) : (
            <>
              <Button color="inherit" component={Link} to="/login">
                Đăng nhập
              </Button>
              <Button
                variant="contained"
                color="secondary"
                component={Link}
                to="/register"
              >
                Đăng ký
              </Button>
            </>
          )}
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Header;
