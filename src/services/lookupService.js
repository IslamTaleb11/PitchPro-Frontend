import api from './axiosConfig';

export const lookupService = {
  getBloodTypes() {
    return api.get('/lookups/bloodtypes');
  },

  getPrimaryRoles() {
    return api.get('/lookups/primaryroles');
  },

  getRoleClassifications() {
    return api.get('/lookups/classifications');
  },

  getCategories(clubID) {
    return api.get(`/lookups/categories`);
  },

  getPositions() {
    return api.get('/lookups/positions');
  },

  getPreferredFeet() {
    return api.get('/lookups/feet');
  },

  getSessionTypes() {
    return api.get('/lookups/sessiontypes');
  }
};
