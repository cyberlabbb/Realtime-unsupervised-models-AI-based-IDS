import axios from "axios";

import { getAuthHeader } from './auth';

const getBaseUrl = () => {
  // Try primary port first, then fallback
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
  baseURL: 'http://localhost:5000/api'
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
export const getDownloadCsvUrl = (id) => `${API_BASE}/download/csv/${id}`;
export const getDownloadPcapUrl = (id) => `${API_BASE}/download/pcap/${id}`;




// Add request interceptor
api.interceptors.request.use(config => {
  const authHeader = getAuthHeader();
  if (authHeader.Authorization) {
    config.headers.Authorization = authHeader.Authorization;
  }
  return config;
}, error => {
  return Promise.reject(error);
});

// Make sure to export the api instance
export default api;

