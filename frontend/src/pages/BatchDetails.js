import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { getBatchDetails } from "../services/api";
import {
  Box,
  Typography,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from "@mui/material";

const BatchDetails = () => {
  const { batchId } = useParams();
  const [batch, setBatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchBatchDetails = async () => {
      try {
        const response = await getBatchDetails(batchId);
        setBatch(response.data.batch);
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };

    fetchBatchDetails();
  }, [batchId]);

  if (loading) return <CircularProgress />;
  if (error) return <Alert severity="error">{error}</Alert>;
  if (!batch) return <Alert severity="warning">Batch not found</Alert>;

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Batch Details: {batch.batch_name}
      </Typography>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            General Information
          </Typography>
          <Typography>
            Created At: {new Date(batch.created_at).toLocaleString()}
          </Typography>
          <Typography>Total Packets: {batch.total_packets}</Typography>
          <Typography>Total Bytes: {batch.total_bytes}</Typography>
        </CardContent>
      </Card>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Protocol Distribution
          </Typography>
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Protocol</TableCell>
                  <TableCell align="right">Count</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {Object.entries(batch.protocol_distribution).map(
                  ([protocol, count]) => (
                    <TableRow key={protocol}>
                      <TableCell>{protocol}</TableCell>
                      <TableCell align="right">{count}</TableCell>
                    </TableRow>
                  )
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Box>
  );
};

export default BatchDetails;
