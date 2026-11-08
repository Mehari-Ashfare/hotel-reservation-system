/**
 * reportService.js - Analytics and Reporting
 * Fetches dashboard statistics and specific reports.
 */
import apiClient from './api';

class ReportService {
  /**
   * Get Daily Stats (for Dashboard)
   * Fetches summary of today's activity
   */
  static async getDailyStats() {
    try {
      // We will use the daily report endpoint we defined in the backend
      const response = await apiClient.get('/reports/daily');
      return response.data;
    } catch (error) {
      console.error("Error fetching daily stats:", error);
      // Fallback data so the dashboard doesn't crash if backend is empty
      return {
        total_bookings: 0,
        total_guests: 0,
        total_revenue: 0,
        occupancy_rate: 0
      };
    }
  }

  /**
   * Get Weekly Report
   */
  static async getWeeklyStats() {
    try {
      const response = await apiClient.get('/reports/weekly');
      return response.data;
    } catch (error) {
      console.error("Error fetching weekly stats:", error);
      throw error;
    }
  }
}

export default ReportService;