/**
 * API Helper Module
 * Handles all API calls to the backend server
 */

const API = {
  // Base URL for API calls (adjust if your backend runs on a different port)
  BASE_URL: 'http://localhost:5000/api',

  /**
   * Generic fetch wrapper for API calls
   * @param {string} endpoint - API endpoint
   * @param {string} method - HTTP method (GET, POST, etc.)
   * @param {object} data - Request body data
   * @returns {Promise} - Response data
   */
  async request(endpoint, method = 'GET', data = null) {
    try {
      const options = {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
      };

      // Add Authorization token if exists
      const token = localStorage.getItem('authToken');
      if (token) {
        options.headers['Authorization'] = `Bearer ${token}`;
      }

      // Add request body for POST, PUT, PATCH requests
      if (data) {
        options.body = JSON.stringify(data);
      }

      const response = await fetch(`${this.BASE_URL}${endpoint}`, options);

      // Handle unauthorized access
      if (response.status === 401) {
        localStorage.removeItem('authToken');
        localStorage.removeItem('userId');
        localStorage.removeItem('username');
        // Optionally redirect to login
        // window.location.href = '/index.html';
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
   * Register a new user
   * @param {string} aadhaar - 12-digit Aadhaar number
   * @param {string} pan - PAN number
   * @param {string} username - Username
   * @param {string} password - Password
   * @param {string} confirmPassword - Password confirmation
   */
  register(aadhaar, pan, username, password, confirmPassword) {
    return this.request('/auth/register', 'POST', {
      aadhaar,
      pan,
      username,
      password,
      confirmPassword,
    });
  },

  /**
   * Login with credentials
   * @param {string} aadhaar - 12-digit Aadhaar number
   * @param {string} pan - PAN number
   * @param {string} state - Selected state
   */
  login(aadhaar, pan, state) {
    return this.request('/auth/login', 'POST', {
      aadhaar,
      pan,
      state,
    });
  },

  /**
   * Verify OTP
   * @param {string} userId - User ID
   * @param {string} otp - One-Time Password
   */
  verifyOTP(userId, otp) {
    return this.request('/auth/verify-otp', 'POST', {
      userId,
      otp,
    });
  },

  /**
   * Resend OTP
   * @param {string} userId - User ID
   */
  resendOTP(userId) {
    return this.request('/auth/resend-otp', 'POST', {
      userId,
    });
  },

  // ==================== //
  // Election APIs
  // ==================== //

  /**
   * Get election settings (national/state elections enabled)
   */
  getElectionSettings() {
    return this.request('/elections/settings', 'GET');
  },

  /**
   * Get candidates for election type
   * @param {string} type - 'national' or 'state'
   * @param {string} state - User's state (for state elections)
   */
  getCandidatesByType(type, state) {
    let endpoint = `/elections/candidates?type=${type}`;
    if (state) {
      endpoint += `&state=${state}`;
    }
    return this.request(endpoint, 'GET');
  },

  // ==================== //
  // Voting APIs
  // ==================== //

  /**
   * Get list of candidates
   */
  getCandidates() {
    return this.request('/voting/candidates', 'GET');
  },

  /**
   * Request OTP for voting
   * Generates OTP before user can cast vote
   */
  requestOTPForVoting() {
    return this.request('/voting/request-otp-for-voting', 'POST');
  },

  /**
   * Cast a vote
   * @param {string} candidateSelected - Name of selected candidate
   */
  castVote(candidateSelected) {
    return this.request('/voting/vote', 'POST', {
      candidateSelected,
    });
  },

  /**
   * Get voting results
   */
  getResults() {
    return this.request('/voting/results', 'GET');
  },

  /**
   * Get current user's voting status
   */
  getVotingStatus() {
    return this.request('/voting/voting-status', 'GET');
  },

  /**
   * Get blockchain information
   */
  getBlockchainInfo() {
    return this.request('/voting/blockchain-info', 'GET');
  },
};

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = API;
}
