// src/api/client.ts
import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

// Centralized Axios instance
export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Attach token automatically
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("access_token");
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// --- API METHODS ---

export const uploadReceipts = async (files: File[]): Promise<any> => {
  const formData = new FormData();
  files.forEach((file) => formData.append("files", file));

  try {
    const response = await apiClient.post(
      "/process-receipts",
      formData,
      {
        headers: { "Content-Type": "multipart/form-data" },
      }
    );
    return response.data;
  } catch (error: any) {
    console.error("Upload API Error:", error);
    throw new Error(error.response?.data?.detail || "Upload failed");
  }
};

export const submitClaim = async (payload: any): Promise<any> => {
  try {
    const response = await apiClient.post("/submit-claim", payload);
    return response.data;
  } catch (error: any) {
    console.error("Submit API Error:", error);
    throw new Error(error.response?.data?.message || "Submission failed");
  }
};

export const fetchDashboardData = async (
  endpoint: string
): Promise<any> => {
  try {
    const response = await apiClient.get(endpoint);
    return response.data;
  } catch (error) {
    console.error(`Error fetching ${endpoint}:`, error);
    throw error;
  }
};

export const checkSyncStatus = async (runId: string): Promise<any> => {
  try {
    const response = await apiClient.get(`/check-sync/${runId}`);
    return response.data;
  } catch (error) {
    console.error("Sync Check Error:", error);
    throw error;
  }
};

export const fetchExchangeRates = async (): Promise<any> => {
  try {
    const response = await apiClient.get("/exchange-rates");
    return response.data;
  } catch (error) {
    console.error("Exchange Rates Error:", error);
    throw error;
  }
};
