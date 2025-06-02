import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { getAlerts } from "../services/api";
import {
  Box,
  Typography,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  Chip,
} from "@mui/material";

const AlertDetails = () => {
  const { alertId } = useParams();
  const [alert, setAlert] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const response = await getAlerts();
        const foundAlert = response.data.find((a) => a.batch_id === alertId);
        setAlert(foundAlert);
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };

    fetchAlerts();
  }, [alertId]);

  if (loading) return <CircularProgress />;
  if (error) return <Alert severity="error">{error}</Alert>;
  if (!alert) return <Alert severity="warning">Alert not found</Alert>;

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Alert Details
      </Typography>

      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            {alert.message}
          </Typography>

          <Box sx={{ mb: 2 }}>
            <Chip
              label={alert.severity}
              color={alert.severity === "high" ? "error" : "warning"}
              sx={{ mr: 1 }}
            />
            <Typography variant="caption" display="inline">
              {new Date(alert.timestamp).toLocaleString()}
            </Typography>
          </Box>

          <Typography>Batch ID: {alert.batch_id}</Typography>
          <Typography>Alert Count: {alert.alert_count}</Typography>
          <Typography>PCAP Path: {alert.pcap_path}</Typography>
        </CardContent>
      </Card>
    </Box>
  );
};

export default AlertDetails;
