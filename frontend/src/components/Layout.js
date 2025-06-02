import React from "react";
import { Container, Box } from "@mui/material";
import Header from "./Header";

const Layout = ({ children }) => {
  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
      <Header />
      <Container maxWidth="xl" sx={{ py: 3 }}>
        {children}
      </Container>
    </Box>
  );
};

export default Layout;
