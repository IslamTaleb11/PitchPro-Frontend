import api from './axiosConfig';

export const trainingService = {
  createSession(data) {
    return api.post('/training-sessions', data);
  },
  updateSession(data) {
    return api.put('/training-sessions', data);
  }
};
