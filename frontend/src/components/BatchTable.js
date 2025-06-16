import React, { useMemo, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Link,
  Chip,
  IconButton,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import { Link as RouterLink } from "react-router-dom";
import { getDownloadPcapUrl, deleteBatch } from "../services/api";
import { formatVNDateTime } from "../utils/dateTime";

const BatchTable = ({ batches, onBatchDeleted }) => {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [batchToDelete, setBatchToDelete] = useState(null);
  const [deleteError, setDeleteError] = useState(null);

  const sortedBatches = useMemo(() => {
    if (!batches || batches.length === 0) return [];
    return [...batches].sort((a, b) => {
      const getTime = (date) => new Date(date?.$date || date).getTime();
      return getTime(b.created_at) - getTime(a.created_at);
    });
  }, [batches]);

  const handleDeleteClick = (batch) => {
    setBatchToDelete(batch);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    try {
      setDeleteError(null);
      await deleteBatch(batchToDelete._id.$oid);
      setDeleteDialogOpen(false);
      setBatchToDelete(null);

      // Dời focus để tránh lỗi assistive tech
      setTimeout(() => {
        const table = document.querySelector("table");
        if (table) {
          table.focus();
        } else {
          document.body.focus();
        }
      }, 100);

      if (onBatchDeleted) {
        onBatchDeleted();
      }
    } catch (error) {
      console.error("Error deleting batch:", error);
      setDeleteError(error.message || "Failed to delete batch");
    }
  };

  if (!sortedBatches || sortedBatches.length === 0) {
    return <Typography>No batch data available</Typography>;
  }

  return (
    <>
      <TableContainer component={Paper} sx={{ mt: 2 }} tabIndex={-1}>
        <Typography variant="h6" sx={{ p: 2 }}>
          Recent Batches
        </Typography>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Batch Name</TableCell>
              <TableCell align="right">Packets</TableCell>
              <TableCell align="right">Bytes</TableCell>
              <TableCell>Protocols</TableCell>
              <TableCell>Timestamp</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>PCAP</TableCell>
              <TableCell>Delete</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedBatches.map((batch) => (
              <TableRow key={batch._id?.$oid || batch.batch_name}>
                <TableCell>
                  <Link component={RouterLink} to={`/batch/${batch._id?.$oid}`}>
                    {batch.batch_name}
                  </Link>
                </TableCell>
                <TableCell align="right">{batch.total_packets}</TableCell>
                <TableCell align="right">{batch.total_bytes}</TableCell>
                <TableCell>
                  TCP: {batch.protocol_distribution?.TCP || 0}, UDP:{" "}
                  {batch.protocol_distribution?.UDP || 0}
                </TableCell>
                <TableCell>{formatVNDateTime(batch.created_at)}</TableCell>
                <TableCell>
                  {batch.is_attack ? (
                    <Chip label="Attack 🔥" color="error" size="small" />
                  ) : (
                    <Chip label="Normal" color="success" size="small" />
                  )}
                </TableCell>
                <TableCell>
                  <Link
                    href={getDownloadPcapUrl(batch._id?.$oid)}
                    underline="hover"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Download
                  </Link>
                </TableCell>
                <TableCell>
                  <IconButton
                    color="error"
                    size="small"
                    onClick={() => handleDeleteClick(batch)}
                  >
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog
        open={deleteDialogOpen}
        onClose={() => {
          setDeleteDialogOpen(false);
          setDeleteError(null);
        }}
      >
        <DialogTitle>Confirm Deletion</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete batch {batchToDelete?.batch_name}?
            This will permanently delete all associated files and cannot be
            undone.
          </DialogContentText>
          {deleteError && (
            <Typography color="error" sx={{ mt: 2 }}>
              {deleteError}
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setDeleteDialogOpen(false);
              setDeleteError(null);
            }}
          >
            Cancel
          </Button>
          <Button onClick={handleDeleteConfirm} color="error">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default BatchTable;
