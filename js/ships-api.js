/**
 * Ship API Module
 * Handles fetching ship data from external APIs (FleetYards, etc.)
 * and managing the ship list cache.
 */

// Note: SHIPS and FALLBACK_SHIPS are declared in constants.js and shared globally

/**
 * Fetch all pages from FleetYards API
 * FleetYards API is paginated, so we need to fetch all pages
 * @returns {Promise<Array|null>} Array of ship data or null on error
 */
async function fetchAllFleetYardsPages() {
    let allShips = [];
    let page = 1;
    const perPage = 200; // Maximum allowed per page

    try {
        while (true) {
            const url = `https://api.fleetyards.net/v1/models?page=${page}&perPage=${perPage}`;
            console.log(`Fetching FleetYards page ${page}...`);

            const response = await fetch(url, {
                method: "GET",
                headers: {
                    Accept: "application/json"
                },
                mode: "cors"
            });

            if (!response.ok) {
                console.warn(`FleetYards page ${page} returned status ${response.status}`);
                break;
            }

            const data = await response.json();

            if (!Array.isArray(data) || data.length === 0) {
                break; // No more data
            }

            allShips.push(...data);
            console.log(`Fetched ${data.length} ships from page ${page}, total: ${allShips.length}`);

            // If we got less than perPage, we're on the last page
            if (data.length < perPage) {
                break;
            }

            page++;
        }

        return allShips;
    } catch (error) {
        console.error("Error fetching FleetYards data:", error);
        return null;
    }
}

/**
 * API sources configuration
 * List of API sources to try (in order) when fetching ship data
 */
const API_SOURCES = [
    {
        name: "FleetYards",
        fetchData: fetchAllFleetYardsPages,
        parse: data => {
            // Parse the response and extract ship names
            if (Array.isArray(data)) {
                return data
                    .filter(ship => {
                        // Filter for flight-ready ships only
                        const status = ship.productionStatus?.toLowerCase() || "";
                        return status === "flight-ready" || status === "in-service";
                    })
                    .map(ship => {
                        const manufacturer = ship.manufacturer?.name || ship.manufacturer?.code || "";
                        const name = ship.name || "";
                        return manufacturer ? `${manufacturer} ${name}` : name;
                    })
                    .filter(name => name.trim().length > 0);
            }
            return null;
        }
    },
    {
        name: "FleetYards (All Ships)",
        fetchData: fetchAllFleetYardsPages,
        parse: data => {
            // Fallback: get ALL ships if flight-ready filter returns too few
            if (Array.isArray(data)) {
                return data
                    .map(ship => {
                        const manufacturer = ship.manufacturer?.name || ship.manufacturer?.code || "";
                        const name = ship.name || "";
                        return manufacturer ? `${manufacturer} ${name}` : name;
                    })
                    .filter(name => name.trim().length > 0);
            }
            return null;
        }
    }
];

/**
 * Fetch ships from API with caching
 * Tries each API source in order until one succeeds
 * Uses 24-hour cache to reduce API calls
 * @returns {Promise<Array>} Array of ship names (sorted)
 */
async function fetchShipsFromAPI() {
    // Check cache first (24 hour expiry)
    const cached = localStorage.getItem("scShipsCache");
    const cacheTime = localStorage.getItem("scShipsCacheTime");

    if (cached && cacheTime) {
        const age = Date.now() - parseInt(cacheTime);
        if (age < 24 * 60 * 60 * 1000) {
            // 24 hours
            console.log("Using cached ship list");
            return JSON.parse(cached);
        }
    }

    // Try each API source
    for (const source of API_SOURCES) {
        try {
            console.log(`Trying to fetch ships from ${source.name}...`);

            const data = await source.fetchData();

            if (data) {
                console.log(`Received ${data.length} raw ships from ${source.name}`);
                const ships = source.parse(data);

                if (ships && ships.length > 0) {
                    const sortedShips = ships.sort();
                    console.log(`✅ Successfully fetched ${sortedShips.length} ships from ${source.name}`);

                    // Cache the results
                    localStorage.setItem("scShipsCache", JSON.stringify(sortedShips));
                    localStorage.setItem("scShipsCacheTime", Date.now().toString());
                    localStorage.setItem("scShipsSource", source.name);

                    return sortedShips;
                } else {
                    console.warn(`${source.name} returned no ships after parsing`);
                }
            } else {
                console.warn(`${source.name} returned no data`);
            }
        } catch (error) {
            console.warn(`Failed to fetch from ${source.name}:`, error.message);
        }
    }

    // All APIs failed, use fallback
    console.warn("All APIs failed, using fallback ship list");
    return FALLBACK_SHIPS;
}

/**
 * Update API status indicator in the UI
 * @param {string} status - Status type: 'success', 'error', or 'loading'
 * @param {string} message - Status message to display
 * @param {string} source - Optional source name (e.g., 'FleetYards')
 */
function updateAPIStatus(status, message, source = "") {
    const statusEl = document.getElementById("apiStatus");
    if (!statusEl) return;

    // Reset classes
    statusEl.className = "rounded-lg border px-3 py-2 text-xs font-medium flex-1 md:flex-auto";

    // Add appropriate color classes based on status
    if (status === "success") {
        statusEl.classList.add("border-gray-600", "bg-gray-700", "text-gray-300");
    } else if (status === "error") {
        statusEl.classList.add("border-red-600", "bg-red-900", "text-red-200");
    } else {
        // loading
        statusEl.classList.add("border-gray-600", "bg-gray-700", "text-gray-300", "animate-pulse");
    }

    statusEl.textContent = message + (source ? ` (${source})` : "");
}

/**
 * Initialize ships on page load
 * Fetches ship data from API and updates status indicator
 */
async function initializeShips() {
    updateAPIStatus("loading", "Loading ships...");
    SHIPS = await fetchShipsFromAPI();
    console.log(`Loaded ${SHIPS.length} ships`);

    // Determine which source was used
    const source = localStorage.getItem("scShipsSource") || "unknown";
    const cached = localStorage.getItem("scShipsCache");
    const cacheTime = localStorage.getItem("scShipsCacheTime");

    if (cached && cacheTime) {
        const age = Date.now() - parseInt(cacheTime);
        if (age < 24 * 60 * 60 * 1000 && JSON.parse(cached).length === SHIPS.length) {
            const hours = Math.floor(age / (60 * 60 * 1000));
            updateAPIStatus("success", `${SHIPS.length} ships`, `cached ${hours}h ago from ${source}`);
            return;
        }
    }

    if (SHIPS.length === FALLBACK_SHIPS.length) {
        updateAPIStatus("error", `${SHIPS.length} ships`, "fallback - API unavailable");
    } else {
        updateAPIStatus("success", `${SHIPS.length} ships`, source);
    }
}

/**
 * Refresh ship list from API (bypass cache)
 * Clears the cache and fetches fresh data from the API
 * Re-renders existing ships to update dropdowns
 */
async function refreshShipList() {
    updateAPIStatus("loading", "Refreshing ships...");

    // Clear cache
    localStorage.removeItem("scShipsCache");
    localStorage.removeItem("scShipsCacheTime");
    localStorage.removeItem("scShipsSource");

    // Fetch fresh data
    SHIPS = await fetchShipsFromAPI();

    const source = localStorage.getItem("scShipsSource") || "unknown";

    if (SHIPS.length === FALLBACK_SHIPS.length) {
        updateAPIStatus("error", `${SHIPS.length} ships`, "fallback - API unavailable");
    } else {
        updateAPIStatus("success", `${SHIPS.length} ships refreshed`, source);
    }

    // Re-render any existing ships to update dropdowns
    // Note: renderShips() is defined in the main app
    if (typeof renderShips === "function") {
        renderShips();
    }
}

/**
 * Get the current ships list
 * @returns {Array} Current ships list
 */
function getShips() {
    return SHIPS;
}

/**
 * Set the ships list (for testing or manual override)
 * @param {Array} newShips - New ships array
 */
function setShips(newShips) {
    SHIPS = newShips;
}
