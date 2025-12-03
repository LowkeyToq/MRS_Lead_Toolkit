/**
 * Main initialization file for Medrunner Operations Tool
 * This file initializes all modules and sets up event listeners
 */

/**
 * Initialize the application when DOM is loaded
 */
document.addEventListener("DOMContentLoaded", () => {
    console.log("Medrunner Operations Tool - Initializing...");

    // Initialize Ships API - fetch ship list from API
    initializeShips();

    // Initialize AAR Planetary Bodies - load locations database
    initializePlanetaryBodies();

    // Set up conditional field visibility for AAR form
    setupAARConditionalFields();

    // Set up tip splitter recipient count listener
    setupTipSplitterListeners();

    console.log("Medrunner Operations Tool - Ready!");
});

/**
 * Sets up conditional field visibility for AAR form
 * Shows/hides "Other" input fields based on dropdown selections
 */
function setupAARConditionalFields() {
    // Show/hide Location Type "Other" free-form input
    const locationTypeSelect = document.getElementById("aar-location-type");
    const locationTypeOther = document.getElementById("aar-location-type-other");
    if (locationTypeSelect && locationTypeOther) {
        locationTypeSelect.addEventListener("change", e => {
            if (e.target.value === "Other") {
                locationTypeOther.classList.remove("hidden");
            } else {
                locationTypeOther.classList.add("hidden");
                locationTypeOther.value = "";
            }
        });
    }

    // Show/hide Challenges "Other" free-form input
    const challengesSelect = document.getElementById("aar-challenges");
    const challengesOther = document.getElementById("aar-challenges-other");
    if (challengesSelect && challengesOther) {
        challengesSelect.addEventListener("change", e => {
            if (e.target.value === "Other") {
                challengesOther.classList.remove("hidden");
            } else {
                challengesOther.classList.add("hidden");
                challengesOther.value = "";
            }
        });
    }

    // Show/hide "Client Extracted To" based on mission outcome
    const outcomeSelect = document.getElementById("aar-outcome");
    const extractedContainer = document.getElementById("aar-extracted-container");
    if (outcomeSelect && extractedContainer) {
        outcomeSelect.addEventListener("change", e => {
            if (e.target.value === "Success") {
                extractedContainer.classList.remove("hidden");
            } else {
                extractedContainer.classList.add("hidden");
                // Reset extracted fields when hidden
                document.getElementById("aar-extracted-value").textContent = "Select...";
                document.getElementById("aar-extracted-other").value = "";
                document.getElementById("aar-extracted-other").classList.add("hidden");
            }
        });
    }
}

/**
 * Sets up tip splitter event listeners
 * Handles recipient count input changes
 */
function setupTipSplitterListeners() {
    const recipientsInput = document.getElementById("tip-recipients");
    if (recipientsInput) {
        recipientsInput.addEventListener("input", e => {
            const count = parseInt(e.target.value) || 0;
            generateRecipientsList(count);
        });
    }
}
