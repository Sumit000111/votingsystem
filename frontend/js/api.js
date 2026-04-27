/**
 * API Helper Module
 * Handles all API calls to the backend server
 */

const API = {
  // Base URL for API calls dynamically resolves host for LAN testing
  BASE_URL: '/api',

  /**
   * Generic fetch wrapper for API calls
   */
  async request(endpoint, method = 'GET', data = null) {
    try {
      const options = {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
      };

      // Prioritize elevated Admin privileges on concurrent states
      const token = localStorage.getItem('adminToken') || localStorage.getItem('authToken');
      if (token) {
        options.headers['Authorization'] = `Bearer ${token}`;
      }

      if (data) {
        options.body = JSON.stringify(data);
      }

      const response = await fetch(`${this.BASE_URL}${endpoint}`, options);

      if (response.status === 401) {
        localStorage.removeItem('authToken');
        localStorage.removeItem('userId');
        localStorage.removeItem('username');
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  },

  // ==================== //
  // Authentication APIs
  // ==================== //

  /**
   * Unified Authentication (Login/Register)
   */
  authenticate(aadhaar, voterNumber, phoneNumber, state) {
    return this.request('/auth/authenticate', 'POST', {
      aadhaar,
      voterNumber,
      phoneNumber,
      state,
    });
  },

  verifyOTP(userId, otp) {
    return this.request('/auth/verify-otp', 'POST', { userId, otp });
  },

  resendOTP(userId) {
    return this.request('/auth/resend-otp', 'POST', { userId });
  },

  adminLogin(phoneNumber) {
    return this.request('/auth/admin-login', 'POST', { phoneNumber });
  },

  adminVerifyOTP(userId, otp) {
    return this.request('/auth/admin-verify-otp', 'POST', { userId, otp });
  },

  // ==================== //
  // Election APIs
  // ==================== //

  getElectionSettings() {
    return this.request('/elections/settings', 'GET');
  },

  getCandidatesByType(type, state) {
    let endpoint = `/elections/candidates?type=${type}`;
    if (state) endpoint += `&state=${state}`;
    return this.request(endpoint, 'GET');
  },

  // ==================== //
  // Voting APIs
  // ==================== //

  getCandidates() {
    return this.request('/voting/candidates', 'GET');
  },

  requestOTPForVoting() {
    return this.request('/voting/request-otp-for-voting', 'POST');
  },

  castVote(candidateSelected) {
    return this.request('/voting/vote', 'POST', { candidateSelected });
  },

  getResults() {
    return this.request('/voting/results', 'GET');
  },

  getVotingStatus() {
    return this.request('/voting/voting-status', 'GET');
  },

  getBlockchainInfo() {
    return this.request('/voting/blockchain-info', 'GET');
  },

  runDeepAudit() {
    return this.request('/voting/audit', 'GET');
  },
};

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = API;
}
