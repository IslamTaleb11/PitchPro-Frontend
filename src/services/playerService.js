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

  // Fetch the full detail of a single player (used to prefill the update form).
  // GET /api/players/{id} -> { data: { id, firstName, secondName, lastName, gender, birthDate, photo, primaryPositionID, secondaryPositionID, preferredFootID, jerseyNumber, address, categoryID, bloodTypeID, allergies, medicalNotes, phone, email, guardianFullName, guardianPhone, isMinor } }.
  getPlayerById(playerId) {
    return api.get(`/players/${playerId}`);
  },

  // Update a player's full dossier. `payload` must carry the same fields the
  // create form sends; `photo` is optional — omit it to keep the current picture.
  // PUT /api/players/{id} (multipart/form-data).
  updatePlayer(playerId, payload) {
    const formData = new FormData();
    formData.append('ID', String(playerId));
    formData.append('FirstName', payload.firstName);
    if (payload.secondName) formData.append('SecondName', payload.secondName);
    formData.append('LastName', payload.lastName);
    formData.append('Gender', payload.gender === 'Male' ? 'true' : 'false');
    formData.append('BirthDate', payload.birthDate);
    formData.append('ClubID', String(payload.clubID));

    if (payload.photo) formData.append('Photo', payload.photo);
    formData.append('PrimaryPositionID', String(payload.primaryPositionID));
    if (payload.secondaryPositionID) formData.append('SecondaryPositionID', String(payload.secondaryPositionID));
    formData.append('PreferredFootID', String(payload.preferredFootID));
    formData.append('JerseyNumber', String(payload.jerseyNumber));
    formData.append('Address', payload.address || '');
    formData.append('CategoryID', String(payload.categoryID));

    formData.append('BloodTypeID', String(payload.bloodTypeID));
    if (payload.allergies) formData.append('Allergies', payload.allergies);
    if (payload.medicalNotes) formData.append('MedicalNotes', payload.medicalNotes);

    if (payload.isMinor) {
      if (payload.guardianFullName) formData.append('GuardianFullName', payload.guardianFullName);
      if (payload.guardianPhone) formData.append('GuardianPhone', payload.guardianPhone);
    } else {
      if (payload.phone) formData.append('Phone', payload.phone);
      if (payload.email) formData.append('Email', payload.email);
    }

    return api.put(`/players/${playerId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },

  // Soft-delete a player (is_active = 0). DELETE /api/players/{id}.
  deletePlayer(playerId) {
    return api.delete(`/players/${playerId}`);
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
