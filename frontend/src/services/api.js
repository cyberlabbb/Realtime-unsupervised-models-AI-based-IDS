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

export const getAlerts = async () => {
  try {
    const response = await axios.get(`${API_BASE}/alerts/all`);
    return response?.data;
  } catch (error) {
    console.error("Error fetching alerts:", error);
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

export const getBatchDetails = async (batchId) => {
  try {
    const response = await axios.get(`${API_BASE}/batch/${batchId}`);
    return response?.data;
  } catch (error) {
    console.error("Error fetching batch details:", error);
  }
};

export const getAlertDetail = async (id) => {
  try {
    const response = await axios.get(`${API_BASE}/alerts/${id}`);
    return response?.data;
  } catch (error) {
    console.error("Error fetching alert detail:", error);
  }
};

export const getCsvData = async (alertId) => {
  try {
    const res = await axios.get(`${API_BASE}/csv/${alertId}`, {
      transformResponse: [
        (data) => {
          try {
            return JSON.parse(data);
          } catch (e) {
            console.error("⚠️ Failed to parse CSV JSON:", e);
            return {};
          }
        },
      ],
    });
    return res.data;
  } catch (err) {
    throw new Error("Failed to fetch CSV data");
  }
};
export const deleteAlert = async (alertId) => {
  const token = localStorage.getItem("token");
  console.log("Deleting alert with token:", token);
  return await axios.delete(`${API_BASE}/alerts/${alertId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
};
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


export default api;
