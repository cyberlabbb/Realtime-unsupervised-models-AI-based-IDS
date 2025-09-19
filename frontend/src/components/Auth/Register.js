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
import { useAuth } from "../../contexts/AuthContext";

const Register = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = (e) => {
    e.preventDefault();

    const users = JSON.parse(localStorage.getItem("users")) || [];

    if (users.some((user) => user.email === email)) {
      setError("Email is already registered");
      return;
    }

    const newUser = { name, email, password };
    users.push(newUser);
    localStorage.setItem("users", JSON.stringify(users));
    localStorage.setItem("user", JSON.stringify(newUser));
    login();
    navigate("/dashboard");
  };

  return (
    <Container maxWidth="sm">
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
      >
        <Paper
          elevation={4}
          sx={{ padding: 4, borderRadius: 4, width: "100%" }}
        >
          <Typography variant="h4" align="center" gutterBottom>
            Register
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              margin="normal"
              required
            />
            <TextField
              fullWidth
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              margin="normal"
              required
            />
            <TextField
              fullWidth
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              margin="normal"
              required
            />
            <Button
              fullWidth
              variant="contained"
              color="primary"
              type="submit"
              sx={{ mt: 2 }}
            >
              Register
            </Button>
          </form>

          <Typography variant="body2" align="center" sx={{ mt: 3 }}>
            Already have an account?{" "}
            <a
              href="/login"
              style={{ color: "#1976d2", textDecoration: "none" }}
            >
              Login
            </a>
          </Typography>
        </Paper>
      </Box>
    </Container>
  );
};

export default Register;
