import React, { useState, useEffect, useMemo, forwardRef, useRef } from "react";

import {
  Box,
  Typography,
  Paper,
  Alert,
  Chip,
  TextField,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  useMediaQuery,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import { Snackbar } from "@mui/material";
import StatusPanel from "./StatusPanel";
import TrafficChart from "./TrafficChart";
import CaptureControl from "./CaptureControl";
import PacketTable from "./PacketTable";
import { useCapture } from "../contexts/CaptureContext";
import { setupSocket, closeSocket } from "../services/socket";
import authService from "../services/auth";
import { useNavigate } from "react-router-dom";
import { getCurrentModel, selectModel } from "../services/api";
import { ArrowForward } from "@mui/icons-material";
import { getCaptureInterface, setCaptureInterface } from "../services/api";

const Dashboard = forwardRef(
  ({ status, batches, packets: propPackets }, ref) => {
    const navigate = useNavigate();
    const { isCapturing } = useCapture();
    const [filter, setFilter] = useState("");
    const [dialogOpen, setDialogOpen] = useState(false);
    const [alertDialogOpen, setAlertDialogOpen] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState("");
    const isMobile = useMediaQuery("(max-width:600px)");
    const [notification, setNotification] = useState(null);
    const [iface, setIface] = useState("");
    const [ifaceList, setIfaceList] = useState([]);
    const [localBatches, setLocalBatches] = useState(batches || []);
    const [model, setModel] = useState("");
    const [modelList] = useState(["autoencoder", "kmeans", "svm"]);

    const [alertMessage, setAlertMessage] = useState("");
    const [showAlert, setShowAlert] = useState(false);

    

    const handleCloseNotification = () => {
      setNotification(null);
    };

    useEffect(() => {
      const fetchCurrentModel = async () => {
        try {
          const data = await getCurrentModel();
          if (data.model) {
            setModel(data.model);
            console.log("Current model:", data.model);
          }
        } catch (e) {
          console.error("Failed to fetch current model:", e);
          setNotification("Failed to fetch current model");
        }
      };
      fetchCurrentModel();
    }, []);

    // Update model change handler
    const handleModelChange = async (event) => {
      const selected = event.target.value;
      try {
        const response = await selectModel(selected);
        if (response.status === "success") {
          setModel(selected);
          setNotification(`Model changed to ${selected.toUpperCase()}`);
          console.log("Model changed successfully:", selected);
        }
      } catch (e) {
        console.error("Failed to update model:", e);
        setNotification("Failed to update model");
      }
    };

    useEffect(() => {
      const fetchInterface = async () => {
        const data = await getCaptureInterface();
        if (data.iface) setIface(data.iface);
        if (data.available_ifaces) setIfaceList(data.available_ifaces);
      };
      fetchInterface();
    }, []);
    useEffect(() => {
      setLocalBatches(batches || []);
    }, [batches]);

    const handleIfaceChange = async (event) => {
      const selected = event.target.value;
      setIface(selected);
      try {
        await setCaptureInterface(selected);
      } catch (e) {
        console.error("Failed to update capture interface:", e);
      }
    };

    const filteredPackets = useMemo(() => {
      if (!filter) return propPackets;
      const lower = filter.toLowerCase();
      return propPackets.filter(
        (packet) =>
          (packet.src_ip && packet.src_ip.toLowerCase().includes(lower)) ||
          (packet.dst_ip && packet.dst_ip.toLowerCase().includes(lower)) ||
          (packet.protocol &&
            packet.protocol.toString().toLowerCase().includes(lower)) ||
          (packet.info && packet.info.toLowerCase().includes(lower))
      );
    }, [propPackets, filter]);

    const exportPackets = () => {
      const dataStr = JSON.stringify(propPackets, null, 2);
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

    const sortedBatches = useMemo(() => {
      if (!localBatches || localBatches.length === 0) return [];
      return [...localBatches].sort((a, b) => {
        const getTime = (date) => new Date(date?.$date || date).getTime();
        return getTime(b.created_at) - getTime(a.created_at);
      });
    }, [localBatches]);

    useEffect(() => {
      if (Notification.permission !== "granted") {
        Notification.requestPermission();
      }

      const handleNewBatch = (batch) => {
        console.log("📦 NEW BATCH RECEIVED:", batch);
        setLocalBatches((prev) => [batch, ...prev]);
      };

      const handleNewAlert = (alert) => {
        console.log("🚨 NEW ALERT RECEIVED:", alert);
        setAlertMessage(alert.message || "Có tấn công mạng");
        setShowAlert(true);
      };

      setupSocket(handleNewBatch, null, handleNewAlert).catch((error) => {
        console.error("❌ Socket connection failed:", error);
        setNotification("Failed to connect to server");
      });

      return () => {
        closeSocket();
      };
    }, [navigate]);
    

    const buffer = useRef([]);
    const timer = useRef(null);
    return (
      <Box sx={{ width: "100%", px: isMobile ? 1 : 4, py: 3 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
          <Typography variant="h4">
            Network Intrusion Detection System
          </Typography>

          <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
            <FormControl size="small" disabled={isCapturing}>
              <InputLabel id="iface-label">Interface</InputLabel>
              <Select
                labelId="iface-label"
                value={iface}
                label="Interface"
                onChange={handleIfaceChange}
                sx={{ minWidth: 150 }}
              >
                {ifaceList.map((opt) => (
                  <MenuItem key={opt} value={opt}>
                    {opt}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
              <FormControl size="small" disabled={isCapturing}>
                <InputLabel id="model-label">Model</InputLabel>
                <Select
                  labelId="model-label"
                  value={model}
                  label="Model"
                  onChange={handleModelChange}
                  sx={{ minWidth: 150 }}
                  disabled={isCapturing}
                >
                  {modelList.map((opt) => (
                    <MenuItem key={opt} value={opt}>
                      {opt.toUpperCase()}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          </Box>
        </Box>

        <Box sx={{ mb: 3 }}>
          <CaptureControl currentModel={model} />
        </Box>
        <Box
          sx={{
            display: "flex",
            flexDirection: isMobile ? "column" : "row",
            gap: 3,
            mb: 3,
          }}
        >
          <Paper
            id="alerts-panel"
            elevation={3}
            sx={{
              flex: 1,
              p: 2,
              minHeight: 400,
              maxHeight: 700,
              overflowY: "auto",
            }}
          >
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                mb: 2,
              }}
            >
              <Typography variant="h6" gutterBottom>
                Real-time Batch Monitor
              </Typography>
              <Box sx={{ display: "flex", gap: 1 }}>
                <Chip
                  label={`${
                    sortedBatches.filter((b) => b.is_attack).length
                  } Attacks`}
                  color="error"
                  size="small"
                />
                <Chip
                  label={`${sortedBatches.length} Batches`}
                  color="primary"
                  size="small"
                />
              </Box>
            </Box>

            {sortedBatches.length > 0 ? (
              sortedBatches.map((batch, index) => (
                <Paper
                  key={batch._id?.$oid || batch.batch_name || index}
                  sx={{
                    p: 2,
                    mb: 1.5,
                    border: "1px solid",
                    borderColor: batch.is_attack
                      ? "error.light"
                      : "success.light",
                    transition: "all 0.3s ease",
                    "&:hover": {
                      transform: "translateY(-2px)",
                      boxShadow: 3,
                    },
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                    }}
                  >
                    <Typography
                      variant="h6"
                      sx={{
                        color: batch.is_attack ? "error.dark" : "success.dark",
                        display: "flex",
                        alignItems: "center",
                      }}
                    >
                      {batch.is_attack ? "🚨" : "✅"} Batch {batch.batch_name}
                    </Typography>
                    <Chip
                      label={`${batch.total_packets} packets`}
                      color={batch.is_attack ? "error" : "success"}
                      size="small"
                      sx={{ ml: 1 }}
                    />
                  </Box>

                  {/* <Box
                    sx={{ mt: 1, display: "flex", gap: 2, flexWrap: "wrap" }}
                  >
                    <Typography variant="body2" color="text.secondary">
                      📅{" "}
                      {new Date(
                        batch.created_at?.$date || batch.created_at
                      ).toLocaleString()}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      📊 TCP: {batch.protocol_distribution?.TCP || 0}, UDP:{" "}
                      {batch.protocol_distribution?.UDP || 0}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      💾 {Math.round(batch.total_bytes / 1024)} KB
                    </Typography>
                  </Box> */}

                  <Box sx={{ mt: 2, display: "flex", gap: 1 }}>
                    <Button
                      variant="contained"
                      color={batch.is_attack ? "error" : "success"}
                      size="small"
                      onClick={() => {
                        const batchId = batch._id?.$oid;
                        navigate(`/batches/${batchId}`);
                      }}
                      endIcon={<ArrowForward />}
                    >
                      View Details
                    </Button>
                    {/* <Button
                      variant="outlined"
                      color={batch.is_attack ? "error" : "success"}
                      size="small"
                      href={getDownloadPcapUrl(batch._id?.$oid)}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Download PCAP
                    </Button> */}
                  </Box>
                </Paper>
              ))
            ) : (
              <Alert severity="info" sx={{ mt: 2 }}>
                No batches captured yet.
              </Alert>
            )}
          </Paper>

          <Paper
            elevation={3}
            sx={{
              flex: 3,
              p: 2,
              minHeight: 400,
              maxHeight: 700,
              overflowY: "auto",
            }}
          >
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
                    {propPackets.length} packets captured
                  </Typography>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={exportPackets}
                    disabled={!propPackets.length}
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
        </Box>

        <Snackbar
          open={showAlert}
          autoHideDuration={5000}
          onClose={() => setShowAlert(false)}
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        >
          <Alert
            onClose={() => setShowAlert(false)}
            severity="error"
            sx={{ width: "100%" }}
          >
            {alertMessage}
          </Alert>
        </Snackbar>
      </Box>
    );
  }
);

export default Dashboard;
