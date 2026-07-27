import api from './axiosConfig';

export const trainingService = {
  createSession(data) {
    return api.post('/training-sessions', data);
  },
  updateSession(data) {
    return api.put('/training-sessions', data);
  },
  // Get training sessions by category.
  // GET /api/training-sessions/by-category/{categoryId}
  // -> { data: [ { id, date, sessionTypeName, focusArea, duration, playersAttended, status } ] }
  getSessionsByCategory(categoryId) {
    return api.get(`/training-sessions/by-category/${categoryId}`);
  },

  // Get non-injured players in a category for training session attendance.
  // GET /api/training-sessions/players/{categoryId}
  // -> { data: [ { playerID, playerName, jerseyNumber, positionName, playerImage } ] }
  getPlayersByCategory(categoryId) {
    return api.get(`/training-sessions/players/${categoryId}`);
  }
};
