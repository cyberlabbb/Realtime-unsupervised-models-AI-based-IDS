import React, { useState, useEffect } from "react";
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
import { getAlerts } from "../services/api";
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
import AlertTable from "../components/AlertTable";
import BatchTable from "../components/BatchTable";
import PacketTable from "../components/PacketTable";
import { protocolMap } from './../document/protocolMap';
import { formatVNDateTime } from "../utils/dateTime";

const Statistics = ({ alerts: initialAlerts, batches = [], packets = [] }) => {
  const [alerts, setAlerts] = useState(initialAlerts || []);
  const [summary, setSummary] = useState(null);
  const [tabIndex, setTabIndex] = useState(0);
  const [timeRange, setTimeRange] = useState("all");

  const formatChartTime = (timestamp) => {
    try {
      return formatVNDateTime(timestamp).split(" ")[0]; // Chỉ lấy phần giờ
    } catch (error) {
      return "Invalid time";
    }
  };
  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const res = await fetch("http://localhost:5000/api/flows/summary");
        const json = await res.json();
        setSummary(json);
      } catch (e) {
        console.error("Failed to fetch flow summary:", e);
      }
    };

    const fetchAlerts = async () => {
      try {
        const alertRes = await getAlerts();
        setAlerts(alertRes?.data || []);
      } catch (e) {
        console.error("Failed to load alerts:", e);
      }
    };

    fetchSummary();
    fetchAlerts();

    const interval = setInterval(fetchSummary, 10000); // cập nhật mỗi 10 giây
    return () => clearInterval(interval);
  }, []);

  const renderPieChart = (title, data) => (
    <Paper elevation={3} sx={{ p: 2, width: "100%", height: 400 }}>
      <Typography variant="subtitle1" gutterBottom>
        {title}
      </Typography>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            outerRadius={100}
            label
          >
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={
                  [
                    "#8884d8",
                    "#82ca9d",
                    "#ffc658",
                    "#ff8042",
                    "#a4de6c",
                    "#d0ed57",
                  ][index % 6]
                }
              />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    </Paper>
  );

  const mapProtocolsToNames = (protocolData) =>
    (protocolData || []).map((item) => ({
      name: protocolMap[item.name] || `Unknown (${item.name})`,
      value: item.value,
    }));
  

  return (
    <Box sx={{ p: 2, height: "100vh", overflow: "auto" }}>
      <Typography variant="h5" gutterBottom>
        Network Statistics
      </Typography>
      <Divider sx={{ mb: 2 }} />

      <FormControl sx={{ mb: 2, minWidth: 200 }} size="small">
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
        <Typography variant="body2">Loading summary data...</Typography>
      ) : (
        <>
          <Stack direction="row" spacing={2} sx={{ mb: 2, flexWrap: "wrap" }}>
            <Box sx={{ flex: "1 1 24%" }}>
              {renderPieChart("Top Source IP", summary.top_source_ips || [])}
            </Box>
            <Box sx={{ flex: "1 1 24%" }}>
              {renderPieChart(
                "Top Destination Port",
                summary.top_destination_ports || []
              )}
            </Box>
            <Box sx={{ flex: "1 1 24%" }}>
              {renderPieChart(
                "Top Destination IP",
                summary.top_destination_ips || []
              )}
            </Box>
            <Box sx={{ flex: "1 1 24%" }}>
              {renderPieChart(
                "Top Protocols",
                mapProtocolsToNames(summary.top_protocols)
              )}
            </Box>
          </Stack>

          <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
            <Paper elevation={3} sx={{ p: 2, width: "40%", height: 420 }}>
              <Typography variant="subtitle1" gutterBottom>
                Events Over Time
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={summary.traffic_over_time || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time"/>
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </Paper>

            <Paper
              elevation={3}
              sx={{
                flex: 1,
                height: 420,
                display: "flex",
                flexDirection: "column",
              }}
            >
              <Tabs
                value={tabIndex}
                onChange={(e, newIndex) => setTabIndex(newIndex)}
                variant="scrollable"
                scrollButtons="auto"
              >
                <Tab label="Alerts" />
                <Tab label="Traffic Batches" />
                <Tab label="Report" />
              </Tabs>

              <Box sx={{ flex: 1, overflowY: "auto", p: 2 }}>
                {tabIndex === 0 && (
                  <AlertTable alerts={alerts} setAlerts={setAlerts} />
                )}
                {tabIndex === 1 && <BatchTable batches={batches} />}
                {tabIndex === 2 && <PacketTable packets={packets} />}
              </Box>
            </Paper>
          </Stack>
        </>
      )}
    </Box>
  );
};

export default Statistics;
