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
  },

  // Fetch players called up for a match by squad category & match.
  // GET /api/players/match-call-up/{categoryId}/{matchID} -> { data: [ { playerID, playerName, playerImage, jerseyNumber, positionName, isAlreadyAttended } ] }
  getMatchCallUpPlayersByCategory(categoryId, matchId) {
    return api.get(`/players/match-call-up/${categoryId}/${matchId}`);
  },

  // Fetch available players for call-up by category & match.
  // GET /api/players/available/{categoryId}/{matchId} -> { data: [ { playerID, playerName, playerImage, jerseyNumber, positionName, isAlreadyAttended } ] }
  getAvailablePlayersByCategoryAndMatch(categoryId, matchId) {
    return api.get(`/players/available/${categoryId}/${matchId}`);
  },

  // Record a new player injury. `payload` must match the backend
  // PlayerInjuryRegistrationRequestDTO (PlayerMedicalDossierID, BodyPart,
  // Severity, Status, InjuryDate, EstimatedReturnDate).
  recordPlayerInjury(payload) {
    return api.post('/player-injuries', payload);
  },

  // Get every injury for players in a squad category.
  // GET /api/player-injuries/by-category/{categoryId} -> { data: [...] }.
  getInjuriesByCategory(categoryId) {
    return api.get(`/player-injuries/by-category/${categoryId}`);
  },

  // Mark an injury as recovered (deactivates the record).
  // PATCH /api/player-injuries/{injuryId}/recover
  recoverInjury(injuryId) {
    return api.patch(`/player-injuries/${injuryId}/recover`);
  }
};
