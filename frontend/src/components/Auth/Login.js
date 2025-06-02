import { useState } from "react";
import { TextField, Button, Typography, Container, Box, Alert, Paper } from "@mui/material";
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
      setError("Vui lòng nhập đầy đủ thông tin");
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
      setError(
        err.response?.data?.error || err.message || "Đăng nhập thất bại"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="sm">
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <Paper elevation={4} sx={{ padding: 4, borderRadius: 4, width: "100%" }}>
          <Typography variant="h4" align="center" gutterBottom>
            Đăng nhập
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="Tên đăng nhập"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              margin="normal"
              required
            />
            <TextField
              fullWidth
              label="Mật khẩu"
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
              disabled={loading}
              sx={{ mt: 2 }}
            >
              {loading ? "Đang xử lý..." : "Đăng nhập"}
            </Button>
          </form>

          <Typography variant="body2" align="center" sx={{ mt: 3 }}>
            Quên mật khẩu?{" "}
            <a href="#" style={{ color: "#1976d2", textDecoration: "none" }}>
              Khôi phục
            </a>
          </Typography>
        </Paper>
      </Box>
    </Container>
  );
};

export default Login;
