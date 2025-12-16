/**
 * Home Module
 *
 * Handles the Home tab functionality including:
 * - Lead name storage
 * - Team position management
 * - Number of teams tracking
 * - Alarm button functionality with circular position logic
 *
 * @module home
 */

// Local storage keys (changed from session to persist across page reloads)
const SESSION_KEYS = {
    LEAD_NAME: 'mrs_lead_name',
    TEAM_POSITION: 'mrs_team_position',
    NUMBER_OF_TEAMS: 'mrs_number_of_teams',
    ALERT_ACTIVE: 'mrs_alert_active'
};

/**
 * Ensure the lead name input has a value before proceeding with critical actions.
 * @returns {boolean} True when the lead name is present, false otherwise.
 */
function ensureLeadNameProvided() {
    const leadNameInput = document.getElementById('lead-name');
    if (!leadNameInput) {
        console.warn('Lead name input element not found.');
        return true;
    }

    const leadName = leadNameInput.value.trim();
    if (leadName) {
        return true;
    }

    showLeadNameWarningModal();
    leadNameInput.focus();
    return false;
}

/**
 * Initialize the Home module
 * Sets up event listeners and loads saved data from session storage
 */
function initializeHome() {
    console.log("Home module - Initializing...");

    // Load saved values from session storage
    loadHomeData();

    // Set up event listeners for auto-save (removed to require explicit save)
    // Event listeners now only update UI, not storage

    console.log("Home module - Ready!");
}

/**
 * Load saved data from local storage
 */
function loadHomeData() {
    // Load lead name
    const savedLeadName = localStorage.getItem(SESSION_KEYS.LEAD_NAME);
    if (savedLeadName) {
        document.getElementById('lead-name').value = savedLeadName;
    }

    // Load team position
    const savedPosition = localStorage.getItem(SESSION_KEYS.TEAM_POSITION);
    if (savedPosition) {
        document.getElementById('team-position').value = savedPosition;
        updatePositionDisplay(savedPosition);
    } else {
        // Default to position 1
        localStorage.setItem(SESSION_KEYS.TEAM_POSITION, '1');
        updatePositionDisplay(1);
    }

    // Load number of teams
    const savedTeams = localStorage.getItem(SESSION_KEYS.NUMBER_OF_TEAMS);
    if (savedTeams) {
        document.getElementById('number-of-teams').value = savedTeams;
    } else {
        // Default to 1 team
        localStorage.setItem(SESSION_KEYS.NUMBER_OF_TEAMS, '1');
    }
}

/**
 * Set up event listeners for home page elements
 */
function setupHomeEventListeners() {
    // Lead name input
    const leadNameInput = document.getElementById('lead-name');
    if (leadNameInput) {
        leadNameInput.addEventListener('input', function(e) {
            sessionStorage.setItem(SESSION_KEYS.LEAD_NAME, e.target.value);
        });
    }

    // Team position dropdown
    const teamPositionSelect = document.getElementById('team-position');
    if (teamPositionSelect) {
        teamPositionSelect.addEventListener('change', function(e) {
            const position = e.target.value;
            sessionStorage.setItem(SESSION_KEYS.TEAM_POSITION, position);
            updatePositionDisplay(position);
        });
    }

    // Number of teams dropdown
    const numberOfTeamsSelect = document.getElementById('number-of-teams');
    if (numberOfTeamsSelect) {
        numberOfTeamsSelect.addEventListener('change', function(e) {
            sessionStorage.setItem(SESSION_KEYS.NUMBER_OF_TEAMS, e.target.value);
        });
    }
}

/**
 * Save home data to local storage
 * Shows confirmation message
 */
function saveHomeData() {
    if (!ensureLeadNameProvided()) {
        return;
    }

    // Get values from inputs
    const leadNameInput = document.getElementById('lead-name');
    const leadName = leadNameInput ? leadNameInput.value.trim() : '';
    const teamPosition = parseInt(document.getElementById('team-position').value);
    const numberOfTeams = parseInt(document.getElementById('number-of-teams').value);

    // Validate: Position should not exceed number of teams
    let validPosition = teamPosition;
    if (validPosition > numberOfTeams) {
        validPosition = numberOfTeams;
        // Update the dropdown to reflect the corrected position
        document.getElementById('team-position').value = validPosition.toString();
    }

    // Save to local storage
    localStorage.setItem(SESSION_KEYS.LEAD_NAME, leadName);
    localStorage.setItem(SESSION_KEYS.TEAM_POSITION, validPosition.toString());
    localStorage.setItem(SESSION_KEYS.NUMBER_OF_TEAMS, numberOfTeams);

    // Update position display
    updatePositionDisplay(validPosition);

    // Show success message
    const successMessage = document.getElementById('save-success-message');
    if (successMessage) {
        successMessage.classList.remove('hidden');
        setTimeout(() => {
            successMessage.classList.add('hidden');
        }, 3000);
    }

    console.log('Home data saved:', { leadName, teamPosition: validPosition, numberOfTeams });
}

/**
 * Update the position display in the top right
 * @param {number|string} position - The current position to display
 */
function updatePositionDisplay(position) {
    const displayElement = document.getElementById('current-position-display');
    if (displayElement) {
        displayElement.textContent = position;
    }
}

/**
 * Handle the alarm button click
 * Decrements the current position by 1 with circular logic
 * 
 * Rules:
 * - Position cannot be 0
 * - If at position 1, wrap around to the number of teams
 * - If there's only 1 team, always stay at position 1
 */
function triggerAlarm() {
    if (!ensureLeadNameProvided()) {
        return;
    }

    // Get current values
    let currentPosition = parseInt(localStorage.getItem(SESSION_KEYS.TEAM_POSITION) || '1');
    const numberOfTeams = parseInt(localStorage.getItem(SESSION_KEYS.NUMBER_OF_TEAMS) || '1');
    
    // Check if we're at position 1 - special behavior
    const wasAtPosition1 = currentPosition === 1;

    // If there's only 1 team, always stay at position 1
    if (numberOfTeams === 1) {
        currentPosition = 1;
    } else {
        // Decrement position
        currentPosition--;

        // If position becomes 0, wrap around to the number of teams
        if (currentPosition < 1) {
            currentPosition = numberOfTeams;
        }
    }

    // Update the local storage
    localStorage.setItem(SESSION_KEYS.TEAM_POSITION, currentPosition.toString());

    // Update the dropdown
    const teamPositionSelect = document.getElementById('team-position');
    if (teamPositionSelect) {
        teamPositionSelect.value = currentPosition.toString();
    }

    // Update the display
    updatePositionDisplay(currentPosition);

    // Visual feedback - flash the alarm button in header
    const alarmButton = document.getElementById('alarm-button-header');
    if (alarmButton) {
        alarmButton.classList.add('animate-pulse');
        setTimeout(() => {
            alarmButton.classList.remove('animate-pulse');
        }, 500);
    }

    // If we were at position 1, trigger special behavior
    if (wasAtPosition1) {
        // Set alert as active
        localStorage.setItem(SESSION_KEYS.ALERT_ACTIVE, 'true');
        updateAlertTimerVisibility();
        
        // Start alert timer
        if (typeof advanceAlertTimer === 'function') {
            advanceAlertTimer();
        }
        
        // Copy Discord alert to clipboard
        copyDiscordAlert();
        
        // Open workflow modal
        openWorkflowModal();
    }

    console.log(`Alarm triggered! Position changed to: ${currentPosition}`);
}

/**
 * Get the current lead name
 * @returns {string} The current lead name
 */
function getLeadName() {
    return (localStorage.getItem(SESSION_KEYS.LEAD_NAME) || '').trim();
}

/**
 * Get the current team position
 * @returns {number} The current team position
 */
function getTeamPosition() {
    return parseInt(localStorage.getItem(SESSION_KEYS.TEAM_POSITION) || '1');
}

/**
 * Check if alert is currently active
 * @returns {boolean} Whether alert is active
 */
function isAlertActive() {
    return localStorage.getItem(SESSION_KEYS.ALERT_ACTIVE) === 'true';
}

/**
 * Deactivate alert (when timer resets or mission completes)
 */
function deactivateAlert() {
    localStorage.setItem(SESSION_KEYS.ALERT_ACTIVE, 'false');
    updateAlertTimerVisibility();
}

/**
 * Update alert timer visibility on all tabs
 */
function updateAlertTimerVisibility() {
    const alertTimerSection = document.getElementById('alert-timer-section');
    if (alertTimerSection) {
        if (isAlertActive()) {
            alertTimerSection.classList.remove('hidden');
        } else {
            alertTimerSection.classList.add('hidden');
        }
    }
}

/**
 * Display the lead name warning modal.
 */
function showLeadNameWarningModal() {
    const modal = document.getElementById('lead-name-warning-modal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    } else {
        alert('Bitte trage den Namen des Leads ein, bevor du fortfährst.');
    }
}

/**
 * Hide the lead name warning modal.
 */
function hideLeadNameWarningModal() {
    const modal = document.getElementById('lead-name-warning-modal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
}

/**
 * Copy Discord alert message to clipboard
 */
function copyDiscordAlert() {
    const timestamp = Math.floor(Date.now() / 1000);
    const alertText = `<a:AlertBlue:1064652389711360043><a:AlertRed:985293780288700476><:AA1:1182246601557823520><:AA2:1182246604401561610><:AA3:1182246605718556682><:AA4:1182246607228514304><:AA5:1182246610189692938><:AA6:1182246613150859304><:AA7:1182246614665019393><:AA8:1182246617559072838><a:AlertRed:985293780288700476><a:AlertBlue:1064652389711360043><t:${timestamp}:R>`;
    
    navigator.clipboard.writeText(alertText).then(() => {
        console.log('Discord alert copied to clipboard');
        showCopyNotification('Discord alert copied!');
    }).catch(err => {
        console.error('Failed to copy alert:', err);
    });
}
