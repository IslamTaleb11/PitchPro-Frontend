import api from './axiosConfig';

export const playerService = {
  createPlayer(formData) {
    return api.post('/players', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },

  // Fetch every player that belongs to a given squad category.
  getPlayersByCategory(categoryId) {
    return api.get(`/players/by-category/${categoryId}`);
  }
};
