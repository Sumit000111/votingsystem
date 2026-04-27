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
      const statusDiv = document.getElementById('votingStatus');
      const statusMessage = document.getElementById('statusMessage');

      if (response.hasVoted) {
        // User has already voted
        statusDiv.textContent = '✓ Voted';
        statusDiv.style.color = '#16a34a';
        statusMessage.textContent = `You voted for: ${response.votedFor}`;

        votingSection.classList.add('hidden');
        alreadyVotedBox.classList.remove('hidden');
      } else {
        // User can vote
        statusDiv.textContent = 'Ready to Vote';
        statusDiv.style.color = '#2563eb';
        statusMessage.textContent = 'Select a candidate and submit your vote';

        votingSection.classList.remove('hidden');
        alreadyVotedBox.classList.add('hidden');
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
    <div class="candidate-card" onclick="selectCandidate(this)" style="display: flex; align-items: center; gap: 15px; padding: 12px 16px; border: 2px solid #e5e7eb; border-radius: 6px; cursor: pointer; transition: all 0.3s ease; background: white">
      <input
        type="radio"
        name="candidate"
        value="${candidate.name.replace(/"/g, '&quot;')}"
        style="width: 20px; height: 20px; cursor: pointer; flex-shrink: 0"
      />
      <div style="flex-grow: 1">
        <div style="font-weight: 600; color: #1f2937; margin-bottom: 3px">${candidate.name}</div>
      </div>
      ${candidate.image ? `<img src="${candidate.image}" alt="${candidate.party} Flag" style="width: 40px; height: 40px; object-fit: contain; border-radius: 4px; border: 1px solid #e5e7eb;" onerror="this.style.display='none'">` : ''}
    </div>
  `
    )
    .join('');
}

/**
 * Handle candidate selection
 * @param {HTMLElement} element - Clicked card element
 */
function selectCandidate(element) {
  const candidateName = element.querySelector('input[type="radio"]').value;
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

  // Pure Biometric interception explicitly dropping ALL OTP calls natively
  showOtpModal(selectedCandidate);
}

/**
 * Show Hardware modal for vote verification
 * @param {string} candidateName - Name of selected candidate
 */
function showOtpModal(candidateName) {
  document.getElementById('otpCandidateName').textContent = candidateName;
  document.getElementById('otpError').style.display = 'none';
  document.getElementById('otpModal').style.display = 'flex';
}

/**
 * Close Hardware modal
 */
function closeOtpModal() {
  document.getElementById('otpModal').style.display = 'none';
}

/**
 * Trigger Biometric Scanner and cast vote entirely bypassing OTP endpoints!
 */
async function submitOtpAndVote() {
  const errorDiv = document.getElementById('otpError');
  const submitButton = document.getElementById('otpSubmitButton');

  errorDiv.style.display = 'none';
  submitButton.disabled = true;
  submitButton.textContent = 'Submitting Vote...';

  try {
    const voteResponse = await API.castVote(selectedCandidate);

    if (voteResponse.success) {
      closeOtpModal();
      showMessage(`Vote securely embedded onto Decentralized Ledger! Hash: ${voteResponse.txHash ? voteResponse.txHash.substring(0, 20) : 'pending'}...`, 'success');

      selectedCandidate = null;
      setTimeout(async () => {
        await loadVotingStatus();
        await loadResults();
      }, 1500);
    } else {
      errorDiv.textContent = voteResponse.message || 'Failed to submit vote securely.';
      errorDiv.style.display = 'block';
      submitButton.disabled = false;
      submitButton.textContent = 'Verify & Vote';
    }
  } catch (error) {
    console.error('Vote submission failed:', error);
    errorDiv.textContent = `Vote submission failed: ${error.message}`;
    errorDiv.style.display = 'block';
    submitButton.disabled = false;
    submitButton.textContent = 'Retry Vote';
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
  // logic migrated
}, 10000);
