import apiClient from './api';

class AuditService {
  /**
   * Get all audit logs with filters
   * URL: /api/audit?page=1&limit=50...
   */
  static async getLogs(params = {}) {
    try {
      const response = await apiClient.get('/audit', { params });
      return response.data; // Returns { success: true, data: { auditLogs: [], pagination: {} } }
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get specific record history
   */
  static async getRecordHistory(table, id) {
    try {
      const response = await apiClient.get(`/audit/record/${table}/${id}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  }
}

export default AuditService;
