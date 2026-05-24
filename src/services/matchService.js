import api from './axiosConfig';

export const matchService = {
  createMatch(data) {
    return api.post('/matches', data);
  },
  updateMatch(data) {
    return api.put('/matches', data);
  }
};
