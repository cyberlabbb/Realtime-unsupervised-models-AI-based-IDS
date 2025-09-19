import React from "react";
import { Chip, Button, Box, CircularProgress, Typography } from "@mui/material";
import { PlayArrow, Stop } from "@mui/icons-material";
import axios from "axios";
import { useCapture } from "../contexts/CaptureContext";
import { getSocket } from "../services/socket";

const CaptureControl = ({
  currentModel,
  totalPacketCount,
  setTotalPacketCount,
}) => {
  const { isCapturing, setIsCapturing } = useCapture();
  const [loading, setLoading] = React.useState(false);

  const checkStatus = async () => {
    try {
      const response = await axios.get("http://localhost:5000/api/status");
      setIsCapturing(response.data.is_sniffing);
    } catch (error) {
      console.error("Error checking capture status:", error);
    }
  };

  React.useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 5000);
    return () => clearInterval(interval);
  }, [setIsCapturing]);

  const handleStart = async () => {
    const socket = getSocket();
    if (socket) {
      socket.emit("start_capture");
    }

    setLoading(true);
    try {
      await axios.post("http://localhost:5000/api/capture/start");
      setIsCapturing(true);
    } catch (error) {
      const errMsg = error.response?.data?.message || "Unknown error";
      console.error("Error starting capture:", errMsg);

      if (errMsg === "Capture already running") {
        // Không alert, chỉ đồng bộ trạng thái
        setIsCapturing(true);
      } else {
        // Có thể alert hoặc xử lý lỗi khác nếu muốn
        setIsCapturing(false);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleStop = async () => {
    setLoading(true);
    setTotalPacketCount(0); // Reset count khi stop
    try {
      await axios.post("http://localhost:5000/api/capture/stop");
      setIsCapturing(false);
    } catch (error) {
      console.error("Error stopping capture:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
      <Typography variant="subtitle1">
        Packet Capture: {isCapturing ? "Running" : "Stopped"}
      </Typography>
      {loading ? (
        <CircularProgress size={24} />
      ) : (
        <>
          <Button
            variant="contained"
            color="success"
            startIcon={<PlayArrow />}
            onClick={handleStart}
            disabled={isCapturing}
          >
            Start
          </Button>
          <Button
            variant="contained"
            color="error"
            startIcon={<Stop />}
            onClick={handleStop}
            disabled={!isCapturing}
          >
            Stop
          </Button>
          {currentModel && (
            <Chip
              size="small"
              label={`Active Model: ${currentModel.toUpperCase()}`}
              color="primary"
            />
          )}
        </>
      )}
    </Box>
  );
};

export default CaptureControl;