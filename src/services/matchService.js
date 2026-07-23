import api from './axiosConfig';

export const matchService = {
  createMatch(data) {
    return api.post('/matches', data);
  },
  updateMatch(data) {
    return api.put('/matches', data);
  },
  // Get the next upcoming match for a squad category.
  // GET /api/matches/upcoming/{categoryId}
  getUpcomingMatch(categoryId) {
    return api.get(`/matches/upcoming/${categoryId}`);
  },

  // Enrol one or more players into a match call-up.
  // POST /api/match-callup-players  body: { MatchID, CategoryID, PlayerIDs }
  addCallUpPlayers(payload) {
    return api.post('/match-callup-players', payload);
  },

  // How many players are already called up for a match.
  // GET /api/match-callup-players/count/{matchId} -> { matchId, count }
  getCallUpCount(matchId) {
    return api.get(`/match-callup-players/count/${matchId}`);
  },

  // Remove every player from a match's call-up.
  // DELETE /api/match-callup-players/{matchId} -> { matchId, removed, message }
  resetCallUp(matchId) {
    return api.delete(`/match-callup-players/${matchId}`);
  },

  // Mark attendance for players in a match.
  // POST /api/match-attendance  body: { matchID, playersAttendance: { [playerId]: bool } }
  markAttendance(payload) {
    return api.post('/match-attendance', payload);
  }
};
