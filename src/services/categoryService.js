import api from "./axiosConfig";

export const categoryService = {
  async getAllCategories(pageNumber = 1, pageSize = 10) {
    return await api.get('/dashboard/category', {
      params: {
        pageNumber,
        pageSize
      }
    });
  },

  async createCategory(payload) {
    return await api.post('/dashboard/category', payload);
  },

  async updateCategory(id, payload) {
    return await api.put('/dashboard/category', { ...payload, id });
  },

  async deleteCategory(id) {
    return await api.delete(`/dashboard/category/${id}`);
  }
};
