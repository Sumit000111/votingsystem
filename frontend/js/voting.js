/**
 * Voting Dashboard Handler
 * Manages candidate display and vote submission
 */

let selectedCandidate = null;
let currentElectionType = 'national'; // Default to national
let userState = null;

// Initialize page on load
window.addEventListener('load', async function () {
  const token = localStorage.getItem('authToken');
  const userId = localStorage.getItem('userId');
  const username = localStorage.getItem('username');
  userState = localStorage.getItem('state');

  // Redirect to login if not authenticated
  if (!token || !userId) {
    window.location.href = 'index.html';
    return;
  }

  // Display username
  document.getElementById('userInfo').textContent = `Logged in as: ${username} (${userState})`;

  // Load election settings to determine which tabs to show
  await loadElectionSettings();

  // Load voting status and candidates
  await loadVotingStatus();
  await loadCandidates();
  await loadResults();
});

/**
 * Load election settings to determine enabled elections
 */
async function loadElectionSettings() {
  try {
    const response = await API.getElectionSettings();

    if (response.success) {
      const { nationalElectionEnabled, stateElectionEnabled } = response;
      const tabsContainer = document.getElementById('electionTabsContainer');
      const nationalTab = document.getElementById('nationalTab');
      const stateTab = document.getElementById('stateTab');

      // Show tabs container if any election is enabled
      if (nationalElectionEnabled || stateElectionEnabled) {
        tabsContainer.style.display = 'block';
      }

      // Hide/disable tabs based on what's enabled by admin
      if (!nationalElectionEnabled) {
        nationalTab.disabled = true;
        nationalTab.style.color = '#d1d5db';
        nationalTab.style.cursor = 'not-allowed';
      }

      if (!stateElectionEnabled) {
        stateTab.disabled = true;
        stateTab.style.color = '#d1d5db';
        stateTab.style.cursor = 'not-allowed';
      }

      // Set default to national if enabled, otherwise state
      if (nationalElectionEnabled) {
        currentElectionType = 'national';
      } else if (stateElectionEnabled) {
        currentElectionType = 'state';
      }
    }
  } catch (error) {
    console.error('Error loading election settings:', error);
    // Continue anyway - assume national election is enabled
    currentElectionType = 'national';
  }
}

/**
 * Switch between election types (national/state)
 * @param {string} type - Election type ('national' or 'state')
 */
function switchElection(type) {
  const tab = document.getElementById(type === 'national' ? 'nationalTab' : 'stateTab');
  
  // Don't switch if tab is disabled
  if (tab.disabled) {
    showMessage('This election type is not currently enabled', 'warning');
    return;
  }

  currentElectionType = type;

  // Update tab styling
  const nationalTab = document.getElementById('nationalTab');
  const stateTab = document.getElementById('stateTab');

  if (type === 'national') {
    nationalTab.style.color = '#2563eb';
    nationalTab.style.borderBottomColor = '#2563eb';
    stateTab.style.color = '#9ca3af';
    stateTab.style.borderBottomColor = 'transparent';
  } else {
    nationalTab.style.color = '#9ca3af';
    nationalTab.style.borderBottomColor = 'transparent';
    stateTab.style.color = '#2563eb';
    stateTab.style.borderBottomColor = '#2563eb';
  }

  // Reset selected candidate and vote button
  selectedCandidate = null;
  document.getElementById('voteButton').disabled = true;
  document.querySelectorAll('.candidate-card').forEach(card => {
    card.classList.remove('selected');
    card.style.borderColor = '#e5e7eb';
    card.style.backgroundColor = 'white';
  });

  // Load candidates for selected election type
  loadCandidates();
}


/**
 * Load and display voting status
 */
async function loadVotingStatus() {
  try {
    const response = await API.getVotingStatus();

    if (response.success) {
      const votingSection = document.getElementById('votingSection');
      const alreadyVotedBox = document.getElementById('alreadyVotedBox');
      const resultsSection = document.getElementById('resultsSection');
      const statusDiv = document.getElementById('votingStatus');
      const statusMessage = document.getElementById('statusMessage');

      if (response.hasVoted) {
        // User has already voted
        statusDiv.textContent = '✓ Voted';
        statusDiv.style.color = '#16a34a';
        statusMessage.textContent = `You voted for: ${response.votedFor}`;

        votingSection.classList.add('hidden');
        alreadyVotedBox.classList.remove('hidden');
        resultsSection.classList.remove('hidden');
      } else {
        // User can vote
        statusDiv.textContent = 'Ready to Vote';
        statusDiv.style.color = '#2563eb';
        statusMessage.textContent = 'Select a candidate and submit your vote';

        votingSection.classList.remove('hidden');
        alreadyVotedBox.classList.add('hidden');
        resultsSection.classList.add('hidden');
      }
    }
  } catch (error) {
    console.error('Error loading voting status:', error);
    showMessage('Error loading voting status', 'danger');
  }
}

/**
 * Load and display candidates
 */
async function loadCandidates() {
  try {
    // Use the new getCandidatesByType API that filters by election type and state
    const response = await API.getCandidatesByType(currentElectionType, userState);

    if (response.success) {
      displayCandidates(response.candidates);
    } else {
      showMessage('Failed to load candidates', 'danger');
    }
  } catch (error) {
    console.error('Error loading candidates:', error);
    showMessage('Error loading candidates', 'danger');
  }
}

/**
 * Display candidates on the page
 * @param {Array} candidates - List of candidates
 */
function displayCandidates(candidates) {
  const container = document.getElementById('candidatesContainer');

  container.innerHTML = candidates
    .map(
      (candidate) => `
    <div class="candidate-card" onclick="selectCandidate(this, '${candidate.name}')" style="display: flex; align-items: center; gap: 15px; padding: 12px 16px; border: 2px solid #e5e7eb; border-radius: 6px; cursor: pointer; transition: all 0.3s ease; background: white">
      <input
        type="radio"
        name="candidate"
        value="${candidate.name}"
        style="width: 20px; height: 20px; cursor: pointer; flex-shrink: 0"
      />
      <div style="flex-grow: 1">
        <div style="font-weight: 600; color: #1f2937; margin-bottom: 3px">${candidate.name}</div>
        <div style="font-size: 13px; color: #6b7280">${candidate.symbol} ${candidate.party}</div>
      </div>
    </div>
  `
    )
    .join('');
}

/**
 * Handle candidate selection
 * @param {HTMLElement} element - Clicked card element
 * @param {string} candidateName - Name of selected candidate
 */
function selectCandidate(element, candidateName) {
  // Remove selected class from all cards
  document
    .querySelectorAll('.candidate-card')
    .forEach((card) => {
      card.classList.remove('selected');
      card.style.borderColor = '#e5e7eb';
      card.style.backgroundColor = 'white';
    });

  // Add selected style to clicked card
  element.classList.add('selected');
  element.style.borderColor = '#2563eb';
  element.style.backgroundColor = '#f0f9ff';

  // Update selected candidate
  selectedCandidate = candidateName;

  // Enable vote button
  const voteButton = document.getElementById('voteButton');
  voteButton.disabled = false;

  // Check the radio button
  const radio = element.querySelector('input[type="radio"]');
  if (radio) {
    radio.checked = true;
  }
}

/**
 * Submit vote - Request OTP first, then show modal
 */
async function submitVote() {
  if (!selectedCandidate) {
    showMessage('Please select a candidate first', 'warning');
    return;
  }

  try {
    // Request OTP from backend
    const response = await API.requestOTPForVoting();

    if (!response.success) {
      showMessage(response.message || 'Failed to request OTP', 'danger');
      return;
    }

    // Show OTP modal after OTP is generated
    showOtpModal(selectedCandidate);
    showMessage('OTP sent to your registered contact. Demo OTP: 111111', 'info');
  } catch (error) {
    console.error('Error requesting OTP:', error);
    showMessage('Error requesting OTP. Please try again.', 'danger');
  }
}

/**
 * Show OTP modal for vote verification
 * @param {string} candidateName - Name of selected candidate
 */
function showOtpModal(candidateName) {
  document.getElementById('otpCandidateName').textContent = candidateName;
  document.getElementById('otpInput').value = '';
  document.getElementById('otpError').style.display = 'none';
  document.getElementById('otpInput').focus();
  document.getElementById('otpModal').style.display = 'flex';
}

/**
 * Close OTP modal
 */
function closeOtpModal() {
  document.getElementById('otpModal').style.display = 'none';
  document.getElementById('otpInput').value = '';
}

/**
 * Handle OTP input - submit when 6 digits entered
 * @param {KeyboardEvent} event - Keyboard event
 */
function handleOtpInput(event) {
  const input = document.getElementById('otpInput');
  const otpValue = input.value;

  // Only allow digits
  if (!/^\d*$/.test(otpValue)) {
    input.value = otpValue.replace(/[^\d]/g, '');
    return;
  }

  // Auto-submit when 6 digits entered
  if (otpValue.length === 6) {
    submitOtpAndVote();
  }
}

/**
 * Verify OTP and cast vote
 */
async function submitOtpAndVote() {
  const otpInput = document.getElementById('otpInput');
  const otp = otpInput.value.trim();
  const errorDiv = document.getElementById('otpError');
  const submitButton = document.getElementById('otpSubmitButton');
  const userId = localStorage.getItem('userId');

  // Validate OTP
  if (!otp || otp.length !== 6 || !/^\d{6}$/.test(otp)) {
    errorDiv.textContent = 'Please enter a valid 6-digit OTP';
    errorDiv.style.display = 'block';
    return;
  }

  errorDiv.style.display = 'none';
  submitButton.disabled = true;
  submitButton.textContent = 'Verifying...';

  try {
    // Verify OTP first - pass both userId and otp
    const verifyResponse = await API.verifyOTP(userId, otp);

    if (!verifyResponse.success) {
      errorDiv.textContent = verifyResponse.message || 'Invalid OTP. Please try again.';
      errorDiv.style.display = 'block';
      submitButton.disabled = false;
      submitButton.textContent = 'Verify & Vote';
      return;
    }

    // OTP verified! Update JWT token in localStorage with the verified token
    if (verifyResponse.token) {
      localStorage.setItem('authToken', verifyResponse.token);
    }

    // OTP verified, now cast the vote
    submitButton.textContent = 'Casting Vote...';

    const voteResponse = await API.castVote(selectedCandidate);

    if (voteResponse.success) {
      // Close modal and show success
      closeOtpModal();
      showMessage(
        `Vote submitted successfully! Candidate: ${voteResponse.candidateSelected}. Block Hash: ${voteResponse.blockHash.substring(0, 20)}...`,
        'success'
      );

      // Reset form and reload status
      selectedCandidate = null;
      setTimeout(async () => {
        await loadVotingStatus();
        await loadResults();
      }, 1500);
    } else {
      errorDiv.textContent = voteResponse.message || 'Failed to submit vote';
      errorDiv.style.display = 'block';
      submitButton.disabled = false;
      submitButton.textContent = 'Verify & Vote';
    }
  } catch (error) {
    console.error('Error during vote submission:', error);
    errorDiv.textContent = `Error: ${error.message}`;
    errorDiv.style.display = 'block';
    submitButton.disabled = false;
    submitButton.textContent = 'Verify & Vote';
  }
}

/**
 * Resend OTP
 */
async function resendOtp() {
  try {
    const userId = localStorage.getItem('userId');
    const response = await API.resendOTP(userId);

    if (response.success) {
      showMessage('OTP resent successfully!', 'success');
      document.getElementById('otpInput').value = '';
      document.getElementById('otpInput').focus();
    } else {
      showMessage('Failed to resend OTP', 'danger');
    }
  } catch (error) {
    console.error('Error resending OTP:', error);
    showMessage('Error resending OTP', 'danger');
  }
}

/**
 * Load and display voting results
 */
async function loadResults() {
  try {
    const resultsResponse = await API.getResults();

    if (resultsResponse.success) {
      displayResults(resultsResponse);
    } else {
      console.warn('Results response not successful:', resultsResponse);
      displayResults({ totalVotes: 0, results: [] });
    }

    const blockchainResponse = await API.getBlockchainInfo();

    if (blockchainResponse && blockchainResponse.success) {
      displayBlockchainInfo(blockchainResponse);
    }
  } catch (error) {
    console.error('Error loading results:', error);
    // Show empty results instead of error message
    const resultsContainer = document.getElementById('resultsContainer');
    if (resultsContainer) {
      resultsContainer.innerHTML = `
        <div class="alert alert-info">
          No votes recorded yet. Be the first to vote!
        </div>
      `;
    }
  }
}

/**
 * Display voting results
 * @param {object} data - Results data
 */
function displayResults(data) {
  const { totalVotes = 0, results = [] } = data;
  const container = document.getElementById('resultsContainer');

  // Safety check for results
  if (!results || !Array.isArray(results) || results.length === 0) {
    container.innerHTML = `
      <div class="alert alert-info">
        No votes recorded yet. Be the first to vote!
      </div>
    `;
    return;
  }

  let maxVotes = Math.max(...results.map((r) => r.voteCount));

  container.innerHTML = `
    <div style="margin-bottom: 20px">
      <p style="font-weight: 500; margin-bottom: 15px">
        Total Votes: <strong>${totalVotes}</strong>
      </p>
    </div>
    ${results
      .map(
        (result) => `
      <div class="result-item">
        <div class="result-name">${result.candidateName}</div>
        <div class="result-bar">
          <div
            class="result-bar-fill"
            style="width: ${(result.voteCount / maxVotes) * 100}%"
          >
            ${result.percentage}
          </div>
        </div>
        <div class="result-count">${result.voteCount} votes</div>
      </div>
    `
      )
      .join('')}
  `;
}

/**
 * Display blockchain information
 * @param {object} data - Blockchain data
 */
function displayBlockchainInfo(data) {
  const { message = '', note = '' } = data;

  let blockchainHTML = `
    <div class="blockchain-info" style="margin-top: 30px">
      <h3>🔐 Blockchain Verification</h3>
      <div class="blockchain-status valid">
        <span>✓ Using Ethereum Blockchain</span>
      </div>
      <p style="margin-top: 15px; font-size: 13px; color: #666;">
        <strong>Current Status:</strong> ${message}
      </p>
      <p style="margin-top: 10px; font-size: 13px; color: #666;">
        <strong>Note:</strong> ${note}
      </p>
      <p style="margin-top: 15px; font-size: 12px; color: #666;">
        <strong>Why Blockchain?</strong> Every vote is immutably recorded on the Ethereum blockchain and cannot be changed or deleted without detection.
      </p>
    </div>
  `;

  const blockchainBox =
    document.getElementById('blockchainInfoBox') ||
    document.createElement('div');
  blockchainBox.innerHTML = blockchainHTML;

  if (!document.getElementById('blockchainInfoBox')) {
    document
      .getElementById('resultsContainer')
      .parentElement.appendChild(blockchainBox);
  }
}

/**
 * Show message to user
 * @param {string} message - Message text
 * @param {string} type - Message type
 */
function showMessage(message, type = 'info') {
  const messageBox = document.getElementById('messageBox');
  if (!messageBox) return;

  messageBox.innerHTML = `<div class="alert alert-${type}">${message}</div>`;
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

// Auto-refresh results every 10 seconds (if still on voting page)
setInterval(() => {
  if (
    document.getElementById('resultsSection') &&
    !document.getElementById('resultsSection').classList.contains('hidden')
  ) {
    loadResults();
  }
}, 10000);
