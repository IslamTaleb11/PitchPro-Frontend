import api from "./axiosConfig";

export const categoryService = {
  async getAllCategories(pageNumber = 1, pageSize = 10) {
    return await api.get('/categories', {
      params: {
        pageNumber,
        pageSize
      }
    });
  },

  async createCategory(payload) {
    return await api.post('/categories', payload);
  },

  async updateCategory(id, payload) {
    return await api.put(`/categories/${id}`, payload);
  },

  async deleteCategory(id) {
    return await api.delete(`/categories/${id}`);
  }
};
