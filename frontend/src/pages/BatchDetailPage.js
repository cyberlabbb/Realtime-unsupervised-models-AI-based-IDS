import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box,
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
  TextField,
} from "@mui/material";
import {
  getBatchDetail,
  getDownloadCsvUrl,
  getDownloadPcapUrl,
  getCsvData,
  deleteBatch,
  updateBatch,
} from "../services/api";
import { formatVNDateTime } from "../utils/dateTime";

const BatchDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [columns, setColumns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [note, setNote] = useState("");
  const [batchMeta, setBatchMeta] = useState(null);

  useEffect(() => {
    const fetchBatchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Get batch details
        const response = await getBatchDetail(id);
        if (!response || !response.batch) {
          throw new Error("Batch not found");
        }

        const batchData = response.batch;
        setBatchMeta(batchData);
        setNote(batchData?.note || "");

        // Only try to get CSV data if we have a csv_file_path
        if (batchData.csv_file_path) {
          try {
            const csvResult = await getCsvData(id);
            console.log("CSV data loaded:", csvResult);
            console.log("📦 Full CSV result:", csvResult);
            console.log("🧪 Type:", typeof csvResult);
            console.log("📑 Keys:", Object.keys(csvResult));

            setColumns(csvResult?.columns ?? []);
            setRows(csvResult?.rows ?? []);

            console.log("Columns:", csvResult?.columns);
            console.log("Rows:", csvResult?.rows);
          } catch (csvError) {
            console.warn("CSV data not available:", csvError);
            // Don't fail completely if CSV isn't available
            setColumns([]);
            setRows([]);
          }
        }
      } catch (err) {
        console.error("Failed to load batch data:", err);
        setError(err.message || "Could not load batch data");
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchBatchData();
    }
  }, [id]);


  const handleDelete = async () => {
    try {
      await deleteBatch(id);
      navigate("/dashboard");
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  const handleUpdate = async () => {
    try {
      await updateBatch(id, { note });
      alert("Cập nhật ghi chú thành công!");
    } catch (err) {
      console.error("Update failed:", err);
    }
  };

  return (
    <Box sx={{ mt: 4, mb: 2, ml:3, mr: 4,  display: "flex", flexWrap: "wrap", gap: 2 }}>
      <Box sx={{ mt: 4, mb: 2, display: "flex", flexWrap: "wrap", gap: 2 }}>
        <Button variant="outlined" onClick={() => navigate("/dashboard")}>
          🔙 Trở về Dashboard
        </Button>
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
        {/* <Button variant="contained" color="error" onClick={handleDelete}>
          🗑 Xoá Batch
        </Button> */}
      </Box>

      {/* <Paper sx={{ p: 2, mb: 2 }}>
        <TextField
          label="Ghi chú / Nhãn đánh giá"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          multiline
          fullWidth
          rows={2}
          sx={{ mb: 1 }}
        />
        <Button variant="outlined" onClick={handleUpdate}>
          💾 Lưu cập nhật
        </Button>
      </Paper> */}

      {loading ? (
        <CircularProgress />
      ) : error ? (
        <Alert severity="error">{error}</Alert>
      ) : rows.length === 0 ? (
        <Alert severity="info">Không có dữ liệu CSV để hiển thị.</Alert>
      ) : (
        <Paper sx={{ maxHeight: 700, overflow: "auto" }}>
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
                  <TableRow
                    key={idx}
                    sx={
                      row.Label !== "No Label"
                        ? { backgroundColor: "#fff3e0" }
                        : {}
                    }
                  >
                    {columns.map((col) => (
                      <TableCell key={col}>
                        {row[col] !== undefined ? String(row[col]) : ""}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}
    </Box>
  );
};

export default BatchDetailPage;
