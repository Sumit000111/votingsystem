/**
 * Authentication UI Handler
 * Manages unified authentication form interactions
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

function setupFormListeners() {
  const authForm = document.getElementById('authForm');
  if (authForm) {
    authForm.addEventListener('submit', handleAuthSubmit);
  }
}

/**
 * Handle unified authentication submission
 */
async function handleAuthSubmit(e) {
  e.preventDefault();

  const aadhaar = document.getElementById('authAadhaar').value.trim();
  const voterNumber = document.getElementById('authVoterNumber').value.trim().toUpperCase();
  const phoneNumber = document.getElementById('authPhone').value.trim();
  const state = document.getElementById('authState').value.trim();

  // Validate inputs
  if (!aadhaar || !/^[0-9]{12}$/.test(aadhaar)) {
    showMessage('Aadhaar must be exactly 12 digits', 'danger');
    return;
  }
  if (!voterNumber) {
    showMessage('Voter Number is required', 'danger');
    return;
  }
  if (!phoneNumber || !/^[0-9]{10}$/.test(phoneNumber)) {
    showMessage('Mobile number must be exactly 10 digits', 'danger');
    return;
  }
  if (!state) {
    showMessage('Please select your state', 'danger');
    return;
  }

  const submitBtn = e.target.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Authenticating...';

  try {
    const response = await API.authenticate(aadhaar, voterNumber, phoneNumber, state);

    if (response.success) {
      


      localStorage.setItem('tempUserId', response.userId);
      localStorage.setItem('tempUsername', response.username);
      localStorage.setItem('tempState', response.state);

      showMessage('Identity matched! Proceeding to SMS Verification...', 'success');

      setTimeout(() => {
        window.location.href = 'otp.html';
      }, 1500);
    } else {
      showMessage(response.message || 'Authentication failed', 'danger');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Secure Login / Register';
    }
  } catch (error) {
    console.error('Authentication error:', error);
    showMessage(`Error: ${error.message}`, 'danger');
    submitBtn.disabled = false;
    submitBtn.textContent = 'Secure Login / Register';
  }
}

/**
 * Show message helper
 */
function showMessage(message, type = 'info') {
  const messageBox = document.getElementById('messageBox');
  if (!messageBox) return;

  messageBox.innerHTML = `<div class="alert alert-${type}">${message}</div>`;
  messageBox.classList.remove('hidden');
  messageBox.scrollIntoView({ behavior: 'smooth' });
}

/**
 * Logout
 */
function logout() {
  localStorage.removeItem('authToken');
  localStorage.removeItem('userId');
  localStorage.removeItem('username');
  window.location.href = 'index.html';
}
