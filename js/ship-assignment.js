/**
 * Ship Assignment Module
 *
 * This module handles all ship assignment related functionality including:
 * - Ship management (add, remove, update)
 * - Crew member management (add, remove, update)
 * - Drag and drop functionality for crew members
 * - Discord import/export functionality
 * - Preview generation and clipboard operations
 *
 * @module ship-assignment
 */

// ============================================================================
// STATE MANAGEMENT
// ============================================================================

/**
 * Array of ship objects containing ship data and crew assignments
 * @type {Array<{id: number, type: string, ship: string, crew: Array}>}
 */
let ships = [];

/**
 * Counter for generating unique ship IDs
 * @type {number}
 */
let shipIdCounter = 0;

/**
 * Currently dragged element during drag and drop operations
 * @type {HTMLElement|null}
 */
let draggedElement = null;

/**
 * ID of the ship containing the dragged element
 * @type {number|null}
 */
let draggedShipId = null;

/**
 * Reverse mapping from emoji to role name for parsing Discord messages
 * @type {Object<string, string>}
 */
const EMOJI_TO_ROLE = {};

/**
 * Reverse mapping from emoji to position number for parsing Discord messages
 * @type {Object<string, number>}
 */
const EMOJI_TO_POSITION = {};

/**
 * Reverse mapping from emoji to ship type for parsing Discord messages
 * @type {Object<string, string>}
 */
const EMOJI_TO_SHIP_TYPE = {};

// Initialize reverse emoji mappings
Object.entries(EMOJIS.roles).forEach(([role, emoji]) => {
    EMOJI_TO_ROLE[emoji] = role;
});

Object.entries(EMOJIS.positions).forEach(([num, emoji]) => {
    EMOJI_TO_POSITION[emoji] = parseInt(num);
});

Object.entries(EMOJIS.shipTypes).forEach(([type, emoji]) => {
    EMOJI_TO_SHIP_TYPE[emoji] = type;
});

// ============================================================================
// CREW MEMBER CACHING (localStorage) - Discord ID <-> Name associations
// ============================================================================

/**
 * localStorage key for cached crew members (Discord ID -> Name mapping)
 * @type {string}
 */
const CREW_CACHE_STORAGE_KEY = "mrs_crew_cache";

/**
 * Maximum number of cached crew members to store
 * @type {number}
 */
const MAX_CACHED_CREW = 100;

/**
 * Loads cached crew members from localStorage.
 *
 * @function getCachedCrewMembers
 * @returns {Array<{discordId: string, name: string}>} Array of cached crew members
 */
function getCachedCrewMembers() {
    try {
        const stored = localStorage.getItem(CREW_CACHE_STORAGE_KEY);
        if (stored) {
            const data = JSON.parse(stored);
            // Handle migration from old format (string array) to new format (object array)
            if (Array.isArray(data) && data.length > 0 && typeof data[0] === "string") {
                // Old format - just names, migrate to new format
                return data.map(name => ({ discordId: "", name }));
            }
            return data;
        }
    } catch (e) {
        console.warn("Failed to load cached crew members:", e);
    }
    return [];
}

/**
 * Saves cached crew members to localStorage.
 *
 * @function saveCachedCrewMembers
 * @param {Array<{discordId: string, name: string}>} members - Array of crew members to save
 */
function saveCachedCrewMembers(members) {
    try {
        localStorage.setItem(CREW_CACHE_STORAGE_KEY, JSON.stringify(members));
    } catch (e) {
        console.warn("Failed to save cached crew members:", e);
    }
}

/**
 * Caches a crew member's Discord ID and name association.
 * If either field is provided, updates or creates the association.
 *
 * @function cacheCrewMember
 * @param {string} discordId - The Discord ID
 * @param {string} name - The crew member's name
 */
function cacheCrewMember(discordId, name) {
    const trimmedId = (discordId || "").trim();
    const trimmedName = (name || "").trim();

    // Need at least one field to cache
    if (!trimmedId && !trimmedName) return;

    try {
        let members = getCachedCrewMembers();

        // Find existing entry by Discord ID (primary key)
        const existingIndex = trimmedId
            ? members.findIndex(m => m.discordId === trimmedId)
            : -1;

        if (existingIndex >= 0) {
            // Update existing entry and move to front
            const existing = members.splice(existingIndex, 1)[0];
            if (trimmedName) existing.name = trimmedName;
            members.unshift(existing);
        } else if (trimmedId && trimmedName) {
            // New entry with both fields
            members.unshift({ discordId: trimmedId, name: trimmedName });
        } else if (trimmedName) {
            // Name only - check if name exists without ID
            const nameIndex = members.findIndex(
                m => !m.discordId && m.name.toLowerCase() === trimmedName.toLowerCase()
            );
            if (nameIndex >= 0) {
                // Move existing name-only entry to front
                const existing = members.splice(nameIndex, 1)[0];
                members.unshift(existing);
            } else {
                // Add new name-only entry
                members.unshift({ discordId: "", name: trimmedName });
            }
        }

        // Limit to max cached members
        if (members.length > MAX_CACHED_CREW) {
            members = members.slice(0, MAX_CACHED_CREW);
        }

        saveCachedCrewMembers(members);
        updateCrewNameDatalist();
    } catch (e) {
        console.warn("Failed to cache crew member:", e);
    }
}

/**
 * Looks up a cached name by Discord ID.
 *
 * @function getCachedNameByDiscordId
 * @param {string} discordId - The Discord ID to look up
 * @returns {string|null} The cached name, or null if not found
 */
function getCachedNameByDiscordId(discordId) {
    if (!discordId || discordId.trim() === "") return null;

    const members = getCachedCrewMembers();
    const member = members.find(m => m.discordId === discordId.trim());
    return member ? member.name : null;
}

/**
 * Gets all unique cached names for autocomplete.
 *
 * @function getCachedCrewNames
 * @returns {string[]} Array of unique names
 */
function getCachedCrewNames() {
    const members = getCachedCrewMembers();
    const names = members
        .map(m => m.name)
        .filter(name => name && name.trim() !== "");
    // Return unique names preserving order
    return [...new Set(names)];
}

/**
 * Updates all crew name datalists with cached names and team members.
 *
 * @function updateCrewNameDatalist
 */
function updateCrewNameDatalist() {
    const datalist = document.getElementById("crew-name-suggestions");
    if (!datalist) return;

    // Get cached crew names
    const cachedNames = getCachedCrewNames();
    
    // Get team members from team management
    let teamMemberNames = [];
    if (typeof getTeamMembers === 'function') {
        const teamMembers = getTeamMembers();
        teamMemberNames = teamMembers.map(m => m.name);
    }
    
    // Also add the lead name from the lead-name input field
    const leadNameInput = document.getElementById('lead-name');
    if (leadNameInput && leadNameInput.value.trim()) {
        teamMemberNames.push(leadNameInput.value.trim());
    }
    
    // Combine and deduplicate
    let allNames = [...new Set([...teamMemberNames, ...cachedNames])];
    
    // Filter out names that are already assigned to ships
    const assignedNames = new Set();
    ships.forEach(ship => {
        ship.crew.forEach(crew => {
            if (crew.name && crew.name.trim()) {
                assignedNames.add(crew.name.trim().toLowerCase());
            }
        });
    });
    
    // Only show names that are not yet assigned
    const availableNames = allNames.filter(name => 
        !assignedNames.has(name.toLowerCase())
    );
    
    datalist.innerHTML = availableNames.map(name => `<option value="${name}">`).join("");
}

/**
 * Initializes the crew name datalist on page load.
 *
 * @function initializeCrewNameCache
 */
function initializeCrewNameCache() {
    // Create datalist element if it doesn't exist
    if (!document.getElementById("crew-name-suggestions")) {
        const datalist = document.createElement("datalist");
        datalist.id = "crew-name-suggestions";
        document.body.appendChild(datalist);
    }
    updateCrewNameDatalist();
}

// Initialize crew name cache on DOMContentLoaded
document.addEventListener("DOMContentLoaded", initializeCrewNameCache);

/**
 * Updates or adds a Discord ID -> Name association in the cache.
 * Can be called from browser console to fix incorrect associations.
 *
 * @function updateCachedName
 * @param {string} discordId - The Discord ID
 * @param {string} newName - The correct name
 * @example updateCachedName("640123456789", "CorrectName")
 */
function updateCachedName(discordId, newName) {
    if (!discordId || discordId.trim() === "") {
        console.error("Discord ID is required");
        return;
    }
    cacheCrewMember(discordId.trim(), newName);
    console.log(`Updated: ${discordId} → "${newName}"`);
}

/**
 * Removes a Discord ID from the cache entirely.
 * Can be called from browser console.
 *
 * @function removeCachedCrewMember
 * @param {string} discordId - The Discord ID to remove
 * @example removeCachedCrewMember("640123456789")
 */
function removeCachedCrewMember(discordId) {
    if (!discordId || discordId.trim() === "") {
        console.error("Discord ID is required");
        return;
    }
    try {
        let members = getCachedCrewMembers();
        const before = members.length;
        members = members.filter(m => m.discordId !== discordId.trim());
        if (members.length < before) {
            saveCachedCrewMembers(members);
            updateCrewNameDatalist();
            console.log(`Removed Discord ID: ${discordId}`);
        } else {
            console.log(`Discord ID not found in cache: ${discordId}`);
        }
    } catch (e) {
        console.error("Failed to remove cached crew member:", e);
    }
}

/**
 * Clears the entire crew cache.
 * Can be called from browser console.
 *
 * @function clearCrewCache
 * @example clearCrewCache()
 */
function clearCrewCache() {
    localStorage.removeItem(CREW_CACHE_STORAGE_KEY);
    updateCrewNameDatalist();
    console.log("Crew cache cleared");
}

/**
 * Lists all cached crew members in a table format.
 * Can be called from browser console.
 *
 * @function listCachedCrew
 * @example listCachedCrew()
 */
function listCachedCrew() {
    const members = getCachedCrewMembers();
    if (members.length === 0) {
        console.log("No cached crew members");
        return;
    }
    console.table(members);
    console.log(`Total: ${members.length} cached crew members`);
}

// ============================================================================
// SHIP ASSIGNMENT PERSISTENCE (localStorage)
// ============================================================================

/**
 * localStorage key for ship assignments
 * @type {string}
 */
const SHIP_ASSIGNMENTS_STORAGE_KEY = "mrs_ship_assignments";

/**
 * Saves current ship assignments to localStorage.
 * Called after any modification to the ships array.
 *
 * @function saveShipAssignments
 */
function saveShipAssignments() {
    try {
        const data = {
            ships: ships,
            shipIdCounter: shipIdCounter,
            savedAt: Date.now()
        };
        localStorage.setItem(SHIP_ASSIGNMENTS_STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
        console.warn("Failed to save ship assignments:", e);
    }
}

/**
 * Loads ship assignments from localStorage.
 * Returns true if assignments were loaded, false if starting fresh.
 *
 * @function loadShipAssignments
 * @returns {boolean} Whether assignments were loaded from storage
 */
function loadShipAssignments() {
    try {
        const stored = localStorage.getItem(SHIP_ASSIGNMENTS_STORAGE_KEY);
        if (stored) {
            const data = JSON.parse(stored);
            if (data.ships && Array.isArray(data.ships)) {
                ships = data.ships;
                shipIdCounter = data.shipIdCounter || 0;
                return true;
            }
        }
    } catch (e) {
        console.warn("Failed to load ship assignments:", e);
    }
    return false;
}

/**
 * Clears saved ship assignments from localStorage and resets the UI.
 * Can be called from browser console or via UI button.
 *
 * @function clearShipAssignments
 */
function clearShipAssignments() {
    localStorage.removeItem(SHIP_ASSIGNMENTS_STORAGE_KEY);
    ships = [];
    shipIdCounter = 0;
    renderShips();
    updatePreview();
    console.log("Ship assignments cleared");
}

/**
 * Shows a confirmation dialog before clearing all ship assignments.
 * Called by the "Clear All" button in the UI.
 *
 * @function confirmClearShipAssignments
 */
function confirmClearShipAssignments() {
    if (ships.length === 0) {
        // Nothing to clear
        return;
    }

    const crewCount = ships.reduce((sum, s) => sum + s.crew.length, 0);
    const message = `Are you sure you want to clear all ${ships.length} ship(s) and ${crewCount} crew member(s)?\n\nThis cannot be undone.`;

    if (confirm(message)) {
        clearShipAssignments();
    }
}

/**
 * Gets the timestamp of when ship assignments were last saved.
 *
 * @function getShipAssignmentsSavedTime
 * @returns {Date|null} The save timestamp, or null if not saved
 */
function getShipAssignmentsSavedTime() {
    try {
        const stored = localStorage.getItem(SHIP_ASSIGNMENTS_STORAGE_KEY);
        if (stored) {
            const data = JSON.parse(stored);
            return data.savedAt ? new Date(data.savedAt) : null;
        }
    } catch (e) {
        // Ignore
    }
    return null;
}

// ============================================================================
// SHIP MANAGEMENT FUNCTIONS
// ============================================================================

/**
 * Adds a new ship to the ship assignment list.
 * Automatically determines the ship type based on existing ships:
 * - First ship: Gunship
 * - Second ship: Medship
 * - Third+ ship: CAP
 *
 * @function addShip
 */
function addShip() {
    const shipId = shipIdCounter++;

    // Determine ship type based on existing ships
    let shipType = "Gunship"; // Default first ship

    const hasGunship = ships.some(s => s.type === "Gunship");
    const hasMedship = ships.some(s => s.type === "Medship");

    if (hasGunship && !hasMedship) {
        shipType = "Medship";
    } else if (hasGunship && hasMedship) {
        shipType = "CAP";
    }

    ships.push({
        id: shipId,
        type: shipType,
        ship: "",
        crew: []
    });
    renderShips();
    updatePreview();
    saveShipAssignments();
}

/**
 * Removes a ship from the ship assignment list.
 * Position numbers remain sticky (not reassigned).
 *
 * @function removeShip
 * @param {number} shipId - The unique ID of the ship to remove
 */
function removeShip(shipId) {
    ships = ships.filter(s => s.id !== shipId);
    // No position update needed, numbers are sticky
    renderShips();
    updatePreview();
    saveShipAssignments();
}

/**
 * Updates the type of a ship (Gunship, Medship, or CAP).
 *
 * @function updateShipType
 * @param {number} shipId - The unique ID of the ship
 * @param {string} type - The new ship type
 */
function updateShipType(shipId, type) {
    const ship = ships.find(s => s.id === shipId);
    if (ship) {
        ship.type = type;
        updatePreview();
        saveShipAssignments();
    }
}

/**
 * Updates the name of a ship.
 *
 * @function updateShipName
 * @param {number} shipId - The unique ID of the ship
 * @param {string} name - The new ship name
 */
function updateShipName(shipId, name) {
    const ship = ships.find(s => s.id === shipId);
    if (ship) {
        ship.ship = name;
        updatePreview();
        saveShipAssignments();
    }
}

// ============================================================================
// CREW MEMBER MANAGEMENT FUNCTIONS
// ============================================================================

/**
 * Adds a new crew member to a ship.
 * Automatically determines the role based on ship type and existing crew:
 * - Gunship: PIL -> LEAD -> MED -> SEC
 * - Medship: MED -> SEC
 * - CAP: CAP -> SEC
 *
 * Position numbers are auto-incremented across all ships (max 9).
 *
 * @function addCrewMember
 * @param {number} shipId - The unique ID of the ship to add crew to
 */
function addCrewMember(shipId) {
    const ship = ships.find(s => s.id === shipId);
    if (ship) {
        let newRole = "PIL"; // Default role
        const crewCount = ship.crew.length;

        if (crewCount === 0) {
            // First crew member logic
            switch (ship.type) {
                case "Gunship":
                    newRole = "PIL";
                    break;
                case "Medship":
                    newRole = "MED";
                    break;
                case "CAP":
                    newRole = "CAP";
                    break;
                default:
                    newRole = "PIL"; // Default to Pilot if type is unknown
            }
        } else {
            // Subsequent crew member logic
            switch (ship.type) {
                case "Gunship":
                    const hasLead = ship.crew.some(c => c.role === "LEAD");
                    if (!hasLead) {
                        newRole = "LEAD";
                    } else {
                        const hasMed = ship.crew.some(c => c.role === "MED");
                        if (!hasMed) {
                            newRole = "MED";
                        } else {
                            newRole = "SEC";
                        }
                    }
                    break;
                case "Medship":
                    newRole = "SEC";
                    break;
                case "CAP":
                    newRole = "SEC"; // Default subsequent CAP to Security
                    break;
                default:
                    newRole = "SEC"; // Default all other subsequent to Security
            }
        }

        // --- New Position Logic ---
        let newPosition = null;
        let highestNumber = 0;

        // Find the highest existing number across all ships
        ships.forEach(s => {
            s.crew.forEach(c => {
                if (c.position && c.position > highestNumber) {
                    highestNumber = c.position;
                }
            });
        });

        // If anyone has a number, set the new one to highest + 1
        if (highestNumber > 0 && highestNumber < 9) {
            newPosition = highestNumber + 1;
        } else if (highestNumber >= 9) {
            newPosition = null; // Don't assign if 9 is taken
        }
        // If highestNumber is 0, newPosition remains null (blank)

        ship.crew.push({
            id: Date.now(),
            role: newRole, // Use the determined role
            position: newPosition, // Use the new smart-increment logic
            name: "",
            discordId: "",
            comment: "" // Add new comment field
        });
        renderShips();
        updatePreview();
        saveShipAssignments();
        updateCrewNameDatalist(); // Update available names
    }
}

/**
 * Removes a crew member from a ship.
 * If the removed crew member had a position number, all higher numbers
 * are shuffled down to maintain continuity.
 *
 * @function removeCrewMember
 * @param {number} shipId - The unique ID of the ship
 * @param {number} crewId - The unique ID of the crew member to remove
 */
function removeCrewMember(shipId, crewId) {
    const ship = ships.find(s => s.id === shipId);
    if (ship) {
        let removedPosition = null;
        const crewMemberToRemove = ship.crew.find(c => c.id === crewId);

        if (crewMemberToRemove) {
            removedPosition = crewMemberToRemove.position; // Get the position, e.g., 3 or null
        }

        // Filter the crew member out
        ship.crew = ship.crew.filter(c => c.id !== crewId);

        // --- NEW SHUFFLE LOGIC ---
        // Only shuffle if the removed member had a valid position
        if (removedPosition) {
            // Iterate over ALL ships and ALL crew to find numbers higher than the one removed
            ships.forEach(s => {
                s.crew.forEach(c => {
                    if (c.position && c.position > removedPosition) {
                        c.position -= 1; // Shuffle down
                    }
                });
            });
        }
        // --- END OF NEW LOGIC ---

        renderShips();
        updatePreview();
        saveShipAssignments();
        updateCrewNameDatalist(); // Update available names
    }
}

/**
 * Updates the role of a crew member.
 * Also syncs the role back to team member if name matches.
 *
 * @function updateCrewRole
 * @param {number} shipId - The unique ID of the ship
 * @param {number} crewId - The unique ID of the crew member
 * @param {string} role - The new role (PIL, LEAD, MED, SEC, CAP)
 */
function updateCrewRole(shipId, crewId, role) {
    const ship = ships.find(s => s.id === shipId);
    if (ship) {
        const crew = ship.crew.find(c => c.id === crewId);
        if (crew) {
            crew.role = role;
            
            // Sync role back to team member if name matches
            if (crew.name && typeof getTeamMembers === 'function') {
                const teamMembers = getTeamMembers();
                const teamMember = teamMembers.find(m => m.name.toLowerCase() === crew.name.toLowerCase());
                if (teamMember && teamMember.role !== role) {
                    // Update team member role directly without triggering sync back
                    teamMember.role = role;
                    localStorage.setItem('mrs_team_members', JSON.stringify(teamMembers));
                    
                    // Update home display
                    if (typeof updateHomeTeamDisplay === 'function') {
                        updateHomeTeamDisplay();
                    }
                }
            }
            
            updatePreview();
            saveShipAssignments();
        }
    }
}

/**
 * Updates the position number of a crew member.
 * Position can be 1-9 or null (blank).
 *
 * @function updateCrewPosition
 * @param {number} shipId - The unique ID of the ship
 * @param {number} crewId - The unique ID of the crew member
 * @param {string|number|null} position - The new position number
 */
function updateCrewPosition(shipId, crewId, position) {
    const ship = ships.find(s => s.id === shipId);
    if (ship) {
        const crew = ship.crew.find(c => c.id === crewId);
        if (crew) {
            // Store blank as null, otherwise parse as number
            crew.position = position ? parseInt(position) : null;
            updatePreview();
            saveShipAssignments();
        }
    }
}

/**
 * Updates the name of a crew member.
 * Note: Name is optional and doesn't affect preview.
 * Caches the name with its associated Discord ID for future autocomplete.
 *
 * @function updateCrewName
 * @param {number} shipId - The unique ID of the ship
 * @param {number} crewId - The unique ID of the crew member
 * @param {string} name - The new name
 */
function updateCrewName(shipId, crewId, name) {
    const ship = ships.find(s => s.id === shipId);
    if (ship) {
        const crew = ship.crew.find(c => c.id === crewId);
        if (crew) {
            crew.name = name;
            // Cache the Discord ID -> Name association
            cacheCrewMember(crew.discordId, name);
            
            // Check if name matches lead name for auto LEAD role assignment
            const leadNameInput = document.getElementById('lead-name');
            if (leadNameInput && leadNameInput.value.trim().toLowerCase() === name.toLowerCase()) {
                crew.role = 'LEAD';
                renderShips();
                updatePreview();
                saveShipAssignments();
                updateCrewNameDatalist(); // Update available names
                return;
            }
            
            // Sync role AND Discord ID from team member if exists
            if (name && typeof getTeamMembers === 'function') {
                const teamMembers = getTeamMembers();
                const teamMember = teamMembers.find(m => m.name.toLowerCase() === name.toLowerCase());
                if (teamMember) {
                    // Sync role
                    if (teamMember.role) {
                        crew.role = teamMember.role;
                    }
                    // Sync Discord ID
                    if (teamMember.discordId) {
                        crew.discordId = teamMember.discordId;
                        // Update the Discord ID input field in UI
                        const discordInput = document.querySelector(`input[data-crew-id="${crewId}"][data-discord-field="true"]`);
                        if (discordInput) {
                            discordInput.value = teamMember.discordId;
                        }
                    }
                    renderShips();
                    updatePreview();
                }
            }
            
            saveShipAssignments();
            updateCrewNameDatalist(); // Update available names
            // Name doesn't affect preview, so no need to updatePreview()
        }
    }
}

/**
 * Updates the Discord ID of a crew member.
 * If a cached name exists for this Discord ID and the name field is empty,
 * auto-fills the name from cache.
 *
 * @function updateCrewDiscordId
 * @param {number} shipId - The unique ID of the ship
 * @param {number} crewId - The unique ID of the crew member
 * @param {string} discordId - The new Discord ID
 */
function updateCrewDiscordId(shipId, crewId, discordId) {
    const ship = ships.find(s => s.id === shipId);
    if (ship) {
        const crew = ship.crew.find(c => c.id === crewId);
        if (crew) {
            crew.discordId = discordId;

            // Check if we have a cached name for this Discord ID
            const cachedName = getCachedNameByDiscordId(discordId);
            if (cachedName && (!crew.name || crew.name.trim() === "")) {
                // Auto-fill the name from cache
                crew.name = cachedName;
                // Re-render to update the UI
                renderShips();
            }

            // Cache the association (updates existing or creates new)
            cacheCrewMember(discordId, crew.name);

            updatePreview();
            saveShipAssignments();
        }
    }
}

/**
 * Updates the comment field of a crew member.
 * Comments are displayed in parentheses in the output (e.g., "Turret").
 *
 * @function updateCrewComment
 * @param {number} shipId - The unique ID of the ship
 * @param {number} crewId - The unique ID of the crew member
 * @param {string} comment - The new comment
 */
function updateCrewComment(shipId, crewId, comment) {
    const ship = ships.find(s => s.id === shipId);
    if (ship) {
        const crew = ship.crew.find(c => c.id === crewId);
        if (crew) {
            crew.comment = comment;
            updatePreview();
            saveShipAssignments();
        }
    }
}

// ============================================================================
// UI RENDERING FUNCTIONS
// ============================================================================

/**
 * Initializes a custom ship select dropdown with search functionality.
 * Handles dropdown toggle, search filtering, option selection, and outside clicks.
 *
 * @function initializeCustomSelect
 * @param {string} selectId - The ID of the custom select wrapper element
 * @param {number} shipId - The unique ID of the ship this select is for
 */
function initializeCustomSelect(selectId, shipId) {
    const wrapper = document.getElementById(selectId);
    if (!wrapper) return;

    const trigger = wrapper.querySelector(".custom-select-trigger");
    const arrow = wrapper.querySelector(".custom-select-arrow");
    const dropdown = wrapper.querySelector(".custom-select-dropdown");
    const searchInput = wrapper.querySelector(".ship-search-input");
    const optionsContainer = wrapper.querySelector(".custom-select-options");
    const valueDisplay = wrapper.querySelector(".custom-select-value");

    // Toggle dropdown
    trigger.addEventListener("click", e => {
        e.stopPropagation();
        const isOpen = !dropdown.classList.contains("hidden");

        // Close all other dropdowns
        document.querySelectorAll(".custom-select-dropdown").forEach(dd => {
            if (dd !== dropdown) {
                dd.classList.add("hidden");
                const otherTrigger = dd.previousElementSibling;
                otherTrigger.classList.remove("ring-1", "ring-primary-500", "border-primary-500");
                otherTrigger.querySelector(".custom-select-arrow").classList.remove("rotate-180");
            }
        });

        // Toggle this dropdown
        dropdown.classList.toggle("hidden");
        trigger.classList.toggle("ring-1");
        trigger.classList.toggle("ring-primary-500");
        trigger.classList.toggle("border-primary-500");
        arrow.classList.toggle("rotate-180");

        if (!isOpen) {
            searchInput.value = ""; // Clear search
            searchInput.focus();
            // Show all options
            optionsContainer.querySelectorAll(".custom-select-option").forEach(opt => opt.classList.remove("hidden"));
        }
    });

    // Search functionality
    searchInput.addEventListener("input", e => {
        const searchTerm = e.target.value.toLowerCase();
        optionsContainer.querySelectorAll(".custom-select-option").forEach(option => {
            const text = option.textContent.toLowerCase();
            option.classList.toggle("hidden", !text.includes(searchTerm));
        });
    });

    // Prevent search input from closing dropdown
    searchInput.addEventListener("click", e => {
        e.stopPropagation();
    });

    // Option selection
    optionsContainer.addEventListener("click", e => {
        const option = e.target.closest(".custom-select-option");
        if (!option) return;

        const value = option.dataset.value;

        // Update selected state
        optionsContainer.querySelectorAll(".custom-select-option").forEach(opt => {
            opt.classList.remove("bg-mrs-button", "text-white");
        });
        option.classList.add("bg-mrs-button", "text-white");

        // Update display
        valueDisplay.textContent = value;

        // Update ship name
        updateShipName(shipId, value);

        // Close dropdown
        dropdown.classList.add("hidden");
        trigger.classList.remove("ring-1", "ring-primary-500", "border-primary-500");
        arrow.classList.remove("rotate-180");
    });

    // Close dropdown when clicking outside
    document.addEventListener("click", e => {
        if (!wrapper.contains(e.target)) {
            dropdown.classList.add("hidden");
            trigger.classList.remove("ring-1", "ring-primary-500", "border-primary-500");
            arrow.classList.remove("rotate-180");
        }
    });
}

/**
 * Renders all ships and their crew members to the DOM.
 * Creates ship cards with type/name selectors and crew member rows.
 * Initializes drag and drop handlers for each crew member.
 *
 * @function renderShips
 */
function renderShips() {
    const container = document.getElementById("shipList");
    container.innerHTML = "";

    ships.forEach(ship => {
        const shipDiv = document.createElement("div");
        const customSelectId = `custom-select-${ship.id}`;

        // Ship Card
        shipDiv.className = "rounded-lg border border-gray-700 bg-mrs-box p-4 shadow-md";
        shipDiv.innerHTML = `
            <div class="mb-3 flex flex-col items-start gap-3 md:flex-row md:items-center md:justify-between">
                <div class="flex w-full flex-col gap-3 md:w-auto md:flex-row md:items-center">
                    <!-- Ship Type Select -->
                    <select onchange="updateShipType(${
                        ship.id
                    }, this.value)" class="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-white transition focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 md:w-auto">
                        ${Object.keys(EMOJIS.shipTypes)
                            .map(type => `<option value="${type}" ${ship.type === type ? "selected" : ""}>${type}</option>`)
                            .join("")}
                    </select>

                    <!-- Custom Ship Name Select -->
                    <div class="custom-select-wrapper relative w-full min-w-[250px] md:w-auto" id="${customSelectId}">
                        <div class="custom-select-trigger relative flex w-full cursor-pointer items-center justify-between rounded-md border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-gray-200 transition hover:border-primary-500">
                            <span class="custom-select-value truncate pr-4">${ship.ship || "Select a ship..."}</span>
                            <svg class="custom-select-arrow absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 transition-transform duration-200" viewBox="0 0 20 20" fill="currentColor">
                                <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd"/>
                            </svg>
                        </div>
                        <div class="custom-select-dropdown absolute left-0 right-0 top-full z-50 mt-1 hidden overflow-hidden rounded-md border border-gray-600 bg-gray-700 shadow-lg">
                            <div class="border-b border-gray-600 bg-gray-800 p-2">
                                <input type="text" placeholder="Search ships..." class="ship-search-input w-full rounded-md border border-gray-600 bg-gray-900 px-3 py-1.5 text-sm text-gray-200 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500">
                            </div>
                            <div class="custom-select-options custom-scrollbar max-h-60 overflow-y-auto">
                                ${SHIPS.map(
                                    shipName =>
                                        `<div class="custom-select-option cursor-pointer px-3 py-2 text-sm text-gray-300 hover:bg-mrs-button hover:text-white ${
                                            shipName === ship.ship ? "bg-mrs-button text-white" : ""
                                        }" data-value="${shipName}">${shipName}</div>`
                                ).join("")}
                            </div>
                        </div>
                    </div>
                </div>
                <button class="w-full flex-shrink-0 rounded-lg border border-red-600 bg-red-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-red-700 hover:border-red-700 md:w-auto" onclick="removeShip(${
                    ship.id
                })">Remove Ship</button>
            </div>

            <!-- Crew List -->
            <div id="crew-${ship.id}" data-ship-id="${ship.id}" class="crew-list flex min-h-[50px] flex-col gap-2 rounded-md border-2 border-dashed border-gray-800 p-2"></div>

            <!-- Add Crew Button -->
            <button class="mt-3 rounded-lg border border-mrs-button bg-mrs-button px-4 py-2 text-sm font-medium text-white transition hover:border-mrs-button-hover hover:bg-mrs-button-hover" onclick="addCrewMember(${
                ship.id
            })">+ Add Crew Member</button>
        `;
        container.appendChild(shipDiv);

        // Initialize custom select
        initializeCustomSelect(customSelectId, ship.id);

        // Render crew members
        const crewContainer = document.getElementById(`crew-${ship.id}`);

        // Allow dropping on empty crew lists
        crewContainer.addEventListener("dragover", handleDragOver);
        crewContainer.addEventListener("drop", handleDropOnEmptyList);

        ship.crew.forEach(crew => {
            const crewDiv = document.createElement("div");
            crewDiv.className = "crew-member flex flex-wrap items-center gap-2 rounded-lg border border-gray-700 bg-mrs-bg p-2 shadow-sm";
            crewDiv.draggable = true;
            crewDiv.dataset.crewId = crew.id;
            crewDiv.innerHTML = `
                <!-- Drag Handle -->
                <div class="drag-handle flex-shrink-0 cursor-grab active:cursor-grabbing px-1 py-2 text-gray-500 hover:text-gray-300 transition" title="Drag to reorder">
                    <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M7 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 2zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 14zm6-8a2 2 0 1 0-.001-4.001A2 2 0 0 0 13 6zm0 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 14z"/>
                    </svg>
                </div>

                <!-- Position Select (Manual) -->
                <select onchange="updateCrewPosition(${ship.id}, ${
                crew.id
            }, this.value)" class="flex-shrink-0 min-w-[60px] cursor-pointer rounded-lg border border-mrs-button bg-mrs-box px-2 py-2 text-center text-sm font-semibold text-blue-300 transition hover:bg-mrs-button-hover focus:outline-none focus:ring-2 focus:ring-mrs-button">
                    <option value="" ${!crew.position ? "selected" : ""}>-</option>
                    ${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => `<option value="${num}" ${(crew.position || "") === num ? "selected" : ""}>${num}</option>`).join("")}
                </select>

                <!-- Role Select -->
                <select onchange="updateCrewRole(${ship.id}, ${
                crew.id
            }, this.value)" class="flex-none min-w-[100px] rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-gray-300 transition focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 md:w-auto">
                    ${Object.keys(EMOJIS.roles)
                        .filter(role => role !== 'LEAD')
                        .map(role => `<option value="${role}" ${crew.role === role ? "selected" : ""}>${role}</option>`)
                        .join("")}
                    ${crew.role === 'LEAD' ? `<option value="LEAD" selected>LEAD</option>` : ''}
                </select>

                <!-- Name Input (with autocomplete from cached names) -->
                <input type="text" placeholder="Name (optional)"
                       value="${crew.name || ""}"
                       onchange="updateCrewName(${ship.id}, ${crew.id}, this.value)"
                       list="crew-name-suggestions"
                       autocomplete="off"
                       draggable="false"
                       class="hidden w-36 rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-gray-200 transition placeholder:italic placeholder:text-gray-500 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 md:block">

                <!-- Discord ID Input -->
                <input type="text" placeholder="Discord ID (e.g., 640...)"
                       value="${crew.discordId}"
                       onchange="updateCrewDiscordId(${ship.id}, ${crew.id}, this.value)"
                       draggable="false"
                       class="flex-1 min-w-[150px] rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-gray-200 transition placeholder:text-gray-500 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 md:flex-none md:w-48">

                <!-- Comment Input -->
                <input type="text" placeholder="Comment (e.g., Turret)"
                       value="${crew.comment || ""}"
                       onchange="updateCrewComment(${ship.id}, ${crew.id}, this.value)"
                       draggable="false"
                       class="flex-1 min-w-[150px] rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-gray-200 transition placeholder:italic placeholder:text-gray-500 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500">

                <!-- Remove Crew Button -->
                <button class="flex-shrink-0 rounded-lg border border-red-600 bg-red-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-red-700 hover:border-red-700" onclick="removeCrewMember(${
                    ship.id
                }, ${crew.id})">×</button>
            `;

            // Drag and drop handlers
            crewDiv.addEventListener("dragstart", handleDragStart);
            crewDiv.addEventListener("dragend", handleDragEnd);
            crewDiv.addEventListener("dragover", handleDragOver);
            crewDiv.addEventListener("drop", handleDrop);

            crewContainer.appendChild(crewDiv);
        });
    });
}

// ============================================================================
// DRAG AND DROP FUNCTIONS
// ============================================================================

/**
 * Closes all custom select dropdowns.
 * Called before drag operations to prevent z-index conflicts.
 *
 * @function closeAllDropdowns
 */
function closeAllDropdowns() {
    document.querySelectorAll(".custom-select-dropdown").forEach(dropdown => {
        dropdown.classList.add("hidden");
        const wrapper = dropdown.closest(".custom-select-wrapper");
        if (wrapper) {
            const trigger = wrapper.querySelector(".custom-select-trigger");
            const arrow = wrapper.querySelector(".custom-select-arrow");
            if (trigger) {
                trigger.classList.remove("ring-1", "ring-primary-500", "border-primary-500");
            }
            if (arrow) {
                arrow.classList.remove("rotate-180");
            }
        }
    });
}

/**
 * Handles the start of a drag operation for a crew member.
 *
 * @function handleDragStart
 * @param {DragEvent} e - The drag start event
 */
function handleDragStart(e) {
    // Close all dropdowns to prevent z-index conflicts
    closeAllDropdowns();

    // Use currentTarget - the element the listener is attached to (the crew-member div)
    // This is more reliable than e.target.closest() which can pick wrong elements
    draggedElement = e.currentTarget;
    if (!draggedElement || !draggedElement.classList.contains("crew-member")) return;

    // Store the crew ID in dataTransfer for reliable retrieval
    const crewId = draggedElement.dataset.crewId;
    const shipId = draggedElement.closest(".crew-list").dataset.shipId;

    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", JSON.stringify({ crewId, shipId }));

    draggedShipId = parseInt(shipId);

    // Use setTimeout to allow the browser to render the drag image
    setTimeout(() => {
        if (draggedElement) {
            draggedElement.classList.add("dragging");
        }
    }, 0);
}

/**
 * Handles the end of a drag operation.
 * Cleans up the dragging state.
 *
 * @function handleDragEnd
 * @param {DragEvent} e - The drag end event
 */
function handleDragEnd(e) {
    if (draggedElement) {
        draggedElement.classList.remove("dragging");
        draggedElement = null;
    }
}

/**
 * Handles the drag over event to allow dropping.
 *
 * @function handleDragOver
 * @param {DragEvent} e - The drag over event
 */
function handleDragOver(e) {
    e.preventDefault();
}

/**
 * Handles dropping a crew member onto another crew member.
 * Supports both reordering within the same ship and moving between ships.
 *
 * @function handleDrop
 * @param {DragEvent} e - The drop event
 */
function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();

    // Get dragged data from dataTransfer (more reliable than global variable)
    let draggedCrewId, draggedShipIdFromData;
    try {
        const data = JSON.parse(e.dataTransfer.getData("text/plain"));
        draggedCrewId = parseFloat(data.crewId);
        draggedShipIdFromData = parseInt(data.shipId);
    } catch {
        // Fallback to global variable
        if (!draggedElement) return;
        draggedCrewId = parseFloat(draggedElement.dataset.crewId);
        draggedShipIdFromData = draggedShipId;
    }

    // Use currentTarget for the drop target (the element with the listener)
    const targetElement = e.currentTarget;
    if (!targetElement || !targetElement.classList.contains("crew-member")) return;

    const targetCrewId = parseFloat(targetElement.dataset.crewId);

    // Don't drop on self
    if (draggedCrewId === targetCrewId) return;

    const targetShipId = parseInt(targetElement.closest(".crew-list").dataset.shipId);
    const draggedShip = ships.find(s => s.id === draggedShipIdFromData);
    const targetShip = ships.find(s => s.id === targetShipId);

    if (!draggedShip || !targetShip) return;

    if (draggedShipIdFromData === targetShipId) {
        // Reordering within the same ship
        const draggedIndex = draggedShip.crew.findIndex(c => c.id === draggedCrewId);
        const targetIndex = draggedShip.crew.findIndex(c => c.id === targetCrewId);

        if (draggedIndex === -1 || targetIndex === -1) return;

        // Swap positions
        [draggedShip.crew[draggedIndex], draggedShip.crew[targetIndex]] = [draggedShip.crew[targetIndex], draggedShip.crew[draggedIndex]];
    } else {
        // Moving crew member to a different ship
        const draggedCrewIndex = draggedShip.crew.findIndex(c => c.id === draggedCrewId);
        const targetCrewIndex = targetShip.crew.findIndex(c => c.id === targetCrewId);

        if (draggedCrewIndex === -1) return;

        // Remove from original ship
        const crewMember = draggedShip.crew.splice(draggedCrewIndex, 1)[0];

        // Insert into target ship at target position
        targetShip.crew.splice(targetCrewIndex, 0, crewMember);
    }

    // Clean up and re-render
    if (draggedElement) {
        draggedElement.classList.remove("dragging");
        draggedElement = null;
    }
    renderShips();
    updatePreview();
    saveShipAssignments();
}

/**
 * Handles dropping a crew member onto an empty crew list.
 * Moves the crew member to the end of the target ship's crew list.
 *
 * @function handleDropOnEmptyList
 * @param {DragEvent} e - The drop event
 */
function handleDropOnEmptyList(e) {
    e.preventDefault();

    // Only handle if dropped on the crew list itself, not on a crew member
    if (!e.target.classList.contains("crew-list")) return;

    // Get dragged data from dataTransfer
    let draggedCrewId, draggedShipIdFromData;
    try {
        const data = JSON.parse(e.dataTransfer.getData("text/plain"));
        draggedCrewId = parseFloat(data.crewId);
        draggedShipIdFromData = parseInt(data.shipId);
    } catch {
        // Fallback to global variable
        if (!draggedElement) return;
        draggedCrewId = parseFloat(draggedElement.dataset.crewId);
        draggedShipIdFromData = draggedShipId;
    }

    const targetShipId = parseInt(e.target.dataset.shipId);
    const draggedShip = ships.find(s => s.id === draggedShipIdFromData);
    const targetShip = ships.find(s => s.id === targetShipId);

    if (!draggedShip || !targetShip) return;

    // Only move if dragging to a different ship
    if (draggedShipIdFromData !== targetShipId) {
        const draggedCrewIndex = draggedShip.crew.findIndex(c => c.id === draggedCrewId);
        if (draggedCrewIndex === -1) return;

        // Remove from original ship
        const crewMember = draggedShip.crew.splice(draggedCrewIndex, 1)[0];

        // Add to end of target ship
        targetShip.crew.push(crewMember);

        // Clean up and re-render
        if (draggedElement) {
            draggedElement.classList.remove("dragging");
            draggedElement = null;
        }
        renderShips();
        updatePreview();
        saveShipAssignments();
    }
}

// ============================================================================
// OUTPUT GENERATION AND PREVIEW FUNCTIONS
// ============================================================================

/**
 * Generates the Discord-formatted output for ship assignments.
 * Includes ship types, names, crew members with roles, positions, and comments.
 * Adds a timestamp at the end.
 *
 * @function generateOutput
 * @returns {string} The formatted Discord message
 */
function generateOutput() {
    // Generate UTC timestamp for Discord relative time
    const timestamp = Math.floor(Date.now() / 1000);

    let output = `# __${EMOJIS.header}SHIP ASSIGNMENTS${EMOJIS.header}__\n\n`;

    ships.forEach(ship => {
        if (ship.crew.length > 0) {
            const shipTypeEmoji = EMOJIS.shipTypes[ship.type] || "🚀";
            output += `## __**${ship.type}**__ ${shipTypeEmoji} ${ship.ship}\n`;

            ship.crew.forEach(crew => {
                const roleEmoji = EMOJIS.roles[crew.role] || "👤";
                const mention = crew.discordId ? `<@${crew.discordId}>` : "[No Discord ID]";

                let positionText = "";
                if (crew.position) {
                    const positionEmoji = EMOJIS.positions[crew.position] || crew.position;
                    positionText = ` ${positionEmoji}`; // Only add if position is set
                }

                let commentText = "";
                if (crew.comment && crew.comment.trim() !== "") {
                    commentText = ` (${crew.comment.trim()})`; // Add leading space and parenthesis
                }

                output += `> ${roleEmoji} - ${mention}${positionText}${commentText}\n`;
            });

            output += "\n";
        }
    });

    // Add timestamp at the end in smaller text
    output += `-# Updated <t:${timestamp}:R>`;

    return output;
}

/**
 * Updates the preview area with the current ship assignment output.
 * Shows a placeholder message if no ships or crew are added.
 *
 * @function updatePreview
 */
function updatePreview() {
    const preview = document.getElementById("preview");
    if (ships.length === 0 || ships.every(s => s.crew.length === 0)) {
        preview.textContent = "Add ships and crew members to see preview...";
    } else {
        preview.textContent = generateOutput();
    }
}

/**
 * Copies the generated ship assignment output to the clipboard.
 * Uses the Clipboard API with a fallback to execCommand for older browsers.
 * Shows a success message on successful copy.
 *
 * @function copyToClipboard
 */
function copyToClipboard() {
    const output = generateOutput();

    // Use execCommand as a fallback for clipboard API
    if (!navigator.clipboard) {
        try {
            const textArea = document.createElement("textarea");
            textArea.value = output;
            textArea.style.position = "fixed"; // Prevent scrolling to bottom
            textArea.style.top = "0";
            textArea.style.left = "0";
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            document.execCommand("copy");
            document.body.removeChild(textArea);
            showSuccessMessage();
        } catch (err) {
            console.error("Fallback: Oops, unable to copy", err);
            alert("Failed to copy to clipboard. Please try again.");
        }
        return;
    }

    navigator.clipboard
        .writeText(output)
        .then(() => {
            showSuccessMessage();
        })
        .catch(err => {
            alert("Failed to copy to clipboard. Please try again.");
            console.error("Failed to copy:", err);
        });
}

/**
 * Shows a success message when content is copied to clipboard.
 * Message auto-hides after 3 seconds.
 *
 * @function showSuccessMessage
 */
function showSuccessMessage() {
    const successMessage = document.getElementById("successMessage");
    successMessage.classList.remove("hidden");
    setTimeout(() => {
        successMessage.classList.add("hidden");
    }, 3000);
}

// ============================================================================
// DISCORD IMPORT FUNCTIONALITY
// ============================================================================

/**
 * Imports ship assignments from a Discord message.
 * Parses the Discord-formatted message and populates the ship list.
 * Shows success or error status after import.
 *
 * @function importFromDiscord
 */
function importFromDiscord() {
    const message = document.getElementById("import-discord-message").value;
    const statusEl = document.getElementById("import-status");

    if (!message.trim()) {
        showImportStatus("error", "Please paste a Discord message first.");
        return;
    }

    try {
        // Parse the Discord message
        const parsedShips = parseDiscordMessage(message);

        if (parsedShips.length === 0) {
            showImportStatus("error", "No ships found in the message. Make sure it's a valid ship assignment message.");
            return;
        }

        // Clear existing ships and populate with parsed data
        ships = parsedShips;
        shipIdCounter = Math.max(...ships.map(s => s.id), 0) + 1;

        renderShips();
        updatePreview();
        saveShipAssignments();

        // Close modal immediately
        closeImportModal();

        // Show success banner above Ship Groups
        showImportSuccessBanner(`Successfully imported ${parsedShips.length} ship(s) with ${parsedShips.reduce((sum, s) => sum + s.crew.length, 0)} crew member(s)!`);
    } catch (error) {
        console.error("Import error:", error);
        showImportStatus("error", "Failed to parse message: " + error.message);
    }
}

/**
 * Parses a Discord-formatted ship assignment message.
 * Extracts ships, crew members, roles, positions, and comments.
 *
 * @function parseDiscordMessage
 * @param {string} message - The Discord message to parse
 * @returns {Array<Object>} Array of parsed ship objects
 */
function parseDiscordMessage(message) {
    const parsedShips = [];
    let currentShipId = 0;

    // Split message into lines
    const lines = message.split("\n");

    let currentShip = null;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        // Skip empty lines
        if (!line) {
            continue;
        }

        // Skip main header (starts with single #)
        if (line.match(/^#\s+__/)) {
            continue;
        }

        // Skip footer (starts with -#)
        if (line.startsWith("-#")) {
            continue;
        }

        // Check if line is a ship header: ## __**{Type}**__ {emoji} {ship name}
        // More flexible regex to capture ship name after emoji
        const shipMatch = line.match(/^##\s*__\*\*(.+?)\*\*__\s*<:[^>]+>\s+(.+)$/);
        if (shipMatch) {
            const shipType = shipMatch[1].trim();
            const shipName = shipMatch[2].trim();

            // If we have a current ship, save it
            if (currentShip) {
                parsedShips.push(currentShip);
            }

            // Start a new ship
            currentShip = {
                id: currentShipId++,
                type: shipType,
                ship: shipName,
                crew: []
            };
            continue;
        }

        // Check if line is a crew member: > {roleEmoji} - <@{discordId}> {position?} {comment?}
        const crewMatch = line.match(/^>\s*(<:[^>]+>)\s*-\s*<@(\d+)>\s*(.*)/);
        if (crewMatch && currentShip) {
            const roleEmoji = crewMatch[1];
            const discordId = crewMatch[2];
            const remainder = crewMatch[3].trim();

            // Find role from emoji
            const role = EMOJI_TO_ROLE[roleEmoji] || "PIL";

            // Parse position and comment from remainder
            let position = null;
            let comment = "";

            // Try to find position emoji (with <: brackets)
            for (const [emoji, num] of Object.entries(EMOJI_TO_POSITION)) {
                if (remainder.includes(emoji)) {
                    position = num;
                    // Remove position emoji from remainder to get comment
                    const parts = remainder.replace(emoji, "").trim();
                    // Extract comment from parentheses if present
                    const commentMatch = parts.match(/\(([^)]+)\)/);
                    if (commentMatch) {
                        comment = commentMatch[1].trim();
                    }
                    break;
                }
            }

            // Try to find position without <: brackets (e.g., :P5:)
            if (!position) {
                const barePositionMatch = remainder.match(/:P(\d):/);
                if (barePositionMatch) {
                    position = parseInt(barePositionMatch[1]);
                    // Remove position from remainder to get comment
                    const parts = remainder.replace(barePositionMatch[0], "").trim();
                    // Extract comment from parentheses if present
                    const commentMatch = parts.match(/\(([^)]+)\)/);
                    if (commentMatch) {
                        comment = commentMatch[1].trim();
                    }
                }
            }

            // If no position found, check for comment anyway
            if (!position) {
                const commentMatch = remainder.match(/\(([^)]+)\)/);
                if (commentMatch) {
                    comment = commentMatch[1].trim();
                }
            }

            currentShip.crew.push({
                id: Date.now() + Math.random(), // Unique ID
                role: role,
                position: position,
                name: getCachedNameByDiscordId(discordId) || "", // Auto-fill from cache
                discordId: discordId,
                comment: comment
            });
        }
    }

    // Don't forget to add the last ship
    if (currentShip) {
        parsedShips.push(currentShip);
    }

    return parsedShips;
}

/**
 * Shows an import status message (success or error).
 * Message auto-hides after 5 seconds.
 *
 * @function showImportStatus
 * @param {string} type - The status type ('success' or 'error')
 * @param {string} message - The status message to display
 */
function showImportStatus(type, message) {
    const statusEl = document.getElementById("import-status");
    statusEl.className = "mt-3 rounded-lg px-4 py-3 text-center font-medium";

    if (type === "success") {
        statusEl.classList.add("bg-green-600", "text-white");
    } else {
        statusEl.classList.add("bg-red-600", "text-white");
    }

    statusEl.textContent = message;
    statusEl.classList.remove("hidden");

    setTimeout(() => {
        statusEl.classList.add("hidden");
    }, 5000);
}

// ============================================================================
// IMPORT MODAL FUNCTIONS
// ============================================================================

/**
 * Opens the Import from Discord modal.
 * Displays the modal overlay with flex centering.
 *
 * @function openImportModal
 */
function openImportModal() {
    const modal = document.getElementById("import-modal");
    if (modal) {
        modal.classList.remove("hidden");
        modal.classList.add("flex");
        // Focus the textarea
        const textarea = document.getElementById("import-discord-message");
        if (textarea) {
            textarea.focus();
        }
    }
}

/**
 * Closes the Import from Discord modal.
 * Hides the modal and clears any status messages.
 *
 * @function closeImportModal
 */
function closeImportModal() {
    const modal = document.getElementById("import-modal");
    if (modal) {
        modal.classList.add("hidden");
        modal.classList.remove("flex");
        // Clear the textarea and status
        document.getElementById("import-discord-message").value = "";
        const statusEl = document.getElementById("import-status");
        if (statusEl) {
            statusEl.classList.add("hidden");
        }
    }
}

/**
 * Shows a success banner above the Ship Groups card.
 * Banner auto-hides after 4 seconds.
 *
 * @function showImportSuccessBanner
 * @param {string} message - The success message to display
 */
function showImportSuccessBanner(message) {
    const banner = document.getElementById("import-success-banner");
    const messageEl = document.getElementById("import-success-message");

    if (banner && messageEl) {
        messageEl.textContent = message;
        banner.classList.remove("hidden");

        // Auto-hide after 4 seconds
        setTimeout(() => {
            banner.classList.add("hidden");
        }, 4000);
    }
}

/**
 * Syncs a team member's role to all ship assignments where they are assigned.
 * Called when a team member's role is updated in the Home tab.
 *
 * @function syncTeamMemberRoleToShips
 * @param {string} memberName - The name of the team member
 * @param {string} newRole - The new role to apply
 */
function syncTeamMemberRoleToShips(memberName, newRole) {
    if (!memberName) return;
    
    let updated = false;
    ships.forEach(ship => {
        ship.crew.forEach(crew => {
            if (crew.name && crew.name.toLowerCase() === memberName.toLowerCase()) {
                crew.role = newRole;
                updated = true;
            }
        });
    });
    
    if (updated) {
        renderShips();
        updatePreview();
        saveShipAssignments();
    }
}

/**
 * Sync a team member's Discord ID to all their ship assignments
 * @function syncTeamMemberDiscordIdToShips
 * @param {string} memberName - The name of the team member
 * @param {string} discordId - The new Discord ID
 */
function syncTeamMemberDiscordIdToShips(memberName, discordId) {
    if (!memberName) return;
    
    let updated = false;
    ships.forEach(ship => {
        ship.crew.forEach(crew => {
            if (crew.name && crew.name.toLowerCase() === memberName.toLowerCase()) {
                crew.discordId = discordId;
                updated = true;
            }
        });
    });
    
    if (updated) {
        renderShips();
        updatePreview();
        saveShipAssignments();
    }
}

