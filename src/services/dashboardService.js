import api from "./axiosConfig";

export const dashboardService = {
  async getCounts() {
    return await api.get("/dashboard/counts");
  }
};
