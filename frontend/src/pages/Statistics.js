import React, { useState, useEffect, useCallback } from "react";
import {
  Box,
  Typography,
  Paper,
  Divider,
  Tabs,
  Tab,
  Stack,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from "@mui/material";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import BatchTable from "../components/BatchTable";
import PacketTable from "../components/PacketTable";
import { protocolMap } from "../document/protocolMap";

const Statistics = ({ packets = [] }) => {
  const [summary, setSummary] = useState(null);
  const [tabIndex, setTabIndex] = useState(0);
  const [timeRange, setTimeRange] = useState("all");
  const [batchesData, setBatchesData] = useState([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const fetchBatches = useCallback(async () => {
    try {
      const res = await fetch("http://localhost:5000/api/batches/all");
      const json = await res.json();
      setBatchesData(json.data || []);
    } catch (e) {
      console.error("Failed to fetch batches:", e);
    }
  }, []);

  const fetchSummary = useCallback(async () => {
    try {
      const res = await fetch("http://localhost:5000/api/flows/summary");
      const json = await res.json();
      setSummary(json);
    } catch (e) {
      console.error("Failed to fetch flow summary:", e);
    }
  }, []);

  useEffect(() => {
    fetchBatches();
  }, [fetchBatches, refreshTrigger]);

  useEffect(() => {
    fetchSummary();
    const interval = setInterval(fetchSummary, 10000);
    return () => clearInterval(interval);
  }, [fetchSummary]);

  const handleBatchDeleted = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  const formatChartTime = (timestampStr) => {
    try {
      const date = new Date(timestampStr);
      if (isNaN(date.getTime())) return "Invalid";
      return date.toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (e) {
      return "Invalid";
    }
  };

  const mapProtocolsToNames = (protocolData) =>
    (protocolData || []).map((item) => ({
      name: protocolMap[item.name] || `Unknown (${item.name})`,
      value: item.value,
    }));

  return (
    <Box sx={{ p: 2, minHeight: "100vh", overflow: "auto" }}>
      <Typography
        variant="h4"
        sx={{
          fontWeight: "bold",
          background: "linear-gradient(45deg, #00bcd4, #ff4081)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
        }}
      >
        Statistics
      </Typography>

      <Divider sx={{ mb: 2, borderColor: "rgba(0,0,0,0.2)" }} />

      <FormControl
        sx={{
          mb: 2,
          minWidth: 200,
          bgcolor: "rgba(255, 255, 255, 0.85)",
          borderRadius: 2,
          boxShadow: "0 4px 10px rgba(0,0,0,0.2)",
          "& .MuiOutlinedInput-notchedOutline": {
            borderColor: "transparent",
          },
          "&:hover .MuiOutlinedInput-notchedOutline": {
            borderColor: "#00bcd4",
          },
          "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
            borderColor: "#ff4081",
          },
        }}
        size="small"
      >
        <InputLabel id="time-range-label">Time Range</InputLabel>
        <Select
          labelId="time-range-label"
          value={timeRange}
          label="Time Range"
          onChange={(e) => setTimeRange(e.target.value)}
        >
          <MenuItem value="all">All Time</MenuItem>
          <MenuItem value="24">Last 24 hours</MenuItem>
          <MenuItem value="6">Last 6 hours</MenuItem>
        </Select>
      </FormControl>

      {!summary ? (
        <Typography variant="body2" color="text.secondary">
          Loading summary data...
        </Typography>
      ) : (
        <>
          <Stack direction="row" spacing={2} sx={{ mb: 2, flexWrap: "wrap" }}>
            {[
              { title: "Top Source IP", data: summary.top_source_ips || [] },
              {
                title: "Top Destination Port",
                data: summary.top_destination_ports || [],
              },
              {
                title: "Top Destination IP",
                data: summary.top_destination_ips || [],
              },
              {
                title: "Top Protocols",
                data: mapProtocolsToNames(summary.top_protocols),
              },
            ].map((item, index) => (
              <Paper
                key={index}
                elevation={5}
                sx={{
                  p: 2,
                  flex: "1 1 24%",
                  minWidth: 300,
                  borderRadius: 3,
                  bgcolor: "white",
                  color: "black",
                }}
              >
                <Box
                  sx={{
                    background: "linear-gradient(90deg, #00bcd4, #ff4081)",
                    color: "white",
                    px: 2,
                    py: 1,
                    borderRadius: 2,
                    mb: 1.5,
                  }}
                >
                  <Typography variant="subtitle1" sx={{ fontWeight: "600" }}>
                    {item.title}
                  </Typography>
                </Box>

                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={item.data}
                      dataKey="value"
                      nameKey="name"
                      outerRadius={100}
                      label
                    >
                      {item.data.map((entry, i) => (
                        <Cell
                          key={`cell-${i}`}
                          fill={
                            [
                              "#8884d8",
                              "#82ca9d",
                              "#ffc658",
                              "#ff8042",
                              "#a4de6c",
                              "#d0ed57",
                            ][i % 6]
                          }
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: "#333", color: "#fff" }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </Paper>
            ))}
          </Stack>

          <Stack direction="row" spacing={2} sx={{ mb: 2, flexWrap: "wrap" }}>
            <Paper
              elevation={5}
              sx={{
                p: 2,
                flex: "1 1 40%",
                minWidth: 400,
                height: 420,
                borderRadius: 3,
                bgcolor: "white",
                color: "black",
              }}
            >
              <Box
                sx={{
                  background: "linear-gradient(90deg, #00bcd4, #ff4081)",
                  color: "white",
                  px: 2,
                  py: 1,
                  borderRadius: 2,
                  mb: 1.5,
                }}
              >
                <Typography variant="subtitle1" sx={{ fontWeight: "600" }}>
                  Traffic Over Time
                </Typography>
              </Box>

              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={summary.traffic_over_time || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" tickFormatter={formatChartTime} />
                  <YAxis />
                  <Tooltip labelFormatter={formatChartTime} />
                  <Bar dataKey="count" fill="#8884d8" name="Packets" />
                </BarChart>
              </ResponsiveContainer>
            </Paper>

            <Paper
              elevation={5}
              sx={{
                flex: "1 1 55%",
                minWidth: 500,
                height: 420,
                borderRadius: 3,
                display: "flex",
                flexDirection: "column",
                bgcolor: "white",
                color: "black",
              }}
            >
              <Box
                sx={{
                  background: "linear-gradient(90deg, #00bcd4, #ff4081)",
                  color: "white",
                  px: 2,
                  py: 1,
                  borderTopLeftRadius: "12px",
                  borderTopRightRadius: "12px",
                }}
              >
                <Typography variant="subtitle1" sx={{ fontWeight: "600" }}>
                  Traffic Batches
                </Typography>
              </Box>

              <Box sx={{ flex: 1, overflowY: "auto", p: 2 }}>
                <BatchTable
                  batches={batchesData}
                  onBatchDeleted={handleBatchDeleted}
                />
              </Box>
            </Paper>
          </Stack>
        </>
      )}
    </Box>
  );
};

export default Statistics;
