import api from "./axiosConfig";

export const staffService = {
  async createStaff(payload) {
    const requestData = {
      firstName: payload.firstName,
      secondName: payload.secondName || null,
      lastName: payload.lastName,
      gender: payload.gender === 'Male',
      birthDate: payload.birthDate,
      clubID: payload.clubID,
      email: payload.email,
      password: payload.password,
      photo: payload.photo,
      phoneNumber: payload.phoneNumber,
      address: payload.address,
      primaryRoleID: payload.primaryRoleID,
      roleClassificationID: payload.roleClassificationID,
      categoriesIDs: payload.categoriesIDs,
      bloodTypeID: payload.bloodTypeID,
      allergies: payload.allergies || null,
      medicalNotes: payload.medicalNotes || null
    };

    return await api.post('/staff', requestData, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
};
