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
  }
};
