import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

// Optional: MUI theme setup (nếu bạn muốn dùng theme riêng)
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { StyledEngineProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";

// Tùy chọn dark/light theme nếu cần
const theme = createTheme({
  palette: {
    mode: "light", // Đổi thành "dark" nếu muốn
  },
});

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <StyledEngineProvider injectFirst>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <App />
    </ThemeProvider>
  </StyledEngineProvider>
);
