import api from "./axiosConfig";

export const staffService = {
  async createStaff(payload) {
    const formData = new FormData();
    formData.append("FirstName", payload.firstName);
    if (payload.secondName) formData.append("SecondName", payload.secondName);
    formData.append("LastName", payload.lastName);
    formData.append("Gender", payload.gender === 'Male' ? "true" : "false");
    formData.append("BirthDate", payload.birthDate);
    formData.append("ClubID", payload.clubID);
    formData.append("Email", payload.email);
    formData.append("Password", payload.password);
    
    if (payload.photo) formData.append("Photo", payload.photo);
    if (payload.phoneNumber) formData.append("PhoneNumber", payload.phoneNumber);
    if (payload.address) formData.append("Address", payload.address);
    
    formData.append("PrimaryRoleID", payload.primaryRoleID);
    formData.append("RoleClassificationID", payload.roleClassificationID);
    
    if (payload.categoriesIDs && payload.categoriesIDs.length) {
      payload.categoriesIDs.forEach(id => {
        formData.append("CategoriesIDs", id);
      });
    }
    
    formData.append("BloodTypeID", payload.bloodTypeID);
    if (payload.allergies) formData.append("Allergies", payload.allergies);
    if (payload.medicalNotes) formData.append("MedicalNotes", payload.medicalNotes);

    return await api.post('/staff', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
  },
  async getStaffCounts() {
    return await api.get('/staff/counts');
  },
  async getAllStaff(pageNumber = 1, pageSize = 10) {
    return await api.get('/staff/all', {
      params: {
        pageNumber,
        pageSize
      }
    });
  },
  async getStaffByFilter({ pageNumber = 1, pageSize = 100, primaryRoleId, roleClassificationId, categoryIds }) {
    return await api.get('/staff/filter', {
      params: {
        pageNumber,
        pageSize,
        ...(primaryRoleId != null && { primaryRoleId }),
        ...(roleClassificationId != null && { roleClassificationId }),
        ...(categoryIds && categoryIds.length && { categoryIds })
      },
      paramsSerializer: {
        indexes: null
      }
    });
  }
};
