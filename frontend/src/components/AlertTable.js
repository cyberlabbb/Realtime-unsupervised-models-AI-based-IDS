import React, { useState, useEffect, useMemo, forwardRef } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Chip,
  Link,
  Tooltip,
  IconButton,
  Button,
  Snackbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import DownloadIcon from "@mui/icons-material/Download";
import { deleteAlert } from "../services/api";
import {
  getAlertDetail,
  getDownloadCsvUrl,
  getDownloadPcapUrl,
  getCsvData,
} from "../services/api";
import { formatVNDateTime } from "../utils/dateTime";
const AlertTable = ({ alerts, setAlerts }) => {
  const navigate = useNavigate();
  const [csvUrlMap, setCsvUrlMap] = useState({});
  const [pcapUrlMap, setPcapUrlMap] = useState({});
  const [selectedAlertId, setSelectedAlertId] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: "" });

  useEffect(() => {
    const loadUrls = async () => {
      const csvMap = {};
      const pcapMap = {};
      for (const alert of alerts) {
        const id = alert._id?.$oid || alert.id;
        csvMap[id] = await getDownloadCsvUrl(id);
        pcapMap[id] = await getDownloadPcapUrl(id);
      }
      setCsvUrlMap(csvMap);
      setPcapUrlMap(pcapMap);
    };

    if (alerts?.length) loadUrls();
  }, [alerts]);

  const handleDeleteConfirmed = async () => {
    try {
      await deleteAlert(selectedAlertId);
      setAlerts((prev) =>
        prev.filter(
          (a) => a._id?.$oid !== selectedAlertId && a.id !== selectedAlertId
        )
      );
      setSnackbar({ open: true, message: "Alert deleted successfully." });
    } catch (error) {
      setSnackbar({ open: true, message: "Failed to delete alert." });
    } finally {
      setShowConfirm(false);
      setSelectedAlertId(null);
    }
  };

  const handleDelete = (alertId) => {
    setSelectedAlertId(alertId);
    setShowConfirm(true);
  };

  if (!alerts || alerts.length === 0) {
    return (
      <Typography variant="body2" sx={{ p: 2 }}>
        No alerts available.
      </Typography>
    );
  }

  return (
    <>
      <TableContainer component={Paper} sx={{ mt: 2 }}>
        <Typography variant="h6" sx={{ p: 2 }}>
          Recent Alerts
        </Typography>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Timestamp</TableCell>
              <TableCell>Message</TableCell>
              <TableCell>Batch</TableCell>
              <TableCell>Count</TableCell>
              <TableCell>CSV</TableCell>
              <TableCell>PCAP</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {alerts.map((alert) => {
              const alertId = alert._id?.$oid || alert.id;
              const batchId = alert.batch_id?.$oid || alert.batch_id;
              const timestamp = alert.timestamp?.$date || alert.timestamp;

              return (
                <TableRow key={alertId}>
                  <TableCell>{formatVNDateTime(timestamp)}</TableCell>
                  <TableCell>
                    <Tooltip title={alert.message || ""} arrow>
                      <Link
                        component={RouterLink}
                        to={`/alerts/${alertId}`}
                        underline="hover"
                      >
                        {alert.message?.slice(0, 50) || "No message"}
                      </Link>
                    </Tooltip>
                  </TableCell>
                  {/* <TableCell>
                    <Chip
                      label={alert.severity}
                      color={alert.severity === "high" ? "error" : "warning"}
                      size="small"
                    />
                  </TableCell> */}
                  <TableCell>
                    {batchId ? (
                      <Link
                        component={RouterLink}
                        to={`/batches/${batchId}`}
                        underline="hover"
                      >
                        {batchId}
                      </Link>
                    ) : (
                      "N/A"
                    )}
                  </TableCell>
                  <TableCell>{alert.alert_count ?? "N/A"}</TableCell>
                  <TableCell>
                    <Button
                      href={csvUrlMap[alertId]}
                      target="_blank"
                      rel="noopener"
                      variant="outlined"
                      size="small"
                      startIcon={<DownloadIcon />}
                      disabled={!csvUrlMap[alertId]}
                    >
                      CSV
                    </Button>
                  </TableCell>
                  <TableCell>
                    <Button
                      href={pcapUrlMap[alertId]}
                      target="_blank"
                      rel="noopener"
                      variant="outlined"
                      size="small"
                      startIcon={<DownloadIcon />}
                      disabled={!pcapUrlMap[alertId]}
                    >
                      PCAP
                    </Button>
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title="Edit alert">
                      <IconButton
                        color="primary"
                        onClick={() => navigate(`/alerts/${alertId}/edit`)}
                        size="small"
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete alert">
                      <IconButton
                        color="error"
                        onClick={() => handleDelete(alertId)}
                        size="small"
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={showConfirm} onClose={() => setShowConfirm(false)}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          Are you sure you want to delete this alert?
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowConfirm(false)}>Cancel</Button>
          <Button color="error" onClick={handleDeleteConfirmed}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ open: false, message: "" })}
        message={snackbar.message}
      />
    </>
  );
};

export default AlertTable;
