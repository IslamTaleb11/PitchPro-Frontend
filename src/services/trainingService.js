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

  // Get non-injured players in a category for training session attendance,
  // including their isAttended status for the given session.
  // GET /api/training-sessions/players/{categoryId}/{trainingSessionId}
  // -> { data: [ { playerID, playerName, jerseyNumber, positionName, playerImage, isAttended } ] }
  getPlayersByCategory(categoryId, trainingSessionId) {
    return api.get(`/training-sessions/players/${categoryId}/${trainingSessionId}`);
  },

  // Mark attendance for a training session.
  // POST /api/training-attendance
  // Body: { trainingSessionID, playersAttendance: { [playerId]: bool } }
  // -> { message, attendanceIds }
  saveAttendance(trainingSessionId, playersAttendance) {
    return api.post('/training-attendance', {
      trainingSessionID: trainingSessionId,
      playersAttendance
    });
  },

  // Mark a training session as completed.
  // PUT /api/training-sessions/complete
  // Body: { id: trainingSessionId }
  completeSession(trainingSessionId) {
    return api.put('/training-sessions/complete', { id: trainingSessionId });
  }
};
