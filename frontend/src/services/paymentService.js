import apiClient from './api';

class PaymentService {
  /**
   * Get all payments (supports filtering)
   * Corresponds to: GET /api/payments
   */
  static async getPayments(params = {}) {
    try {
      const response = await apiClient.get('/payments', { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get payments for a specific reservation
   * FIX: Renamed from getPaymentSummary to match Component call
   * Corresponds to: GET /api/payments/reservation/:id
   */
  static async getReservationPayments(reservationId) {
    try {
      const response = await apiClient.get(`/payments/reservation/${reservationId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Create a new payment
   * Corresponds to: POST /api/payments
   */
  static async createPayment(data) {
    try {
      const response = await apiClient.post('/payments', data);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Process a payment (Mark as Completed)
   * Corresponds to: PUT /api/payments/:id/process
   */
  static async processPayment(id, transactionId = null) {
    try {
      const response = await apiClient.put(`/payments/${id}/process`, { transaction_id: transactionId });
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Process a refund
   * FIX: Updated signature to accept a data object { reason: '...' }
   * Corresponds to: PUT /api/payments/:id/refund
   */
  static async processRefund(id, data) {
    try {
      // data should be { reason: "Customer requested..." }
      const response = await apiClient.put(`/payments/${id}/refund`, data);
      return response.data;
    } catch (error) {
      throw error;
    }
  }
}

export default PaymentService;





// import apiClient from './api';

// class PaymentService {
//   /**
//    * Get all payments (supports filtering by reservation_id)
//    * Corresponds to: GET /api/payments
//    */
//   static async getPayments(params = {}) {
//     try {
//       const response = await apiClient.get('/payments', { params });
//       return response.data;
//     } catch (error) {
//       throw error;
//     }
//   }

//   /**
//    * Get payment summary (Total Paid, etc.)
//    * Corresponds to: GET /api/payments/reservation/:id
//    */
//   static async getPaymentSummary(reservationId) {
//     try {
//       const response = await apiClient.get(`/payments/reservation/${reservationId}`);
//       return response.data;
//     } catch (error) {
//       throw error;
//     }
//   }

//   /**
//    * Create a new payment
//    * Corresponds to: POST /api/payments
//    */
//   static async createPayment(data) {
//     try {
//       const response = await apiClient.post('/payments', data);
//       return response.data;
//     } catch (error) {
//       throw error;
//     }
//   }

//   /**
//    * Process a payment (Mark as Completed)
//    * Corresponds to: PUT /api/payments/:id/process
//    */
//   static async processPayment(id, transactionId = null) {
//     try {
//       const response = await apiClient.put(`/payments/${id}/process`, { transaction_id: transactionId });
//       return response.data;
//     } catch (error) {
//       throw error;
//     }
//   }

//   /**
//    * Process a refund
//    * Corresponds to: PUT /api/payments/:id/refund
//    */
//   static async processRefund(id, amount, reason) {
//     try {
//       const response = await apiClient.put(`/payments/${id}/refund`, { 
//         refund_amount: amount, 
//         reason: reason 
//       });
//       return response.data;
//     } catch (error) {
//       throw error;
//     }
//   }
// }

// export default PaymentService;
