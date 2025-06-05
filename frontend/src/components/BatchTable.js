import React, { useMemo } from "react";
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
} from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import { getDownloadPcapUrl } from "../services/api"; // hoặc đúng path của bạn
import { formatVNDateTime } from "../utils/dateTime";
const BatchTable = ({ batches }) => {
  const sortedBatches = useMemo(() => {
    if (!batches || batches.length === 0) return [];
    return [...batches].sort((a, b) => {
      const getTime = (date) => new Date(date?.$date || date).getTime();
      return getTime(b.created_at) - getTime(a.created_at);
    });
  }, [batches]);

  

  if (sortedBatches.length === 0) {
    return <Typography>No batch data available</Typography>;
  }

  return (
    <TableContainer component={Paper} sx={{ mt: 2 }}>
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
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default BatchTable;
