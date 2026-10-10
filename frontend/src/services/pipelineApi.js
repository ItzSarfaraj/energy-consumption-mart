import api from "./api";

export const getPipelineStatus = async () => {
  const response = await api.get("/api/pipeline/status");
  return response.data;
};

export const runPipeline = async () => {
  const response = await api.post("/api/pipeline/run");
  return response.data;
};