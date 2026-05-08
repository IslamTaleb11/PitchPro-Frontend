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
    return api.get('/lookups/categories', {
      params: {
        clubID
      }
    });
  }
};
