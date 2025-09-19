import React from "react";
import { FixedSizeList as List } from "react-window";
import { Paper, Typography, Box, Tooltip } from "@mui/material";

const PacketTable = ({ packets }) => {
  const Row = ({ index, style }) => {
    const packet = packets[index];
    return (
      <Box
        style={style}
        sx={{
          display: "flex",
          alignItems: "center",
          borderBottom: "1px solid #ff80ab",
          px: 1,
          bgcolor: index % 2 === 0 ? "white" : "#fff6f9",
          height: "100%",
          "&:hover": {
            backgroundColor: "#ffd6e4",
          },
        }}
      >
        <Cell width="5%" center>
          {index + 1}
        </Cell>
        <Cell width="15%" tooltip>
          {packet.timestamp}
        </Cell>
        <Cell width="15%" tooltip>
          {packet.src_ip}
        </Cell>
        <Cell width="15%" tooltip>
          {packet.dst_ip}
        </Cell>
        <Cell width="10%">{packet.protocol}</Cell>
        <Cell width="10%">{packet.length}</Cell>
        <Cell flex tooltip>
          {packet.info}
        </Cell>
      </Box>
    );
  };

  const Cell = ({ children, width, flex, center, tooltip }) => {
    const boxProps = {
      sx: {
        width: width,
        flex: flex ? 1 : "unset",
        textAlign: center ? "center" : "left",
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
        px: 0.5,
        fontSize: "0.9rem",
      },
    };
    return tooltip ? (
      <Tooltip title={children} arrow>
        <Box {...boxProps}>{children}</Box>
      </Tooltip>
    ) : (
      <Box {...boxProps}>{children}</Box>
    );
  };

  return (
    <Paper
      elevation={3}
      sx={{
        maxHeight: "70vh",
        overflow: "hidden",
        p: 1,
        border: "2px solid #ff80ab",
        borderRadius: 3,
        backgroundColor: "white",
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          fontWeight: "bold",
          borderBottom: "2px solid #ff80ab",
          py: 1,
          px: 1,
          bgcolor: "#ffe4ec",
          color: "#880e4f",
        }}
      >
        <Cell width="5%" center>
          No.
        </Cell>
        <Cell width="15%">Time</Cell>
        <Cell width="15%">Source</Cell>
        <Cell width="15%">Destination</Cell>
        <Cell width="10%">Protocol</Cell>
        <Cell width="10%">Length</Cell>
        <Cell flex>Info</Cell>
      </Box>

      {/* Body */}
      {packets.length === 0 ? (
        <Typography variant="body2" sx={{ p: 2 }}>
          No packets available.
        </Typography>
      ) : (
        <List
          height={500}
          itemCount={packets.length}
          itemSize={42}
          width="100%"
        >
          {Row}
        </List>
      )}
    </Paper>
  );
};

export default PacketTable;
