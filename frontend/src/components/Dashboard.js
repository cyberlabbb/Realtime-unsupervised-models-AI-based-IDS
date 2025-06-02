import React, { useState, useEffect, useMemo } from "react";
import {
  Box,
  Typography,
  Paper,
  Grid,
  Alert,
  Chip,
  TextField,
  Button,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  useMediaQuery,
} from "@mui/material";
import StatusPanel from "./StatusPanel";
import TrafficChart from "./TrafficChart";
import CaptureControl from "./CaptureControl";
import PacketTable from "./PacketTable";
import { useCapture } from "../contexts/CaptureContext";
import { setupSocket } from "../services/socket";
import authService from "../services/auth";
import { useNavigate } from "react-router-dom";

const Dashboard = ({ status, batches, alerts, recentAlert }) => {
  const navigate = useNavigate();
  const [packets, setPackets] = useState([]);
  const { isCapturing } = useCapture();
  const [filter, setFilter] = useState("");
  const [activeTab, setActiveTab] = useState(0);
  const [alertPackets, setAlertPackets] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const isMobile = useMediaQuery("(max-width:600px)");

  const filteredPackets = useMemo(() => {
    if (!filter) return packets;
    const lower = filter.toLowerCase();
    return packets.filter(
      (packet) =>
        (packet.src_ip && packet.src_ip.toLowerCase().includes(lower)) ||
        (packet.dst_ip && packet.dst_ip.toLowerCase().includes(lower)) ||
        (packet.protocol &&
          packet.protocol.toString().toLowerCase().includes(lower)) ||
        (packet.info && packet.info.toLowerCase().includes(lower))
    );
  }, [packets, filter]);

  useEffect(() => {
    const user = authService.getCurrentUser();
    if (!user) navigate("/login");
  }, [navigate]);

  useEffect(() => {
    let cleanup;

    const handlePacketReceived = (packet) => {
      setPackets((prev) => [packet, ...prev].slice(0, 1000));
    };

    const handleAlert = (alertData) => {
      console.log("Alert received:", alertData);
    };

    const initSocket = async () => {
      try {
        cleanup = await setupSocket(handleAlert, handlePacketReceived);
      } catch (error) {
        console.error("Socket setup failed:", error);
      }
    };

    initSocket();
    return () => {
      if (cleanup) cleanup();
    };
  }, []);

  const exportPackets = () => {
    const dataStr = JSON.stringify(packets, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `packets-${new Date().toISOString()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const memoizedPacketTable = useMemo(
    () => <PacketTable packets={filteredPackets} />,
    [filteredPackets]
  );

  return (
    <Box sx={{ width: "100%", px: isMobile ? 1 : 4, py: 3 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
        <Typography variant="h4">Network Intrusion Detection System</Typography>
      </Box>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={8}>
          <CaptureControl />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* 🧱 Alert Panel */}
        <Grid item xs={4} md={6}>
          <Paper elevation={3} sx={{ p: 2, minHeight: 400, overflowY: "auto" }}>
            <Typography variant="h6" gutterBottom>
              Alerts
            </Typography>

            {alerts.length > 0 ? (
              alerts.map((alert, index) => (
                <Paper key={index} sx={{ p: 1.5, mb: 1 }}>
                  <Typography variant="body1">🚨 {alert.message}</Typography>
                  <Chip
                    label={alert.severity}
                    color="warning"
                    size="small"
                    sx={{ mt: 0.5 }}
                  />
                  <Typography variant="body2" sx={{ mt: 0.5 }}>
                    {new Date(
                      alert.timestamp?.$date || alert.timestamp
                    ).toLocaleString()}
                  </Typography>

                  <Button
                    size="small"
                    sx={{ mt: 1 }}
                    onClick={() => {
                      const alertId = alert._id?.$oid || alert.id;
                      console.log("Navigating to alert:", alertId);
                      navigate(`/alerts/${alertId}`);
                    }}
                  >
                    Xem chi tiết gói tin
                  </Button>
                </Paper>
              ))
            ) : (
              <Alert severity="info">Chưa có cảnh báo nào.</Alert>
            )}
          </Paper>
        </Grid>

        {/* 🧱 Live Packet Capture */}
        <Grid item xs={12} md={6}>
          <Paper elevation={3} sx={{ p: 2, minHeight: 400, overflowY: "auto" }}>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                mb: 1,
              }}
            >
              <Typography variant="h6">Live Packet Capture</Typography>
              <Chip
                label={isCapturing ? "ACTIVE" : "INACTIVE"}
                color={isCapturing ? "success" : "error"}
                size="small"
              />
            </Box>

            {isCapturing ? (
              <>
                <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mr: 2 }}
                  >
                    {packets.length} packets captured
                  </Typography>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={exportPackets}
                    disabled={!packets.length}
                  >
                    Export
                  </Button>
                </Box>

                <TextField
                  label="Filter packets"
                  variant="outlined"
                  size="small"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  fullWidth
                  sx={{ mb: 2 }}
                  placeholder="Filter by IP, protocol or info"
                />

                {filteredPackets.length > 0 ? (
                  memoizedPacketTable
                ) : (
                  <Alert severity="info">
                    {filter
                      ? "No packets match your filter"
                      : "No packets captured yet"}
                  </Alert>
                )}
              </>
            ) : (
              <Alert severity="info" sx={{ mt: 1 }}>
                Packet capture is currently inactive. Click "Start Capture" to
                begin.
              </Alert>
            )}
          </Paper>
        </Grid>
      </Grid>
      {/* Dialog hiển thị packet liên quan */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Gói tin liên quan đến cảnh báo</DialogTitle>
        <DialogContent>
          {alertPackets.length > 0 ? (
            <PacketTable packets={alertPackets} />
          ) : (
            <Alert severity="info">
              Không có gói tin liên kết với alert này.
            </Alert>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
  
};

export default Dashboard;
