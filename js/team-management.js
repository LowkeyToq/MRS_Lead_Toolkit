/**
 * Team Management Module
 *
 * Handles the Medrunner Stand By functionality including:
 * - Team member management
 * - Modal display
 * - Team member list with timestamps
 * - Chronological sorting
 *
 * @module team-management
 */

// Session storage key
const TEAM_MEMBERS_KEY = 'mrs_team_members';

/**
 * Initialize the Team Management module
 */
function initializeTeamManagement() {
    console.log("Team Management module - Initializing...");
    
    // Load and display team members
    updateTeamMemberDisplays();
    
    console.log("Team Management module - Ready!");
}

/**
 * Get all team members from session storage
 * @returns {Array} Array of team member objects
 */
function getTeamMembers() {
    const membersJson = sessionStorage.getItem(TEAM_MEMBERS_KEY);
    return membersJson ? JSON.parse(membersJson) : [];
}

/**
 * Save team members to session storage
 * @param {Array} members - Array of team member objects
 */
function saveTeamMembers(members) {
    sessionStorage.setItem(TEAM_MEMBERS_KEY, JSON.stringify(members));
    updateTeamMemberDisplays();
}

/**
 * Open the Stand By modal
 */
function openStandByModal() {
    const modal = document.getElementById('standby-modal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        updateTeamMembersList();
    }
}

/**
 * Close the Stand By modal
 */
function closeStandByModal() {
    const modal = document.getElementById('standby-modal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
        // Clear input
        const input = document.getElementById('medrunner-name-input');
        if (input) input.value = '';
        // Hide warning
        const warning = document.getElementById('team-warning');
        if (warning) warning.classList.add('hidden');
    }
}

/**
 * Add a new team member
 */
function addTeamMember() {
    const input = document.getElementById('medrunner-name-input');
    const name = input.value.trim();
    
    if (!name) {
        alert('Please enter a medrunner name.');
        return;
    }
    
    const members = getTeamMembers();
    
    // Check if team is full (9 members including lead)
    // Lead (1) + 8 team members = 9 total
    if (members.length >= 8) {
        const warning = document.getElementById('team-warning');
        if (warning) {
            warning.classList.remove('hidden');
        }
        // Still allow adding, just show warning
    }
    
    // Create new team member object
    const newMember = {
        id: Date.now(), // Unique ID
        name: name,
        timestamp: Date.now(),
        dateAdded: new Date().toLocaleString('de-DE', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
    };
    
    // Add to members array
    members.push(newMember);
    
    // Save and update displays
    saveTeamMembers(members);
    
    // Clear input
    input.value = '';
    
    // Update the list in modal
    updateTeamMembersList();
    
    console.log('Team member added:', newMember);
}

/**
 * Remove a team member
 * @param {number} memberId - The ID of the member to remove
 */
function removeTeamMember(memberId) {
    const members = getTeamMembers();
    const filteredMembers = members.filter(m => m.id !== memberId);
    saveTeamMembers(filteredMembers);
    updateTeamMembersList();
    
    // Hide warning if we're back under limit
    if (filteredMembers.length < 8) {
        const warning = document.getElementById('team-warning');
        if (warning) warning.classList.add('hidden');
    }
}

/**
 * Sort team members chronologically (oldest first)
 */
function sortTeamMembers() {
    const members = getTeamMembers();
    // Sort by timestamp (oldest first)
    members.sort((a, b) => a.timestamp - b.timestamp);
    saveTeamMembers(members);
    updateTeamMembersList();
}

/**
 * Update the team members list in the modal
 */
function updateTeamMembersList() {
    const container = document.getElementById('team-members-list');
    if (!container) return;
    
    const members = getTeamMembers();
    
    if (members.length === 0) {
        container.innerHTML = '<p class="text-sm text-gray-400 italic">No team members added yet.</p>';
        return;
    }
    
    let html = '';
    members.forEach(member => {
        html += `
            <div class="flex items-center justify-between gap-3 rounded-lg border border-gray-600 bg-gray-700/50 px-4 py-3">
                <div class="flex-1">
                    <div class="font-medium text-white">${escapeHtml(member.name)}</div>
                    <div class="text-xs text-gray-400">Added: ${member.dateAdded}</div>
                </div>
                <button 
                    onclick="removeTeamMember(${member.id})"
                    class="rounded-lg border border-red-700 bg-red-900/50 px-3 py-2 text-sm font-medium text-red-200 transition hover:bg-red-800 hover:text-white"
                >
                    Remove
                </button>
            </div>
        `;
    });
    
    container.innerHTML = html;
    
    // Show warning if team is at or over limit
    const warning = document.getElementById('team-warning');
    if (warning) {
        if (members.length >= 8) {
            warning.classList.remove('hidden');
        } else {
            warning.classList.add('hidden');
        }
    }
}

/**
 * Update the team members display in the Home tab
 */
function updateHomeTeamDisplay() {
    const container = document.getElementById('home-team-members');
    if (!container) return;
    
    const members = getTeamMembers();
    
    if (members.length === 0) {
        container.innerHTML = '<p class="text-sm text-gray-400 italic">No team members added yet.</p>';
        return;
    }
    
    let html = '';
    members.forEach(member => {
        html += `
            <div class="flex items-center justify-between gap-3 rounded-lg border border-gray-600 bg-gray-700/50 px-4 py-3">
                <div class="flex-1">
                    <div class="font-medium text-white">${escapeHtml(member.name)}</div>
                    <div class="text-xs text-gray-400">Added: ${member.dateAdded}</div>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

/**
 * Update all team member displays (modal and home)
 */
function updateTeamMemberDisplays() {
    updateTeamMembersList();
    updateHomeTeamDisplay();
}

/**
 * Escape HTML to prevent XSS
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
