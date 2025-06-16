import axios from "axios";

import { getAuthHeader } from "./auth";

const getBaseUrl = () => {
  const ports = [5000];

  return new Promise(async (resolve) => {
    for (const port of ports) {
      try {
        const response = await fetch(`http://localhost:${port}/api/status`);
        if (response.ok) {
          resolve(`http://localhost:${port}/api`);
          return;
        }
      } catch (e) {
        console.log(`Port ${port} not responding`);
      }
    }
    // Default fallback
    resolve("http://localhost:5000/api");
  });
};

let API_BASE = "http://localhost:5000/api";
const api = axios.create({
  baseURL: "http://localhost:5000/api",
});
const initializeApi = async () => {
  if (!API_BASE) {
    API_BASE = await getBaseUrl();
  }
  return API_BASE;
};

export const getStatus = async () => {
  try {
    const response = await axios.get(`${API_BASE}/status`);
    return response?.data;
  } catch (error) {
    console.error("Error fetching status:", error);
  }
};


export const getBatches = async () => {
  try {
    const response = await axios.get(`${API_BASE}/batches/all`);
    return response?.data;
  } catch (error) {
    console.error("Error fetching batches:", error);
  }
};

export const getBatchDetail = async (batchId) => {
  try {
    const response = await axios.get(`${API_BASE}/batches/${batchId}`);
    if (!response.data) {
      throw new Error("No data received");
    }
    return response.data; // Return the full response data
  } catch (error) {
    console.error("Error fetching batch detail:", error);
    throw new Error(error.response?.data?.error || "Batch not found");
  }
};

// export const getCsvData = async (alertId) => {
//   try {
//     const res = await axios.get(`${API_BASE}/csv/${alertId}`, {
//       transformResponse: [
//         (data) => {
//           try {
//             return JSON.parse(data);
//           } catch (e) {
//             console.error("⚠️ Failed to parse CSV JSON:", e);
//             return {};
//           }
//         },
//       ],
//     });
//     return res.data;
//   } catch (err) {
//     throw new Error("Failed to fetch CSV data");
//   }
// };


export const getFlows = async (params = {}) => {
  try {
    const query = new URLSearchParams(params).toString();
    const response = await fetch(`http://localhost:5000/api/flows?${query}`);
    const json = await response.json();
    return json;
  } catch (e) {
    console.error("Failed to fetch flows:", e);
    return { data: [] };
  }
};


export const getDownloadCsvUrl = (id) => `${API_BASE}/download/csv/${id}`;
export const getDownloadPcapUrl = (id) => `${API_BASE}/download/pcap/${id}`;


export const getCaptureInterface = async () => {
  try {
    const response = await axios.get(`${API_BASE}/capture/interface`);
    return response?.data;
  } catch (error) {
    console.error("Error fetching capture interface:", error);
    return { iface: "", available_ifaces: [] };
  }
};

export const setCaptureInterface = async (iface) => {
  try {
    const response = await axios.post(`${API_BASE}/capture/interface`, {
      iface,
    });
    return response?.data;
  } catch (error) {
    console.error("Error setting capture interface:", error);
    throw error;
  }
};

export const deleteBatch = async (batchId) => {
  try {
    const response = await axios.delete(`${API_BASE}/batches/${batchId}`);
    if (response.data.warning) {
      console.warn("Deletion warning:", response.data.warning);
    }
    return response.data;
  } catch (error) {
    console.error("Error deleting batch:", error);
    throw new Error(error.response?.data?.message || "Failed to delete batch");
  }
};
export const updateBatch = async (batchId, data) => {
  try {
    const response = await axios.patch(`${API_BASE}/batches/${batchId}`, data);
    return response?.data;
  } catch (error) {
    console.error("Error updating batch:", error);
    throw error;
  }
};

api.interceptors.request.use(
  (config) => {
    const authHeader = getAuthHeader();
    if (authHeader.Authorization) {
      config.headers.Authorization = authHeader.Authorization;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);
export const getCsvData = async (batchId) => {
  try {
    const response = await axios.get(`${API_BASE}/csv/${batchId}`);

    // Check if response exists
    if (!response.data) {
      throw new Error("No data received");
    }

    // If data is a string, try to parse it
    let parsedData =
      typeof response.data === "string"
        ? JSON.parse(response.data)
        : response.data;

    // Validate the structure
    if (!Array.isArray(parsedData.columns) || !Array.isArray(parsedData.rows)) {
      throw new Error("Invalid data structure");
    }

    return {
      columns: parsedData.columns,
      rows: parsedData.rows,
    };
  } catch (error) {
    console.error("Failed to fetch CSV data:", error);
    throw new Error(
      error.response?.data?.error || error.message || "Failed to fetch CSV data"
    );
  }
};


export const selectModel = async (modelName) => {
  try {
    const response = await axios.post(`${API_BASE}/model/select`, {
      model: modelName,
    });
    return response.data;
  } catch (error) {
    console.error("Failed to select model:", error);
    throw error.response?.data?.error || "Failed to select model";
  }
};

export const getCurrentModel = async () => {
  try {
    const response = await axios.get(`${API_BASE}/model/current`);
    return response.data;
  } catch (error) {
    console.error("Failed to get current model:", error);
    throw error.response?.data?.error || "Failed to get current model";
  }
};
export default api;
