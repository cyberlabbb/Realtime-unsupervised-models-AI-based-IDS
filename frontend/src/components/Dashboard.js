import React, { useState, useEffect, forwardRef, useRef, useMemo } from "react";
import {
  Box,
  Typography,
  Paper,
  Alert,
  Chip,
  TextField,
  Button,
  Snackbar,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tooltip,
} from "@mui/material";
import { ArrowForward } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { useCapture } from "../contexts/CaptureContext";
import { setupSocket, closeSocket } from "../services/socket";
import {
  getCurrentModel,
  selectModel,
  getCaptureInterface,
  setCaptureInterface,
} from "../services/api";
import CaptureControl from "./CaptureControl";

import PacketTable from "./PacketTable";

const Dashboard = forwardRef(
  (
    {
      status,
      batches,
      packets,
      alertMessage,
      showAlert,
      setShowAlert,
      totalPacketCount,
      setTotalPacketCount,
    },
    ref
  ) => {
    const navigate = useNavigate();
    const { isCapturing } = useCapture();
    const [iface, setIface] = useState("");
    const [ifaceList, setIfaceList] = useState([]);
    const [model, setModel] = useState("");
    const [modelList] = useState(["autoencoder", "kmeans", "svm"]);
    const [filter, setFilter] = useState("");

    useEffect(() => {
      const fetchInterface = async () => {
        const data = await getCaptureInterface();
        if (data.iface) setIface(data.iface);
        if (data.available_ifaces) setIfaceList(data.available_ifaces);
      };
      fetchInterface();
    }, []);

    useEffect(() => {
      const fetchModel = async () => {
        const data = await getCurrentModel();
        if (data.model) setModel(data.model);
      };
      fetchModel();
    }, []);

    const handleModelChange = async (event) => {
      const selected = event.target.value;
      const response = await selectModel(selected);
      if (response.status === "success") {
        setModel(selected);
      }
    };

    const handleIfaceChange = async (event) => {
      const selected = event.target.value;
      setIface(selected);
      await setCaptureInterface(selected);
    };

    const visiblePackets = filter
      ? packets.filter((packet) => {
          const lower = filter.toLowerCase();
          return (
            (packet.src_ip && packet.src_ip.toLowerCase().includes(lower)) ||
            (packet.dst_ip && packet.dst_ip.toLowerCase().includes(lower)) ||
            (packet.protocol &&
              packet.protocol.toString().toLowerCase().includes(lower)) ||
            (packet.info && packet.info.toLowerCase().includes(lower))
          );
        })
      : packets;

    const sortedBatches = useMemo(() => {
      if (!batches || batches.length === 0) return [];
      return [...batches].sort((a, b) => {
        const getTime = (date) => new Date(date?.$date || date).getTime();
        return getTime(b.created_at) - getTime(a.created_at);
      });
    }, [batches]);

    return (
      <Box sx={{ width: "100%", px: 2, py: 2 }}>
        {/* ✅ Header */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            mb: 2,
            alignItems: "center",
          }}
        >
          <Typography
            variant="h4"
            sx={{
              fontWeight: "bold",
              background:
                "linear-gradient(45deg,rgb(0, 188, 212),rgb(255, 64, 129))",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Dashboard
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

            <FormControl size="small" disabled={isCapturing}>
              <InputLabel id="model-label">Model</InputLabel>
              <Select
                labelId="model-label"
                value={model}
                label="Model"
                onChange={handleModelChange}
                sx={{ minWidth: 150 }}
              >
                {modelList.map((opt) => (
                  <MenuItem key={opt} value={opt}>
                    {opt.toUpperCase()}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* ✅ Start/Stop Button */}
            <CaptureControl
              currentModel={model}
              totalPacketCount={totalPacketCount}
              setTotalPacketCount={setTotalPacketCount}
            />
          </Box>
        </Box>

        <Box sx={{ display: "flex", gap: 3, mb: 3 }}>
          {/* ✅ Batch Monitor */}
          <Paper
            elevation={4}
            sx={{
              flex: 1,
              p: 2,
              borderRadius: 3,
              backdropFilter: "blur(10px)",
              backgroundColor: "rgba(255, 255, 255, 0.9)",
              maxHeight: "80vh", // ✅ Chiều cao tối đa
              overflowY: "auto", // ✅ Bật scroll dọc
              scrollbarWidth: "thin", // ✅ Tinh chỉnh scroll cho Firefox
              "&::-webkit-scrollbar": {
                width: "6px",
              },
              "&::-webkit-scrollbar-thumb": {
                backgroundColor: "#aaa",
                borderRadius: "8px",
              },
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
              <Typography variant="h6">Real-time Batch Monitor</Typography>
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
                    borderRadius: 2,
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
                      {batch.is_attack ? "🚨" : "✅"} {batch.batch_name}
                    </Typography>
                    <Chip
                      label={`${batch.total_packets} packets`}
                      color={batch.is_attack ? "error" : "success"}
                      size="small"
                    />
                  </Box>

                  <Box
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
                  </Box>

                  <Box sx={{ mt: 2, display: "flex", gap: 1 }}>
                    <Tooltip title="View batch details">
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
                    </Tooltip>
                  </Box>
                </Paper>
              ))
            ) : (
              <Alert severity="info" sx={{ mt: 2 }}>
                No batches captured yet.
              </Alert>
            )}
          </Paper>

          {/* Live Packet Capture */}

          <Paper
            sx={{
              flex: 2,
              p: 2,
              borderRadius: 3,
              backdropFilter: "blur(10px)",
              backgroundColor: "rgba(255, 255, 255, 0.9)",
              maxHeight: "80vh",
              overflowY: "auto",
              scrollbarWidth: "thin",
              "&::-webkit-scrollbar": {
                width: "6px",
              },
              "&::-webkit-scrollbar-thumb": {
                backgroundColor: "#aaa",
                borderRadius: "8px",
              },
            }}
          >
            <Typography variant="h6" gutterBottom>
              Live Packet Capture
            </Typography>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <Chip
                label={isCapturing ? "ACTIVE" : "INACTIVE"}
                color={isCapturing ? "success" : "error"}
              />
              <Chip
                label={`Total Captured: ${totalPacketCount}`}
                color="primary"
                variant="outlined"
              />
            </Box>

            <Box sx={{ my: 2 }}>
              <TextField
                label="Filter packets"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                fullWidth
                size="small"
              />
            </Box>

            {visiblePackets.length > 0 ? (
              <PacketTable packets={visiblePackets} />
            ) : (
              <Alert severity="info">
                {isCapturing
                  ? "No packets yet"
                  : "Click Start Capture to begin."}
              </Alert>
            )}
          </Paper>
        </Box>

        <Snackbar
          open={showAlert}
          onClose={() => setShowAlert(false)}
          anchorOrigin={{ vertical: "top", horizontal: "center" }}
          autoHideDuration={8000}
        >
          <Alert
            onClose={() => setShowAlert(false)}
            severity="error"
            variant="filled"
            sx={{
              width: "100%",
              background: "linear-gradient(90deg, #ff1744 0%, #ff8a65 100%)",
              color: "white",
              fontWeight: "bold",
              boxShadow: "0px 4px 20px rgba(0,0,0,0.4)",
            }}
          >
            🚨 {alertMessage || "Network Attack Detected!"}
          </Alert>
        </Snackbar>
      </Box>
    );
  }
);

export default Dashboard;
