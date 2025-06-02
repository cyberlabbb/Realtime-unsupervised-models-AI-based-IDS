import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from "@mui/material";

const PacketTable = ({ packets }) => {
  return (
    <TableContainer
      component={Paper}
      sx={{ maxHeight: "70vh", overflow: "auto" }}
    >
      <Table stickyHeader size="small">
        <TableHead>
          <TableRow>
            <TableCell>No.</TableCell>
            <TableCell>Time</TableCell>
            <TableCell>Source</TableCell>
            <TableCell>Destination</TableCell>
            <TableCell>Protocol</TableCell>
            <TableCell>Length</TableCell>
            <TableCell>Info</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {packets.map((packet, index) => (
            <TableRow key={index}>
              <TableCell>{index + 1}</TableCell>
              <TableCell>{packet.timestamp}</TableCell>
              <TableCell>{packet.src_ip}</TableCell>
              <TableCell>{packet.dst_ip}</TableCell>
              <TableCell>{packet.protocol}</TableCell>
              <TableCell>{packet.length}</TableCell>
              <TableCell>{packet.info}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default PacketTable;
