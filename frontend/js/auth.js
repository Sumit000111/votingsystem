/**
 * Authentication UI Handler
 * Manages login and registration form interactions
 */

// Initialize page on load
window.addEventListener('load', function () {
  const token = localStorage.getItem('authToken');

  // If user is already logged in, redirect to voting page
  if (token && window.location.pathname.includes('index.html')) {
    window.location.href = 'voting.html';
  }

  // Set up form event listeners
  setupFormListeners();
});

/**
 * Set up event listeners for forms
 */
function setupFormListeners() {
  const loginForm = document.getElementById('loginForm');

  if (loginForm) {
    loginForm.addEventListener('submit', handleLogin);
  }
}

/**
 * Handle login form submission
 * @param {Event} e - Form submission event
 */
async function handleLogin(e) {
  e.preventDefault();

  const aadhaar = document.getElementById('loginAadhaar').value.trim();
  const pan = document.getElementById('loginPan').value.trim().toUpperCase();
  const state = document.getElementById('loginState').value.trim();

  // Validate inputs
  if (!validateInputs({ aadhaar, pan, state })) {
    return;
  }

  // Disable submit button
  const submitBtn = e.target.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Logging in...';

  try {
    const response = await API.login(aadhaar, pan, state);

    if (response.success) {
      // Store authentication data
      localStorage.setItem('authToken', response.token);
      localStorage.setItem('userId', response.userId);
      localStorage.setItem('username', response.username);
      localStorage.setItem('state', response.state);

      showMessage('Login successful! Redirecting to voting...', 'success');

      // Redirect to voting page (no OTP here)
      setTimeout(() => {
        window.location.href = 'voting.html';
      }, 1500);
    } else {
      showMessage(response.message || 'Login failed', 'danger');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Login';
    }
  } catch (error) {
    console.error('Login error:', error);
    showMessage(`Error: ${error.message}`, 'danger');
    submitBtn.disabled = false;
    submitBtn.textContent = 'Login';
  }
}

/**
 * Handle registration form submission
 * @param {Event} e - Form submission event
 */
async function handleRegister(e) {
  // Registration disabled - login only mode
  console.log('Registration disabled. Use login only.');
}

/**
 * Validate input fields
 * @param {object} inputs - Input values to validate
 * @returns {boolean} - True if valid, false otherwise
 */
function validateInputs(inputs) {
  const { aadhaar, pan, state } = inputs;

  // Validate Aadhaar (12 digits)
  if (!aadhaar || !/^[0-9]{12}$/.test(aadhaar)) {
    showMessage('Aadhaar must be exactly 12 digits', 'danger');
    return false;
  }

  // Validate PAN (standard format)
  if (!pan || !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(pan)) {
    showMessage('PAN format invalid. Example: ABCDE1234F', 'danger');
    return false;
  }

  // Validate state
  if (!state) {
    showMessage('Please select your state', 'danger');
    return false;
  }

  return true;
}

/**
 * Show message to user
 * @param {string} message - Message text
 * @param {string} type - Message type: 'success', 'danger', 'info', 'warning'
 */
function showMessage(message, type = 'info') {
  const messageBox = document.getElementById('messageBox');
  if (!messageBox) return;

  messageBox.innerHTML = `<div class="alert alert-${type}">${message}</div>`;
  messageBox.classList.remove('hidden');
  messageBox.scrollIntoView({ behavior: 'smooth' });
}

/**
 * Logout user
 */
function logout() {
  localStorage.removeItem('authToken');
  localStorage.removeItem('userId');
  localStorage.removeItem('username');
  window.location.href = 'index.html';
}
