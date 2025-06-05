import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getAlerts } from "../services/api";
import {
  Box,
  Typography,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  Chip,
  Button,
} from "@mui/material";
import { ArrowForward } from "@mui/icons-material";

const AlertDetails = () => {
  const { alertId } = useParams();
  const navigate = useNavigate();
  const [alert, setAlert] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const response = await getAlerts();
        const foundAlert = response.data.find((a) => a.batch_id === alertId);
        setAlert(foundAlert);
      } catch (err) {
        setError(err.message || "Failed to fetch alerts.");
      } finally {
        setLoading(false);
      }
    };

    fetchAlerts();
  }, [alertId]);

  if (loading) return <CircularProgress />;
  if (error) return <Alert severity="error">{error}</Alert>;
  if (!alert) return <Alert severity="warning">Alert not found</Alert>;

  const formattedDate = new Date(alert.timestamp).toLocaleString();
  const severityColor = alert.severity === "high" ? "error" : "warning";

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Alert Details
      </Typography>

      <Card elevation={4}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            {alert.message}
          </Typography>

          <Box sx={{ mb: 2, display: "flex", alignItems: "center", gap: 2 }}>
            <Chip label={alert.severity} color={severityColor} />
            <Typography variant="caption">{formattedDate}</Typography>
          </Box>

          <Typography>Batch ID: {alert.batch_id}</Typography>
          <Typography>Alert Count: {alert.alert_count}</Typography>
          <Typography>PCAP Path: {alert.pcap_path}</Typography>

          <Button
            variant="contained"
            color="warning"
            size="small"
            sx={{ mt: 3 }}
            onClick={() => {
              const id = alert._id?.$oid || alert.id || alertId;
              navigate(`/alerts/${id}`);
            }}
            endIcon={<ArrowForward />}
          >
            View Full Alert Detail
          </Button>
        </CardContent>
      </Card>
    </Box>
  );
};

export default AlertDetails;
