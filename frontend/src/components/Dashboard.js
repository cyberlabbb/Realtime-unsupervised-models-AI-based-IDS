import React, { useState, useEffect, useMemo, forwardRef } from "react";
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
import StatusPanel from "./StatusPanel";
import TrafficChart from "./TrafficChart";
import CaptureControl from "./CaptureControl";
import PacketTable from "./PacketTable";
import { useCapture } from "../contexts/CaptureContext";
import { setupSocket } from "../services/socket";
import authService from "../services/auth";
import { useNavigate } from "react-router-dom";
import { getAlerts } from "../services/api";
import { ArrowForward } from "@mui/icons-material";
import { getCaptureInterface, setCaptureInterface } from "../services/api";

const Dashboard = forwardRef(
  (
    { status, batches, alerts: propAlerts, recentAlert, packets: propPackets },
    ref
  ) => {
    const navigate = useNavigate();
    const { isCapturing } = useCapture();
    const [filter, setFilter] = useState("");
    const [alerts, setAlerts] = useState(propAlerts || []);
    const [alertPackets, setAlertPackets] = useState([]);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [alertDialogOpen, setAlertDialogOpen] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState("");
    const isMobile = useMediaQuery("(max-width:600px)");

    const [iface, setIface] = useState("");
    const [ifaceList, setIfaceList] = useState([]);

    useEffect(() => {
      const fetchInterface = async () => {
        const data = await getCaptureInterface();
        if (data.iface) setIface(data.iface);
        if (data.available_ifaces) setIfaceList(data.available_ifaces);
      };
      fetchInterface();
    }, []);
    

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

    useEffect(() => {
      if (propAlerts) {
        setAlerts(propAlerts);
        if (propAlerts.length > alerts.length) {
          const alertsPanel = document.querySelector("#alerts-panel");
          if (alertsPanel) alertsPanel.scrollTop = 0;
        }
      }
    }, [propAlerts]);
  

    useEffect(() => {
      const user = authService.getCurrentUser();
      if (!user) navigate("/login");
    }, [navigate]);


    useEffect(() => {
      if (recentAlert) {
        const lastAlertTime = localStorage.getItem("lastAlertTime");
        const currentAlertTime = new Date(
          recentAlert.timestamp?.$date || recentAlert.timestamp
        ).getTime();

    
        if (!lastAlertTime || currentAlertTime > parseInt(lastAlertTime)) {
          setSnackbarMessage(recentAlert.message || "New alert");
          setAlertDialogOpen(true);
          localStorage.setItem("lastAlertTime", currentAlertTime.toString());
        }
      }
    }, [recentAlert]);


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

    const sortedAlerts = [...alerts].sort((a, b) => {
      const ta = new Date(a.timestamp?.$date || a.timestamp).getTime();
      const tb = new Date(b.timestamp?.$date || b.timestamp).getTime();
      return tb - ta;
    });

    return (
      <Box sx={{ width: "100%", px: isMobile ? 1 : 4, py: 3 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
          <Typography variant="h4">
            Network Intrusion Detection System
          </Typography>
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
        </Box>

        <Box sx={{ mb: 3 }}>
          <CaptureControl />
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
                Alerts
              </Typography>
              <Chip
                label={`${sortedAlerts.length} Alerts`}
                color="warning"
                size="small"
              />
            </Box>

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
                  Batches
                </Typography>
                <Chip
                  label={`${batches?.length || 0} Batches`}
                  color="primary"
                  size="small"
                />
              </Box>

              {batches && batches.length > 0 ? (
                batches.map((batch, index) => {
                  const isAttack = batch.is_attack === true;

                  return (
                    <Paper
                      key={batch._id?.$oid || batch.id || index}
                      sx={{
                        p: 2,
                        mb: 1.5,
                        border: "1px solid",
                        borderColor: isAttack ? "error.light" : "success.light",
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
                            color: isAttack ? "error.main" : "success.main",
                            display: "flex",
                            alignItems: "center",
                          }}
                        >
                          {isAttack ? "⚠️ Alert" : "✅ Benign"} –{" "}
                          {batch.name || batch._id?.$oid || "Unnamed"}
                        </Typography>
                        <Chip
                          label={isAttack ? "Attack" : "Normal"}
                          color={isAttack ? "error" : "success"}
                          size="small"
                        />
                      </Box>

                      <Typography
                        variant="body2"
                        sx={{ mt: 1, color: "text.secondary" }}
                      >
                        {batch.createdAt
                          ? new Date(
                              batch.createdAt?.$date || batch.createdAt
                            ).toLocaleString()
                          : "No timestamp"}
                      </Typography>

                      <Button
                        variant="contained"
                        color={isAttack ? "error" : "success"}
                        size="small"
                        sx={{ mt: 2 }}
                        onClick={() => {
                          const batchId = batch._id?.$oid || batch.id;
                          navigate(`/batches/${batchId}`);
                        }}
                        endIcon={<ArrowForward />}
                      >
                        View Batch Details
                      </Button>
                    </Paper>
                  );
                })
              ) : (
                <Alert severity="info" sx={{ mt: 2 }}>
                  No batch found.
                </Alert>
              )}
            </Paper>
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

        {/* Dialog popup thay Snackbar */}
        <Dialog
          open={alertDialogOpen}
          onClose={() => setAlertDialogOpen(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>🚨 WARNING</DialogTitle>
          <DialogContent>
            <Typography sx={{ mb: 2 }}>{snackbarMessage}</Typography>
            <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1 }}>
              <Button onClick={() => setAlertDialogOpen(false)}>Close</Button>
              <Button
                variant="contained"
                color="warning"
                onClick={() => {
                  const alertId = recentAlert?._id?.$oid || recentAlert?.id;
                  if (alertId) {
                    navigate(`/alerts/${alertId}`);
                    setAlertDialogOpen(false);
                  }
                }}
              >
                More details
              </Button>
            </Box>
          </DialogContent>
        </Dialog>
      </Box>
    );
  }
);

export default Dashboard;
