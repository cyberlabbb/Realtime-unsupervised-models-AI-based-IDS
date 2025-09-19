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
  Typography,
} from "@mui/material";

import {
  getBatchDetail,
  getDownloadCsvUrl,
  getDownloadPcapUrl,
  getCsvData,
  deleteBatch,
  updateBatch,
} from "../services/api";

const BatchDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [columns, setColumns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [note, setNote] = useState("");
  const [batchMeta, setBatchMeta] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const fetchBatchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await getBatchDetail(id);
        if (!response || !response.batch) {
          throw new Error("Batch not found");
        }

        const batchData = response.batch;
        setBatchMeta(batchData);
        setNote(batchData?.note || "");

        if (batchData.csv_file_path) {
          try {
            const csvResult = await getCsvData(id);
            setColumns(csvResult?.columns ?? []);
            setRows(csvResult?.rows ?? []);
          } catch (csvError) {
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
      // Truyền refresh flag khi navigate
      navigate("/dashboard", { state: { refresh: true } });
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  const handleUpdate = async () => {
    try {
      await updateBatch(id, { note });
      alert("Note updated successfully!");
    } catch (err) {
      console.error("Update failed:", err);
    }
  };

  const handleToggleLabel = () => {
    const newRows = rows.map((row) => ({
      ...row,
      Label: batchMeta?.is_attack ? "Attack" : "Benign",
    }));
    setRows(newRows);
  };

  const handleExportCsv = () => {
    const csvContent = [columns.join(",")]
      .concat(
        rows.map((row) =>
          columns.map((col) => JSON.stringify(row[col] ?? "")).join(",")
        )
      )
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `batch_${id}.csv`);
    link.click();
  };

  const filteredRows = rows.filter((row) =>
    columns.some((col) =>
      String(row[col] || "")
        .toLowerCase()
        .includes(searchQuery.toLowerCase())
    )
  );

  return (
    <Box
      sx={{
        p: 3,
        minHeight: "100vh",
        background: "linear-gradient(135deg, #00bcd4, #ff4081)",
      }}
    >
      <Typography
        variant="h5"
        sx={{
          fontWeight: "bold",
          background: "linear-gradient(90deg, #00bcd4, #ff4081)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          mb: 2,
        }}
      >
        Batch Detail
      </Typography>

      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, mb: 2 }}>
        <Button
          variant="outlined"
          onClick={() => navigate("/dashboard", { state: { refresh: true } })}
          sx={{
            background: "linear-gradient(45deg, #00bcd4, #ff4081)",
            color: "white",
            fontWeight: "bold",
            "&:hover": {
              background: "linear-gradient(45deg, #00acc1, #f50057)",
            },
          }}
        >
          🔙 Back to Dashboard
        </Button>

        <Button
          variant="contained"
          href={getDownloadCsvUrl(id)}
          target="_blank"
          sx={{
            background: "linear-gradient(45deg, #00bcd4, #ff4081)",
            color: "white",
            fontWeight: "bold",
            "&:hover": {
              background: "linear-gradient(45deg, #00acc1, #f50057)",
            },
          }}
        >
          📄 Download CSV
        </Button>

        <Button
          variant="contained"
          href={getDownloadPcapUrl(id)}
          target="_blank"
          sx={{
            background: "linear-gradient(45deg, #00bcd4, #ff4081)",
            color: "white",
            fontWeight: "bold",
            "&:hover": {
              background: "linear-gradient(45deg, #00acc1, #f50057)",
            },
          }}
        >
          🗂️ Download PCAP
        </Button>

        <Button
          variant="contained"
          onClick={handleDelete}
          sx={{
            background: "linear-gradient(45deg, #f44336, #ff4081)",
            color: "white",
            fontWeight: "bold",
            "&:hover": {
              background: "linear-gradient(45deg, #d32f2f, #f50057)",
            },
          }}
        >
          🗑 Delete Batch
        </Button>
      </Box>

      <Paper elevation={5} sx={{ p: 2, mb: 3, borderRadius: 3 }}>
        <TextField
          label="Note / Annotation"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          multiline
          fullWidth
          rows={2}
          sx={{ mb: 1 }}
        />
        <Button variant="outlined" onClick={handleUpdate}>
          💾 Save Note
        </Button>
      </Paper>

      <TextField
        label="Search"
        variant="outlined"
        size="small"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="Search by any column"
        sx={{ mb: 2 }}
      />

      {loading ? (
        <CircularProgress />
      ) : error ? (
        <Alert severity="error">{error}</Alert>
      ) : rows.length === 0 ? (
        <Alert severity="info">No CSV data available to display.</Alert>
      ) : (
        <Paper
          elevation={5}
          sx={{ maxHeight: 700, overflow: "auto", p: 2, borderRadius: 3 }}
        >
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
                {filteredRows.map((row, idx) => (
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
