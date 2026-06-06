import api from './axiosConfig';

export const paymentService = {
  async createCheckout(payload) {
    return await api.post('/payment/checkout', payload, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
};
