import apiClient from './api';

class DashboardService {
  static async getSummary() {
    const response = await apiClient.get('/dashboard/summary');
    return response.data;
  }

  static async getRevenueChart() {
    const response = await apiClient.get('/dashboard/revenue-chart');
    return response.data;
  }
}

export default DashboardService;






// import apiClient from './api';

// class DashboardService {
//   static async getStats() {
//     try {
//       const response = await apiClient.get('/dashboard');
//       return response.data;
//     } catch (error) {
//       console.error("Dashboard Error:", error);
//       throw error;
//     }
//   }
// }

// export default DashboardService;
