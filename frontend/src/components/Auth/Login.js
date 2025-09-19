import { useState } from "react";
import {
  TextField,
  Button,
  Typography,
  Container,
  Box,
  Alert,
  Paper,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import authService from "../../services/auth";
import { useAuth } from "../../contexts/AuthContext";

const Login = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      setError("Please enter all fields");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const loginData = {
        name: username,
        password,
      };

      const response = await authService.login(loginData);

      if (response.token) {
        localStorage.setItem("token", response.token);
        localStorage.setItem("user", JSON.stringify(response.user));
        login();
        navigate("/dashboard");
      }
    } catch (err) {
      console.error("Login error:", err);
      setError(err.response?.data?.error || err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        width: "100vw",
        height: "100vh",
        background: "linear-gradient(135deg, #00bcd4, #ff4081)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        overflow: "hidden",
      }}
    >
      <Paper
        elevation={8}
        sx={{
          width: { xs: "90%", sm: "420px", md: "460px" },
          p: 4,
          borderRadius: 5,
          backdropFilter: "blur(10px)",
          backgroundColor: "rgba(255, 255, 255, 0.85)",
          boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
        }}
      >
        <Typography
          variant="h4"
          align="center"
          gutterBottom
          sx={{
            fontWeight: "bold",
            background: "linear-gradient(45deg, #00bcd4, #ff4081)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          Login to System
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <TextField
            fullWidth
            label="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            margin="normal"
            required
            variant="outlined"
          />
          <TextField
            fullWidth
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            margin="normal"
            required
            variant="outlined"
          />
          <Button
            fullWidth
            variant="contained"
            type="submit"
            disabled={loading}
            sx={{
              mt: 2,
              background: "linear-gradient(45deg, #00bcd4, #ff4081)",
              color: "white",
              fontWeight: "bold",
              "&:hover": {
                background: "linear-gradient(45deg, #00acc1, #f50057)",
              },
            }}
          >
            {loading ? "Processing..." : "Login"}
          </Button>
        </form>

        <Typography variant="body2" align="center" sx={{ mt: 3 }}>
          Forgot your password?{" "}
          <a
            href="#"
            style={{
              color: "#ff4081",
              textDecoration: "none",
              fontWeight: 500,
            }}
          >
            Recover
          </a>
        </Typography>
      </Paper>
    </Box>
  );
};

export default Login;
