import React from "react";
import {
  Card,
  CardContent,
  Typography,
  List,
  ListItem,
  ListItemText,
  Chip,
  Divider,
} from "@mui/material";

const StatusPanel = ({ status }) => {
  if (!status) return null;

  const getSnifferChip = (statusText) => {
    if (!statusText) return <Chip label="Unknown" size="small" />;
    const lower = statusText.toLowerCase();
    return (
      <Chip
        label={lower === "running" ? "Running" : "Stopped"}
        color={lower === "running" ? "success" : "error"}
        size="small"
      />
    );
  };

  return (
    <Card elevation={3}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          System Status
        </Typography>
        <Divider sx={{ mb: 1 }} />
        <List dense disablePadding>
          <ListItem>
            <ListItemText
              primary="Packet Count"
              secondary={status.packet_count ?? "0"}
            />
          </ListItem>
          <ListItem>
            <ListItemText
              primary="Buffer Size"
              secondary={status.buffer_size ?? "0"}
            />
          </ListItem>
          <ListItem>
            <ListItemText
              primary="Sniffer Status"
              secondary={getSnifferChip(status.sniffer_status)}
            />
          </ListItem>
          <ListItem>
            <ListItemText
              primary="Last Processed"
              secondary={status.last_processed ?? "0"}
            />
          </ListItem>
        </List>
      </CardContent>
    </Card>
  );
};

export default StatusPanel;
