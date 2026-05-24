import api from './axiosConfig';

export const scheduleService = {
  getUpcoming(pageNumber = 1, pageSize = 10, eventClassification = null, category = null) {
    const params = { pageNumber, pageSize };
    if (eventClassification) params.eventClassification = eventClassification;
    if (category) params.category = category;
    return api.get('/lookups/upcoming-schedule', { params });
  }
};
