import React from "react";
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Chip,
  Box,
  IconButton,
} from "@mui/material";
import { Link, useNavigate } from "react-router-dom";
import { getSocket } from "../services/socket";
import { useCapture } from "../contexts/CaptureContext";
import authService from "../services/auth";
import { useAuth } from "../contexts/AuthContext";
import Register from './Auth/Register';
import { setupSocket, closeSocket } from "../services/socket";
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

  return (
    <AppBar
      position="static"
      sx={{
        background: "linear-gradient(90deg, #00bcd4, #ff4081)",
        boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
      }}
    >
      <Toolbar>
        <Typography
          variant="h6"
          component={Link}
          to="/"
          sx={{
            flexGrow: 1,
            fontWeight: "bold",
            textDecoration: "none",
            color: "white",
            "&:hover": { opacity: 0.8 },
          }}
        >
          NETWORK INTRUSION DETECTION SYSTEM
        </Typography>

        {isCapturing && (
          <Chip label="Capturing" color="success" size="small" sx={{ mr: 2 }} />
        )}

        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          {isAuthenticated ? (
            <>
              <Button
                component={Link}
                to="/dashboard"
                sx={{
                  color: "white",
                  fontWeight: "bold",
                  "&:hover": { color: "#e0e0e0" },
                }}
              >
                Dashboard
              </Button>
              <Button
                component={Link}
                to="/statistics"
                sx={{
                  color: "white",
                  fontWeight: "bold",
                  "&:hover": { color: "#e0e0e0" },
                }}
              >
                Statistics
              </Button>
              <Button
                variant="contained"
                onClick={handleLogout}
                sx={{
                  background: "linear-gradient(90deg, #ff1744, #ff4081)",
                  color: "white",
                  fontWeight: "bold",
                  "&:hover": {
                    background: "linear-gradient(90deg, #d50000, #f50057)",
                  },
                }}
              >
                Log out
              </Button>
            </>
          ) : (
            <>
              <Button
                component={Link}
                to="/login"
                sx={{
                  color: "white",
                  fontWeight: "bold",
                  "&:hover": { color: "#e0e0e0" },
                }}
              >
                Log in
              </Button>
              {/* <Button
                variant="contained"
                component={Link}
                to="/register"
                sx={{
                  background: "linear-gradient(90deg, #00bcd4, #ff4081)",
                  color: "white",
                  fontWeight: "bold",
                  "&:hover": {
                    background: "linear-gradient(90deg, #00acc1, #f50057)",
                  },
                }}
              >
                Register
              </Button> */}
            </>
          )}
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Header;
