/**
 * TIP SPLITTER MODULE
 *
 * Handles the complex logic for distributing tips among crew members in Star Citizen,
 * accounting for the game's 0.5% transfer fee system and ensuring fair distribution.
 *
 * Core Features:
 * - Fair tip distribution with equal take-home amounts for all participants
 * - Star Citizen transfer fee calculations (0.5% rounded up)
 * - Support for multiple recipient choices (keep, donate to logistics, decline)
 * - Lead choice handling (keep, donate, decline)
 * - Automatic redistribution of declined shares
 * - Crew import from ship assignments
 *
 * Transfer Fee System:
 * Star Citizen charges a 0.5% fee on all transfers, rounded UP to the nearest aUEC.
 * This module ensures that everyone who chooses to keep their tip receives the same
 * final amount, accounting for these fees.
 */

// ===== STATE VARIABLES =====

/**
 * Array of all tip recipients with their choices
 * @type {Array<{id: number, name: string, choice: string}>}
 */
let tipRecipients = [];

// ===== CONSTANTS =====

/**
 * Star Citizen's transfer fee rate (0.5%)
 * @constant {number}
 */
const TRANSFER_FEE_RATE = 0.005;

/**
 * Valid recipient choices
 * @constant {Object}
 */
const RECIPIENT_CHOICES = {
    KEEP: "keep", // Recipient wants to keep their tip
    DECLINE: "decline", // Recipient doesn't want the tip (redistributed)
    LOGISTICS: "logistics" // Recipient donates their share to logistics pool
};

/**
 * Valid lead choices
 * @constant {Object}
 */
const LEAD_CHOICES = {
    KEEP: "lead-keep", // Lead keeps their share
    DECLINE: "lead-decline", // Lead doesn't want tip (redistributed)
    LOGISTICS: "lead-logistics" // Lead donates their share to logistics
};

// ===== RECIPIENT MANAGEMENT FUNCTIONS =====

/**
 * Imports crew count from ship assignments and generates recipient list.
 * Accesses the global 'ships' array from the Ship Assignment module.
 *
 * @requires ships - Global array from ship assignment module
 */
function importCrewForTip() {
    const totalCrew = ships.reduce((sum, ship) => sum + ship.crew.length, 0);

    if (totalCrew === 0) {
        alert("No crew members found in ship assignments. Please add crew first or enter a number manually.");
        return;
    }

    document.getElementById("tip-recipients").value = totalCrew;
    generateRecipientsList(totalCrew);
}

/**
 * Generates the recipients list UI based on the specified count.
 * Creates recipient objects with default values and renders input fields.
 *
 * @param {number} count - Number of recipients to generate
 */
function generateRecipientsList(count) {
    const container = document.getElementById("tip-recipients-list");

    if (!count || count < 1) {
        container.innerHTML = '<div class="px-3 py-2 text-sm text-gray-400">Add crew members by entering a number above or importing from ship assignments.</div>';
        tipRecipients = [];
        return;
    }

    tipRecipients = [];
    let html = "";

    for (let i = 1; i <= count; i++) {
        tipRecipients.push({
            id: i,
            name: `Recipient ${i}`,
            choice: RECIPIENT_CHOICES.KEEP // Default: keep tip
        });

        html += `
            <div class="flex flex-col gap-2 rounded-lg border border-gray-700 bg-mrs-bg p-3 md:flex-row md:items-center md:gap-3">
                <span class="flex-shrink-0 font-semibold text-blue-300">#${i}</span>
                <input type="text" placeholder="Name (optional)" value="" onchange="updateRecipientName(${i}, this.value)" class="flex-1 rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-gray-200 transition focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500">
                <select onchange="updateRecipientChoice(${i}, this.value)" class="flex-shrink-0 rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-gray-200 transition focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500">
                    <option value="${RECIPIENT_CHOICES.KEEP}">Keep Tip</option>
                    <option value="${RECIPIENT_CHOICES.DECLINE}">Don't Want Tip</option>
                    <option value="${RECIPIENT_CHOICES.LOGISTICS}">Donate to Logistics</option>
                </select>
            </div>
        `;
    }

    container.innerHTML = html;
}

/**
 * Updates the name of a specific recipient.
 *
 * @param {number} id - The recipient's ID
 * @param {string} name - The new name (or empty string for default)
 */
function updateRecipientName(id, name) {
    const recipient = tipRecipients.find(r => r.id === id);
    if (recipient) {
        recipient.name = name || `Recipient ${id}`;
    }
}

/**
 * Updates the choice of a specific recipient.
 *
 * @param {number} id - The recipient's ID
 * @param {string} choice - The new choice ('keep', 'decline', or 'logistics')
 */
function updateRecipientChoice(id, choice) {
    const recipient = tipRecipients.find(r => r.id === id);
    if (recipient) {
        recipient.choice = choice;
    }
}

// ===== TRANSFER FEE CALCULATION FUNCTIONS =====

/**
 * Calculates the total cost (amount + fee) for a given transfer.
 * Star Citizen charges a 0.5% fee rounded UP to the nearest aUEC.
 *
 * Example:
 * - Transfer 1000 aUEC: fee = ceil(1000 * 0.005) = 5, total cost = 1005
 * - Transfer 999 aUEC: fee = ceil(999 * 0.005) = 5, total cost = 1004
 *
 * @param {number} amountSent - The amount being sent to the recipient
 * @returns {number} Total cost including the transfer fee
 */
function getTransferCost(amountSent) {
    if (amountSent <= 0) return 0;
    // Use integers to avoid floating point issues
    const amount = Math.floor(amountSent);
    const fee = Math.ceil(amount * TRANSFER_FEE_RATE);
    return amount + fee;
}

/**
 * Finds the maximum amount you can send (transferAmount) so that the total cost
 * (including the rounded-up fee) does not exceed the allottedShare (budget).
 *
 * This is an optimization problem where we need to find the largest X such that:
 * X + ceil(X * 0.005) <= budget
 *
 * Uses an iterative approach starting with an approximation and adjusting until
 * we find the maximum valid transfer amount.
 *
 * @param {number} allottedShare - The maximum budget available for this transfer
 * @returns {number} The maximum amount that can be sent
 */
function findMaxTransferAmount(allottedShare) {
    if (allottedShare <= 0) return 0;

    // Start with a guess that approximates the inverse of the fee formula
    let guessAmount = Math.floor(allottedShare / 1.005);
    let costOfGuess = getTransferCost(guessAmount);

    // If our guess is too high, decrease until it fits
    if (costOfGuess > allottedShare) {
        while (costOfGuess > allottedShare) {
            guessAmount--;
            costOfGuess = getTransferCost(guessAmount);
        }
    } else {
        // If our guess is too low, increase while it still fits
        while (getTransferCost(guessAmount + 1) <= allottedShare) {
            guessAmount++;
        }
    }
    return guessAmount;
}

/**
 * CORE ALGORITHM: Finds the maximum "Equal Take-Home Amount" where everyone
 * receives the same final amount, accounting for all transfer fees.
 *
 * This is the heart of the fair distribution system. The algorithm:
 * 1. Starts with an initial guess (total pool / number of shares)
 * 2. For each guess, calculates the total cost of all transfers
 * 3. Iteratively decreases the guess until the total cost fits within the pool
 * 4. Returns the highest amount that allows everyone to receive equal shares
 *
 * The complexity arises because:
 * - Each recipient transfer has a fee
 * - The logistics transfer (if any) pools multiple shares but has one fee
 * - The lead (if keeping) has no fee
 * - Fees are rounded up, making this non-linear
 *
 * @param {number} totalActivePool - Total aUEC available to distribute
 * @param {number} totalActiveShares - Number of people who aren't declining
 * @param {number} numKeeperTransfers - Number of recipients keeping their tip (excludes lead)
 * @param {number} activeDonatorsCount - Number of people donating to logistics (includes lead if applicable)
 * @param {boolean} leadIsKeeping - Whether the lead is keeping their share
 * @returns {number} The equal take-home amount for each active participant
 */
function findEqualTakeHomeAmount(totalActivePool, totalActiveShares, numKeeperTransfers, activeDonatorsCount, leadIsKeeping) {
    if (totalActiveShares === 0) return 0;

    // Start with a guess that ignores fees
    let guessAmount = Math.floor(totalActivePool / totalActiveShares);

    while (guessAmount > 0) {
        // Calculate the total cost for this guessed equal amount (X)
        let totalCostForThisGuess = 0;

        // 1. Cost for all keeper transfers (each recipient gets X, each has a fee)
        totalCostForThisGuess += getTransferCost(guessAmount) * numKeeperTransfers;

        // 2. Cost for logistics transfer (if any)
        if (activeDonatorsCount > 0) {
            // The logistics pool is entitled to X * (number of donators)
            const logisticsPoolEntitlement = guessAmount * activeDonatorsCount;
            // Find the max we can send that is <= this entitlement
            const logisticsTransferAmount = findMaxTransferAmount(logisticsPoolEntitlement);
            // Add the cost of sending that amount
            totalCostForThisGuess += getTransferCost(logisticsTransferAmount);
        }

        // 3. Cost for lead (if keeping) - no transfer fee
        if (leadIsKeeping) {
            totalCostForThisGuess += guessAmount;
        }

        // Check if this guess is valid
        if (totalCostForThisGuess <= totalActivePool) {
            // This guess works! Since we're counting down, this is the highest possible.
            return guessAmount;
        }

        // This guess was too high. Try a smaller amount.
        guessAmount--;
    }

    return 0; // No solution found (e.g., fees exceed pool)
}

// ===== MAIN CALCULATION FUNCTION =====

/**
 * Calculates the tip split using the fair distribution algorithm.
 * This is the main entry point for tip calculations.
 *
 * Process:
 * 1. Validate inputs (tip amount, recipient count)
 * 2. Categorize all participants (keeping, donating, declining)
 * 3. Calculate active pool and shares (excluding decliners)
 * 4. Find equal take-home amount using core algorithm
 * 5. Generate final transfer list
 * 6. Calculate lead's final amount (share + dust/leftovers)
 * 7. Display results
 *
 * Special Cases:
 * - Everyone declined: Lead keeps everything
 * - Mixed choices: Declined shares are redistributed among active participants
 * - Logistics donations: Pooled into single transfer to minimize fees
 */
function calculateTipSplit() {
    const totalTip = Math.floor(parseFloat(document.getElementById("tip-total").value)) || 0;

    // --- 0. VALIDATION ---
    if (totalTip <= 0) {
        alert("Please enter a valid tip amount.");
        return;
    }

    if (tipRecipients.length === 0) {
        alert("Please add recipients first.");
        return;
    }

    const leadChoice = document.getElementById("tip-lead-choice").value;
    const totalPartySize = tipRecipients.length + 1; // Always include lead in party size

    // --- 1. CATEGORIZE ALL PARTICIPANTS ---
    const keepingRecipients = tipRecipients.filter(r => r.choice === RECIPIENT_CHOICES.KEEP);
    const donatingRecipients = tipRecipients.filter(r => r.choice === RECIPIENT_CHOICES.LOGISTICS);
    const decliningRecipients = tipRecipients.filter(r => r.choice === RECIPIENT_CHOICES.DECLINE);

    const leadIsKeeping = leadChoice === LEAD_CHOICES.KEEP;
    const leadIsDonating = leadChoice === LEAD_CHOICES.LOGISTICS;
    const leadIsDeclining = leadChoice === LEAD_CHOICES.DECLINE;

    // --- 2. CALCULATE "ACTIVE" POOL AND SHARES ---
    // "Active" means anyone NOT declining.

    // 2a. Find total shares to split the tip by.
    const numDecliners = decliningRecipients.length + (leadIsDeclining ? 1 : 0);
    const totalActiveShares = totalPartySize - numDecliners;

    // 2b. The "Active Pool" is the entire tip, to be split by the active shares.
    const totalActivePool = totalTip;

    // 2c. Handle "everyone declined" edge case
    if (totalActiveShares === 0) {
        // Everyone declined. Lead keeps everything.
        displayTipResults([], null, totalTip, totalPartySize, 0, 0, 0, totalTip, [], decliningRecipients, leadChoice);
        return;
    }

    // 2d. Calculate the old base share just for display (simple division, no fees)
    const oldBaseShare = Math.floor(totalTip / totalPartySize);

    // 2e. Find how many "active" participants are in each category
    const numActiveKeepers = keepingRecipients.length + (leadIsKeeping ? 1 : 0);
    const numActiveDonators = donatingRecipients.length + (leadIsDonating ? 1 : 0);

    // 2f. Find how many transfers are needed
    const numKeeperTransfers = keepingRecipients.length; // Only recipients (not lead)
    const numLogisticsTransfers = numActiveDonators > 0 ? 1 : 0; // Only one transfer

    // --- 3. Find the "Equal Take-Home Amount" (X) ---
    // This is the core logic. Find the highest amount X that can be
    // given to all active participants.
    const equalTakeHomeAmount = findEqualTakeHomeAmount(
        totalActivePool,
        totalActiveShares,
        numKeeperTransfers,
        numActiveDonators, // How many shares go to logistics
        leadIsKeeping
    );

    // --- 4. Calculate Final Transfers based on this Equal Amount ---
    const transfers = [];
    let totalCostOfTransfers = 0;
    let totalFeesAmount = 0;

    // 4a. Transfers to crew keeping tips
    keepingRecipients.forEach(recipient => {
        const transferAmount = equalTakeHomeAmount; // This is their take-home
        const youPay = getTransferCost(transferAmount);
        const fee = youPay - transferAmount;

        transfers.push({
            recipient: recipient,
            transferAmount: transferAmount,
            fee: fee,
            receivedAmount: transferAmount,
            youPay: youPay,
            type: "crew"
        });
        totalCostOfTransfers += youPay;
        totalFeesAmount += fee;
    });

    // 4b. Transfer to Logistics
    let logisticsTransfer = null;
    let logisticsCost = 0;
    if (numLogisticsTransfers > 0) {
        // The logistics pool is entitled to X * (number of donators)
        const logisticsPoolEntitlement = equalTakeHomeAmount * numActiveDonators;
        // Find the max we can send that is <= this entitlement
        const logisticsTransferAmount = findMaxTransferAmount(logisticsPoolEntitlement);

        if (logisticsTransferAmount > 0) {
            logisticsCost = getTransferCost(logisticsTransferAmount);
            const logisticsFee = logisticsCost - logisticsTransferAmount;

            logisticsTransfer = {
                transferAmount: logisticsTransferAmount,
                fee: logisticsFee,
                receivedAmount: logisticsTransferAmount,
                youPay: logisticsCost
            };
            totalCostOfTransfers += logisticsCost;
            totalFeesAmount += logisticsFee;
        }
    }

    // --- 4c. Calculate Final Lead Keep Amount ---

    // The lead's share is their equal take-home (if they're keeping)
    const leadShare = leadIsKeeping ? equalTakeHomeAmount : 0;

    // The total spent is all transfers + the lead's own share
    const totalSpent = totalCostOfTransfers + leadShare;

    // The "dust" is the leftover from the active pool
    // This is the only money the lead keeps IF THEY DECLINE.
    const totalDust = totalActivePool - totalSpent;

    // The lead's final keep is their share (0 if declining/donating) + the dust.
    const leadFinalKept = (leadIsKeeping ? equalTakeHomeAmount : 0) + totalDust;

    // --- 5. Display Results ---
    displayTipResults(
        transfers,
        logisticsTransfer,
        totalTip,
        totalPartySize, // Pass original party size
        oldBaseShare, // Pass original base share
        totalFeesAmount,
        totalCostOfTransfers, // This is just the transfers, not lead keep
        leadFinalKept, // This is what's left
        donatingRecipients, // Pass the recipient list
        decliningRecipients, // Pass the recipient list
        leadChoice // Pass the lead choice
    );
}

// ===== DISPLAY FUNCTIONS =====

/**
 * Displays the calculated tip split results in the UI.
 * Updates all summary fields, transfer lists, and special sections.
 *
 * @param {Array} transfers - Array of transfer objects for crew members keeping tips
 * @param {Object|null} logisticsTransfer - Single logistics transfer object (if any)
 * @param {number} totalTip - Original total tip amount
 * @param {number} totalCrewCount - Total number of crew + lead
 * @param {number} baseShare - Simple per-person share (for reference, ignores fees)
 * @param {number} totalFees - Total fees paid across all transfers
 * @param {number} totalTransferred - Total amount transferred (not including lead keep)
 * @param {number} leadKeeps - Final amount the lead keeps
 * @param {Array} donatingToLogistics - Recipients donating to logistics
 * @param {Array} declining - Recipients declining their tips
 * @param {string} leadChoice - The lead's choice ('lead-keep', 'lead-decline', 'lead-logistics')
 */
function displayTipResults(transfers, logisticsTransfer, totalTip, totalCrewCount, baseShare, totalFees, totalTransferred, leadKeeps, donatingToLogistics, declining, leadChoice) {
    const resultsContainer = document.getElementById("tip-results-list");
    const logisticsContainer = document.getElementById("tip-logistics-transfer");
    const resultsSection = document.getElementById("tip-results");

    let html = "";

    // Display crew transfers
    transfers.forEach((transfer, index) => {
        const name = transfer.recipient.name || `Recipient ${transfer.recipient.id}`;
        html += `
            <div class="grid grid-cols-3 gap-4 border-b border-gray-800 py-2 text-sm">
                <div class="text-gray-300">${name}</div>
                <div class="text-right font-mono text-white">${Math.round(transfer.transferAmount).toLocaleString()} aUEC</div>
                <div class="text-right font-mono text-green-300">${Math.round(transfer.receivedAmount).toLocaleString()} aUEC</div>
            </div>
        `;
    });

    // Handle case where no one is keeping
    if (transfers.length === 0) {
        html = '<div class="mt-3 rounded-lg border border-gray-600 bg-gray-800/50 p-3 text-sm text-gray-400 text-center">No crew members are keeping their share.</div>';
    }

    resultsContainer.innerHTML = html;

    // Display logistics transfer if any
    if (logisticsTransfer) {
        const donorNames = donatingToLogistics.map(r => r.name || `Recipient ${r.id}`);
        // Add lead to donor names if they donated
        if (leadChoice === LEAD_CHOICES.LOGISTICS) {
            donorNames.unshift("You (Lead)");
        }

        const donorCount = donorNames.length;
        const shareText = donorCount === 1 ? "1 share" : `${donorCount} shares`;

        logisticsContainer.innerHTML = `
            <div class="grid grid-cols-3 gap-4 py-2 text-sm">
                <div class="text-yellow-300 font-semibold">
                    Logistics Pool (${shareText})
                    <div class="text-xs text-yellow-400 font-normal mt-1">From: ${donorNames.join(", ")}</div>
                </div>
                <div class="text-right font-mono text-white">${Math.round(logisticsTransfer.transferAmount).toLocaleString()} aUEC</div>
                <div class="text-right font-mono text-yellow-300">${Math.round(logisticsTransfer.receivedAmount).toLocaleString()} aUEC</div>
            </div>
        `;
        logisticsContainer.classList.remove("hidden");
        document.getElementById("tip-summary-logistics-section").classList.remove("hidden");
        document.getElementById("tip-summary-logistics").textContent = Math.round(logisticsTransfer.receivedAmount).toLocaleString() + " aUEC";
    } else {
        logisticsContainer.classList.add("hidden");
        document.getElementById("tip-summary-logistics-section").classList.add("hidden");
    }

    // Display note about declined tips if any
    // Find any existing "note" and remove it before adding a new one
    const existingNote = resultsContainer.querySelector(".note");
    if (existingNote) {
        existingNote.remove();
    }

    if (declining.length > 0 || leadChoice === LEAD_CHOICES.DECLINE) {
        const declinedNames = declining.map(r => r.name || `Recipient ${r.id}`);
        if (leadChoice === LEAD_CHOICES.DECLINE) {
            declinedNames.unshift("You (Lead)");
        }
        const note = document.createElement("div");
        note.className = "mt-3 rounded-lg border border-gray-600 bg-gray-800/50 p-3 text-sm text-gray-400";
        note.innerHTML = `<strong>Declined Tips (redistributed):</strong> ${declinedNames.join(", ")}`;
        resultsContainer.appendChild(note);
    }

    // Update summary
    document.getElementById("tip-summary-total").textContent = totalTip.toLocaleString() + " aUEC";
    document.getElementById("tip-summary-crew-count").textContent = totalCrewCount;
    document.getElementById("tip-summary-share").textContent = Math.round(baseShare).toLocaleString() + " aUEC";
    document.getElementById("tip-summary-fees").textContent = Math.round(totalFees).toLocaleString() + " aUEC";
    document.getElementById("tip-summary-transfer").textContent = Math.round(totalTransferred).toLocaleString() + " aUEC";
    document.getElementById("tip-summary-keep").textContent = Math.round(leadKeeps).toLocaleString() + " aUEC";

    // Show results section
    resultsSection.classList.remove("hidden");
}

// ===== EVENT LISTENERS =====

/**
 * Initialize event listeners for tip splitter functionality.
 * Should be called when the DOM is ready.
 */
function initializeTipSplitterListeners() {
    // Watch for changes to recipient count
    const recipientsInput = document.getElementById("tip-recipients");
    if (recipientsInput) {
        recipientsInput.addEventListener("input", e => {
            const count = parseInt(e.target.value) || 0;
            generateRecipientsList(count);
        });
    }
}

// Auto-initialize on DOM load
document.addEventListener("DOMContentLoaded", initializeTipSplitterListeners);

// ===== MODULE EXPORTS (for ES6 modules if needed) =====

// Uncomment below if converting to ES6 module:
/*
export {
    // State
    tipRecipients,

    // Constants
    TRANSFER_FEE_RATE,
    RECIPIENT_CHOICES,
    LEAD_CHOICES,

    // Recipient Management
    importCrewForTip,
    generateRecipientsList,
    updateRecipientName,
    updateRecipientChoice,

    // Transfer Fee Calculations
    getTransferCost,
    findMaxTransferAmount,
    findEqualTakeHomeAmount,

    // Main Calculation
    calculateTipSplit,

    // Display
    displayTipResults,

    // Initialization
    initializeTipSplitterListeners
};
*/
