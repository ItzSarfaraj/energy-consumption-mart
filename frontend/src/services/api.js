
import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 10000,
});

export const getOverview = async () => {
  const response = await api.get("/api/overview");
  return response.data;
};

export const getHourly = async (params = {}) => {
  const response = await api.get("/api/hourly", { params });
  return response.data;
};

export const getDaily = async (params = {}) => {
  const response = await api.get("/api/daily", { params });
  return response.data;
};




export const getAIInsights = async (forceRefresh = false) => {
  const response = await api.get("/api/ai/insights", {
    params: {
      force_refresh: forceRefresh,
    },
    timeout: 120000,
  });

  return response.data;
};




export default api;
