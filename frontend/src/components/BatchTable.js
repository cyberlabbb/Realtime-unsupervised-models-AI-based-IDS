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
  Link,
} from "@mui/material";
import { Link as RouterLink } from "react-router-dom";

const BatchTable = ({ batches }) => {
  if (!batches || batches.length === 0) {
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
          </TableRow>
        </TableHead>
        <TableBody>
          {batches.map((batch) => (
            <TableRow key={batch._id?.$oid}>
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
              <TableCell>
                {new Date(batch.created_at).toLocaleString()}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default BatchTable;
