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

// Session storage keys
const SESSION_KEYS = {
    LEAD_NAME: 'mrs_lead_name',
    TEAM_POSITION: 'mrs_team_position',
    NUMBER_OF_TEAMS: 'mrs_number_of_teams'
};

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
 * Load saved data from session storage
 */
function loadHomeData() {
    // Load lead name
    const savedLeadName = sessionStorage.getItem(SESSION_KEYS.LEAD_NAME);
    if (savedLeadName) {
        document.getElementById('lead-name').value = savedLeadName;
    }

    // Load team position
    const savedPosition = sessionStorage.getItem(SESSION_KEYS.TEAM_POSITION);
    if (savedPosition) {
        document.getElementById('team-position').value = savedPosition;
        updatePositionDisplay(savedPosition);
    } else {
        // Default to position 1
        sessionStorage.setItem(SESSION_KEYS.TEAM_POSITION, '1');
        updatePositionDisplay(1);
    }

    // Load number of teams
    const savedTeams = sessionStorage.getItem(SESSION_KEYS.NUMBER_OF_TEAMS);
    if (savedTeams) {
        document.getElementById('number-of-teams').value = savedTeams;
    } else {
        // Default to 1 team
        sessionStorage.setItem(SESSION_KEYS.NUMBER_OF_TEAMS, '1');
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
 * Save home data to session storage
 * Shows confirmation message
 */
function saveHomeData() {
    // Get values from inputs
    const leadName = document.getElementById('lead-name').value;
    const teamPosition = document.getElementById('team-position').value;
    const numberOfTeams = document.getElementById('number-of-teams').value;

    // Save to session storage
    sessionStorage.setItem(SESSION_KEYS.LEAD_NAME, leadName);
    sessionStorage.setItem(SESSION_KEYS.TEAM_POSITION, teamPosition);
    sessionStorage.setItem(SESSION_KEYS.NUMBER_OF_TEAMS, numberOfTeams);

    // Update position display
    updatePositionDisplay(teamPosition);

    // Show success message
    const successMessage = document.getElementById('save-success-message');
    if (successMessage) {
        successMessage.classList.remove('hidden');
        setTimeout(() => {
            successMessage.classList.add('hidden');
        }, 3000);
    }

    console.log('Home data saved:', { leadName, teamPosition, numberOfTeams });
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
    // Get current values
    let currentPosition = parseInt(sessionStorage.getItem(SESSION_KEYS.TEAM_POSITION) || '1');
    const numberOfTeams = parseInt(sessionStorage.getItem(SESSION_KEYS.NUMBER_OF_TEAMS) || '1');

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

    // Update the session storage
    sessionStorage.setItem(SESSION_KEYS.TEAM_POSITION, currentPosition.toString());

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

    console.log(`Alarm triggered! Position changed to: ${currentPosition}`);
}

/**
 * Get the current lead name
 * @returns {string} The current lead name
 */
function getLeadName() {
    return sessionStorage.getItem(SESSION_KEYS.LEAD_NAME) || '';
}

/**
 * Get the current team position
 * @returns {number} The current team position
 */
function getTeamPosition() {
    return parseInt(sessionStorage.getItem(SESSION_KEYS.TEAM_POSITION) || '1');
}

/**
 * Get the number of teams
 * @returns {number} The number of teams in the system
 */
function getNumberOfTeams() {
    return parseInt(sessionStorage.getItem(SESSION_KEYS.NUMBER_OF_TEAMS) || '1');
}
