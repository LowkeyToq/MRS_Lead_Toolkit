/**
 * UI Utilities Module
 *
 * General UI utility functions for the MRS Lead Toolkit.
 * This module contains UI-related helper functions that are used across
 * multiple modules and don't belong to any specific feature (ship assignment, AAR, tip splitter).
 *
 * @module ui
 */

/**
 * Switches between different tabs in the application.
 *
 * This function handles the tab navigation by:
 * 1. Hiding all tab content panels
 * 2. Removing active styling from all tab buttons
 * 3. Showing the selected tab's content panel
 * 4. Applying active styling to the selected tab button
 * 5. Performing tab-specific initialization (e.g., for AAR tab)
 *
 * The function expects specific HTML structure:
 * - Tab buttons with IDs in format: "tab-{tabName}"
 * - Tab content panels with IDs in format: "content-{tabName}"
 * - Tab buttons should have class "tab-button"
 * - Tab content panels should have class "tab-content"
 *
 * @param {string} tabName - The name/identifier of the tab to switch to (e.g., 'ships', 'aar', 'tip-splitter')
 *
 * @example
 * // Switch to the ship assignment tab
 * switchTab('ships');
 *
 * @example
 * // Switch to the AAR tab
 * switchTab('aar');
 *
 * @requires AAR module functions (populateAARShipDropdowns, initializeAARPlanetSelect, initializeAARPOISelect)
 * @requires PLANETARY_BODIES global variable for AAR location data
 */
function switchTab(tabName) {
    // Hide all tab contents
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.add('hidden');
    });

    // Remove active state from all tabs
    document.querySelectorAll('.tab-button').forEach(button => {
        button.classList.remove('active', 'border-mrs-button', 'text-white');
        button.classList.add('border-transparent', 'text-gray-400');
    });

    // Show selected tab content
    document.getElementById('content-' + tabName).classList.remove('hidden');

    // Add active state to selected tab
    const activeTab = document.getElementById('tab-' + tabName);
    activeTab.classList.add('active', 'border-mrs-button', 'text-white');
    activeTab.classList.remove('border-transparent', 'text-gray-400');

    // If switching to AAR tab, populate ship dropdowns and re-initialize location dropdowns
    if (tabName === 'aar') {
        populateAARShipDropdowns();
        // Re-initialize planet and POI dropdowns to ensure event listeners are attached
        if (PLANETARY_BODIES.length > 0) {
            initializeAARPlanetSelect();
        }
        initializeAARPOISelect();
    }
}

/**
 * Opens the Import from Discord modal.
 * Makes the modal visible by removing the 'hidden' class and replacing it with 'flex'.
 * This allows users to import ship assignments from a Discord message.
 *
 * @example
 * // Open the import modal
 * openImportModal();
 */
function openImportModal() {
    const modal = document.getElementById('import-modal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    // Clear any previous import status
    const statusEl = document.getElementById('import-status');
    if (statusEl) {
        statusEl.classList.add('hidden');
    }
    // Focus on the textarea for better UX
    setTimeout(() => {
        document.getElementById('import-discord-message').focus();
    }, 100);
}

/**
 * Closes the Import from Discord modal.
 * Hides the modal by removing 'flex' class and adding 'hidden' class.
 * Also clears the textarea and status message.
 *
 * @example
 * // Close the import modal
 * closeImportModal();
 */
function closeImportModal() {
    const modal = document.getElementById('import-modal');
    modal.classList.remove('flex');
    modal.classList.add('hidden');
    // Clear textarea
    document.getElementById('import-discord-message').value = '';
    // Clear status
    const statusEl = document.getElementById('import-status');
    if (statusEl) {
        statusEl.classList.add('hidden');
    }
}

// ES6 Module Export (if needed in the future)
// export { switchTab, openImportModal, closeImportModal };
