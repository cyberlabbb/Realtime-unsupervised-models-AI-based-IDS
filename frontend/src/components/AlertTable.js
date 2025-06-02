import React from "react";
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
} from "@mui/material";
import { Link as RouterLink } from "react-router-dom";

const AlertTable = ({ alerts }) => {
  if (!alerts || alerts.length === 0) {
    return <Typography>No alerts available</Typography>;
  }

  return (
    <TableContainer component={Paper} sx={{ mt: 2 }}>
      <Typography variant="h6" sx={{ p: 2 }}>
        Recent Alerts
      </Typography>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Timestamp</TableCell>
            <TableCell>Message</TableCell>
            <TableCell>Severity</TableCell>
            <TableCell>Batch</TableCell>
            <TableCell>Count</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {alerts.map((alert) => (
            <TableRow key={alert._id?.$oid}>
              <TableCell>
                {alert.timestamp?.$date
                  ? new Date(alert.timestamp.$date).toLocaleString()
                  : "N/A"}
              </TableCell>
              <TableCell>
                <Link
                  component={RouterLink}
                  to={`/alert/${alert.batch_id?.$oid || alert.batch_id}`}
                >
                  {alert.message}
                </Link>
              </TableCell>
              <TableCell>
                <Chip
                  label={alert.severity}
                  color={alert.severity === "high" ? "error" : "warning"}
                  size="small"
                />
              </TableCell>
              <TableCell>
                {alert.batch_id ? (
                  <Link
                    component={RouterLink}
                    to={`/batch/${alert.batch_id?.$oid || alert.batch_id}`}
                  >
                    {alert.batch_id?.$oid || alert.batch_id}
                  </Link>
                ) : (
                  "N/A"
                )}
              </TableCell>
              <TableCell>{alert.alert_count}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default AlertTable;
