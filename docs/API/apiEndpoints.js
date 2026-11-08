/**
 * apiEndpoints.js - Centralized API Configuration
 * * This file maps every backend route to a frontend helper function.
 * Use these to make clean API calls without hardcoding URLs in your components.
 */

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const ROOT_URL = BASE_URL.replace(/\/api\/?$/, ''); // http://localhost:5000

export const API_ENDPOINTS = {
  // ============ AUTHENTICATION (6) ============
  auth: {
    register: () => `${BASE_URL}/auth/register`,
    login: () => `${BASE_URL}/auth/login`,
    me: () => `${BASE_URL}/auth/me`,
    refresh: () => `${BASE_URL}/auth/refresh`,
    logout: () => `${BASE_URL}/auth/logout`,
    changePassword: () => `${BASE_URL}/auth/change-password`,
  },

  // ============ GUESTS (6) ============
  guests: {
    getAll: (page = 1, limit = 20, filters = {}) => {
      const params = new URLSearchParams({ page, limit, ...filters });
      return `${BASE_URL}/guests?${params.toString()}`;
    },
    search: (query) => `${BASE_URL}/guests/search?query=${encodeURIComponent(query)}`,
    getById: (id) => `${BASE_URL}/guests/${encodeURIComponent(id)}`,
    create: () => `${BASE_URL}/guests`,
    update: (id) => `${BASE_URL}/guests/${encodeURIComponent(id)}`,
    delete: (id) => `${BASE_URL}/guests/${encodeURIComponent(id)}`,
  },

  // ============ STAFF (6) ============
  staff: {
    getProfile: () => `${BASE_URL}/staff/profile`,
    getAll: (filters = {}) => {
      const params = new URLSearchParams(filters);
      return `${BASE_URL}/staff?${params.toString()}`;
    },
    create: () => `${BASE_URL}/staff`,
    getById: (id) => `${BASE_URL}/staff/${encodeURIComponent(id)}`,
    update: (id) => `${BASE_URL}/staff/${encodeURIComponent(id)}`,
    getStats: () => `${BASE_URL}/staff/department/stats`,
  },

  // ============ ROOMS (8) ============
  rooms: {
    getAll: (filters = {}) => {
      const params = new URLSearchParams(filters);
      return `${BASE_URL}/rooms?${params.toString()}`;
    },
    getAvailable: (startDate, endDate, roomTypeId) => {
      const params = new URLSearchParams({
        start_date: startDate,
        end_date: endDate,
      });
      if (roomTypeId) params.append('room_type_id', roomTypeId);
      return `${BASE_URL}/rooms/available?${params.toString()}`;
    },
    getTypes: () => `${BASE_URL}/rooms/types`,
    getOccupancy: (startDate, endDate) =>
      `${BASE_URL}/rooms/occupancy?start_date=${encodeURIComponent(startDate)}&end_date=${encodeURIComponent(endDate)}`,
    getById: (id) => `${BASE_URL}/rooms/${encodeURIComponent(id)}`,
    create: () => `${BASE_URL}/rooms`,
    createType: () => `${BASE_URL}/rooms/types`,
    update: (id) => `${BASE_URL}/rooms/${encodeURIComponent(id)}`,
  },

  // ============ RESERVATIONS (9) ============
  reservations: {
    getAll: (filters = {}) => {
      const params = new URLSearchParams(filters);
      return `${BASE_URL}/reservations?${params.toString()}`;
    },
    getGuestReservations: (guestId) =>
      `${BASE_URL}/reservations/guest/${encodeURIComponent(guestId)}`,
    getById: (id) => `${BASE_URL}/reservations/${encodeURIComponent(id)}`,
    calculatePrice: () => `${BASE_URL}/reservations/calculate-price`,
    create: () => `${BASE_URL}/reservations`,
    update: (id) => `${BASE_URL}/reservations/${encodeURIComponent(id)}`,
    cancel: (id) => `${BASE_URL}/reservations/${encodeURIComponent(id)}/cancel`,
    checkIn: (id) => `${BASE_URL}/reservations/${encodeURIComponent(id)}/check-in`,
    checkOut: (id) => `${BASE_URL}/reservations/${encodeURIComponent(id)}/check-out`,
  },

  // ============ PAYMENTS (7) ============
  payments: {
    getAll: (filters = {}) => {
      const params = new URLSearchParams(filters);
      return `${BASE_URL}/payments?${params.toString()}`;
    },
    getReservationPayments: (reservationId) =>
      `${BASE_URL}/payments/reservation/${encodeURIComponent(reservationId)}`,
    getFinancialReport: (startDate, endDate) =>
      `${BASE_URL}/payments/financial-report?start_date=${encodeURIComponent(startDate)}&end_date=${encodeURIComponent(endDate)}`,
    getById: (id) => `${BASE_URL}/payments/${encodeURIComponent(id)}`,
    create: () => `${BASE_URL}/payments`,
    process: (id) => `${BASE_URL}/payments/${encodeURIComponent(id)}/process`,
    refund: (id) => `${BASE_URL}/payments/${encodeURIComponent(id)}/refund`,
  },

  // ============ REPORTS (4) ============
  reports: {
    daily: (date) => `${BASE_URL}/reports/daily?date=${encodeURIComponent(date)}`,
    weekly: (startDate) => `${BASE_URL}/reports/weekly?start_date=${encodeURIComponent(startDate)}`,
    monthly: (year, month) =>
      `${BASE_URL}/reports/monthly?year=${encodeURIComponent(year)}&month=${encodeURIComponent(month)}`,
    custom: (startDate, endDate, reportType) => {
      const params = new URLSearchParams({
        start_date: startDate,
        end_date: endDate,
        report_type: reportType,
      });
      return `${BASE_URL}/reports/custom?${params.toString()}`;
    },
  },

  // ============ AUDIT LOGS (3) ============
  audit: {
    getAll: (filters = {}) => {
      const params = new URLSearchParams(filters);
      return `${BASE_URL}/audit?${params.toString()}`;
    },
    getRecent: (limit = 10) => `${BASE_URL}/audit/recent?limit=${limit}`,
    getRecordHistory: (table, id) => `${BASE_URL}/audit/record/${table}/${id}`
  },

  // ============ MAIN SYSTEM LINKS ============
  system: {
    health: () => `${BASE_URL}/health`,
    metrics: () => `${BASE_URL}/metrics`,
    apiDocs: () => `${ROOT_URL}/api-docs`,
    root: () => ROOT_URL
  },
};

export default API_ENDPOINTS;