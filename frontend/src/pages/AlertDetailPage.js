import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Alert,
} from "@mui/material";
import {
  getAlertDetail,
  getDownloadCsvUrl,
  getDownloadPcapUrl,
} from "../services/api";

const AlertDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [columns, setColumns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [alertMeta, setAlertMeta] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAlertData = async () => {
      try {
        const data = await getAlertDetail(id);
        if (!data) throw new Error("No alert data received");

        const { csv_path, pcap_path, csv_data } = data;

        if (csv_data && csv_data.length > 0) {
          setColumns(Object.keys(csv_data[0]));
          setRows(csv_data);
        }

        setAlertMeta({ csv_path, pcap_path });
      } catch (err) {
        console.error("Failed to load alert data:", err);
        setError("Không thể tải dữ liệu cảnh báo.");
      } finally {
        setLoading(false);
      }
    };

    fetchAlertData();
  }, [id]);

  return (
    <Box sx={{ px: 4, py: 3 }}>
      <Typography variant="h4" gutterBottom>
        Chi tiết cảnh báo #{id}
      </Typography>

      {loading ? (
        <CircularProgress />
      ) : error ? (
        <Alert severity="error">{error}</Alert>
      ) : (
        <>
          <Box sx={{ mb: 2, display: "flex", gap: 2 }}>
            <Button
              variant="contained"
              color="primary"
              href={getDownloadCsvUrl(id)}
              target="_blank"
            >
              📄 Tải CSV
            </Button>
            <Button
              variant="contained"
              color="secondary"
              href={getDownloadPcapUrl(id)}
              target="_blank"
            >
              🗂️ Tải PCAP
            </Button>
            <Button variant="outlined" onClick={() => navigate("/dashboard")}>
              🔙 Trở về Dashboard
            </Button>
          </Box>

          {rows.length === 0 ? (
            <Alert severity="info">Không có dữ liệu CSV nào để hiển thị.</Alert>
          ) : (
            <Paper sx={{ maxHeight: "70vh", overflow: "auto" }}>
              <TableContainer>
                <Table stickyHeader size="small">
                  <TableHead>
                    <TableRow>
                      {columns.map((col) => (
                        <TableCell key={col}>{col}</TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {rows.map((row, idx) => (
                      <TableRow key={idx}>
                        {columns.map((col) => (
                          <TableCell key={col}>
                            {String(row[col] ?? "")}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          )}
        </>
      )}
    </Box>
  );
};

export default AlertDetailPage;
