import api from "./axiosConfig";

export const clubService = {
  async completeRegistration(payload) {
    const requestData = {
      name: payload.name,
      crest: payload.crest,
      primaryIdentityColor: payload.primaryIdentityColor,
      contactNumber: payload.contactNumber,
      firstName: payload.firstName,
      secondName: payload.secondName || null,
      lastName: payload.lastName,
      gender: payload.gender === 'male',
      birthDate: payload.birthDate,
      email: payload.email,
      password: payload.password
    };

    return await api.post('/club', requestData, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
};