import api from './axiosConfig';

export const trainingService = {
  createSession(data) {
    return api.post('/training-sessions', data);
  },
  updateSession(data) {
    return api.put('/training-sessions', data);
  },
  // Get training sessions by category.
  // POST /api/training-sessions/by-category?categoryId={categoryId}
  // -> { data: [ { id, date, sessionTypeName, focusArea, duration, playersAttended, status } ] }
  getSessionsByCategory(categoryId) {
    return api.post('/training-sessions/by-category', null, { params: { categoryId } });
  }
};
