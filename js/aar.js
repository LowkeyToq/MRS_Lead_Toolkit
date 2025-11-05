/**
 * AAR (After Action Report) Module
 *
 * This module handles all AAR-related functionality including:
 * - Ship selection dropdowns (Gunship, Medical, CAP, Additional)
 * - Custom dropdown/select components with search functionality
 * - Location selection (planets, POIs, extraction points)
 * - AAR form data collection and preview generation
 * - Clipboard copying functionality
 * - Form clearing and reset
 *
 * @module aar
 */

// ============================================================================
// GLOBAL STATE VARIABLES
// ============================================================================

/**
 * Note: The following variables are declared in other modules and shared globally:
 * - ships (Array) - Declared in ship-assignment.js
 * - SHIPS (Array) - Declared in constants.js
 */

/**
 * Database containing all location information (systems, planets, moons, stations, etc.)
 * @type {Object|null}
 */
let LOCATIONS_DATABASE = null;

/**
 * Array of planetary bodies with their system and designation information
 * @type {Array<Object>}
 */
let PLANETARY_BODIES = [];

/**
 * Mapping of planetary body names to their POIs (Points of Interest)
 * @type {Object}
 */
let PLANETARY_BODY_TO_POIS = {};

/**
 * Embedded locations database containing all system, planet, moon, and POI information
 * @const
 */
const LOCATIONS_DATABASE_DATA = {"systems":{"STANTON":{"name":"Stanton","jumpPointStations":["Pyro Gateway"],"planets":{"HURSTON":{"name":"Hurston","designation":"Stanton I","type":"planet","landingZones":["Lorville"],"settlements":["Cutter's Rig","Finn's Folly","Ludlow","Maker's Point","Picker's Field","Rappel","Weeping Cove","Zephyr"],"pois":["HDMS-Edmond","HDMS-Hadley","HDMS-Oparei","HDMS-Pinewood","HDMS-Stanhope","HDMS-Thedus","HDSF-Adlai","HDSF-Barnabas","HDSF-Breckinridge","HDSF-Colfax","HDSF-Damaris","HDSF-Elbridge","HDSF-Hendricks","HDSF-Hiram","HDSF-Hobart","HDSF-Ishmael","HDSF-Millerand","HDSF-Rufus","HDSF-Sherman","HDSF-Tamar","HDSF-Tompkins","HDSF-Zacharias","Reclamation & Disposal Orinth","HDMO-Calthrope","Downed Relay AC-652","Rico's Remains","Lowdown","Trilo","Broken Patch","Echo Island"],"stations":["Everus Harbor"],"lagrangeStations":["HUR-L1 (Rest & Relax)","HUR-L2 (Faithful Dream)","HUR-L3 (Thundering Express)","HUR-L4 (Ambitious Dream)","HUR-L5 (Beautiful Glen)"],"moons":{"ARIAL":{"name":"Arial","designation":"Stanton 1a","pois":["HDMS-Bezdek","HDMS-Lathan","CommArray ST1-13","Coven","Onyx Facility S1A8","Smokestack","The Dregs"]},"ABERDEEN":{"name":"Aberdeen","designation":"Stanton 1b","pois":["HDMS-Anderson","HDMS-Norgaard","Klescher Rehabilitation Facility","Barton Flats Aid Shelter","HDMO-Dobbs","CommArray ST1-92"]},"MAGDA":{"name":"Magda","designation":"Stanton 1c","pois":["HDMS-Hahn","HDMS-Perlman","CommArray ST1-48"]},"ITA":{"name":"Ita","designation":"Stanton 1d","pois":["HDMS-Woodruff","HDMS-Ryder","The Shades","Thimblerig","CommArray ST1-13"]}}},"CRUSADER":{"name":"Crusader","designation":"Stanton II","type":"gas_giant","landingZones":["Orison"],"settlements":["Cloudrest Retreat","Empyrean Park","Prospect Point"],"stations":["Port Olisar","Security Post Kareah","Seraphim Station","CommArray ST2-55"],"lagrangeStations":["CRU-L1 (Ambitious Dream)","CRU-L4 (Shallow Frontier)","CRU-L5 (Beautiful Glen)"],"moons":{"CELLIN":{"name":"Cellin","designation":"Stanton 2a","pois":["Gallete Family Farms","Terra Mills HydroFarm","Tram & Myers Mining","Hickes Research Outpost","Security Post Criska","Security Post Dipur","Security Post Lespin","Ashburn Channel Aid Shelter","Flanagan's Ravine Aid Shelter","Julep Ravine Aid Shelter","Mogote Aid Shelter","NT-999-XV","Stash House (Cellin)","Unnamed Abandoned Outpost","CommArray ST2-28"]},"DAYMAR":{"name":"Daymar","designation":"Stanton 2b","pois":["Bountiful Harvest Hydroponics","ArcCorp Mining Area 141","Kudre Ore","Shubin Mining Facility SCD-1","Security Post Moluto","Security Post Prashad","Security Post Thaquray","NT-999-XVI","The Garden","TPF","Wailing Rock","Kudre Ore Mine (Closed)","Dunlow Ridge Aid Shelter","Eager Flats Aid Shelter","Tamdon Plains Aid Shelter","Wolf Point Aid Shelter","Brio's Breaker Yard","Whistlers Crypt","Yadar Valley","Nuen Waste Management","UEES Flyssa Wreck","Covalex Hub Gundo","CommArray ST2-47"]},"YELA":{"name":"Yela","designation":"Stanton 2c","pois":["Abandoned Outpost (Mining Facility)","ArcCorp Mining Area 157","Benson Mining Outpost","Deakins Research Outpost","Jumptown","Security Post Opal","Security Post Wan","Aston Ridge Aid Shelter","Kosso Basin Aid Shelter","Nakamura Valley Aid Shelter","Talarine Divide Aid Shelter","Afterlife","Connor's","Utopia","NT-999-XX","NT-999-XXII","Half Stack","Mainline","Miner's Lament","Rolo's Crater","Benny Henge","CommArray ST2-76"],"stations":["GrimHEX"]}}},"ARCCORP":{"name":"ArcCorp","designation":"Stanton III","type":"planet","landingZones":["Area 18"],"settlements":["Area04","Area06","Area07","Area11","Area17","Area20","Area26","Area39"],"pois":["The Sky Scraper","Ermer Family Farms Creamery","CommArray ST3-90"],"stations":["Baijini Point"],"lagrangeStations":["ARC-L1 (Wide Forest)","ARC-L2 (Lively Pathway)","ARC-L3 (Modern Icarus)","ARC-L4 (Faint Glen)","ARC-L5 (Stately Home)"],"moons":{"LYRIA":{"name":"Lyria","designation":"Stanton 3a","pois":["Humboldt Mines","Loveridge Mineral Reserve","Shubin Mining Facility SAL-2","Shubin Mining Facility SAL-5","Shubin Processing Facility SPAL-3","Shubin Processing Facility SPAL-7","Shubin Processing Facility SPAL-9","Shubin Processing Facility SPAL-12","Shubin Processing Facility SPAL-16","Shubin Processing Facility SPAL-21","Security Depot Lyria-1","Elsewhere","Teddy's Playhouse","The Orphanage","The Pit","Wheeler's","Paradise Cove","Buckets","Launch Pad","CommArray ST3-18"]},"WALA":{"name":"Wala","designation":"Stanton 3b","pois":["Shady Glen Farms","ArcCorp Mining Area 045","ArcCorp Mining Area 048","ArcCorp Mining Area 056","ArcCorp Mining Area 061","ArcCorp Processing Center 115","ArcCorp Processing Center 123","Lost and Found","Good Times Temple","Samson & Sons Salvage Center","CommArray ST3-35"]}}},"MICROTECH":{"name":"microTech","designation":"Stanton IV","type":"planet","landingZones":["New Babbage"],"settlements":["Astor's Clearing","Bloodshot Ridge","Dunboro","Frostbite","Ghost Hollow","Harper's Point","Moreland Hills","Razor's Edge"],"pois":["MT DataCenter 2UB-RB9-5","MT DataCenter 4HJ-LVE-A","MT DataCenter 5WQ-R2V-C","MT DataCenter 8FK-Q2X-K","MT DataCenter D79-ECG-R","MT DataCenter E2Q-NSG-Y","MT DataCenter TMG-XEV-2","MT DataCenter QVX-J88-J","MT DataCenter L8P-JUC-8","MT DataCenter KH3-AAE-L","Calhoun Pass Emergency Shelter","Point Wain Emergency Shelter","Nuiqsut Emergency Shelter","Clear View Emergency Shelter","Shubin Mining Facility SM0-10","Shubin Mining Facility SM0-13","Shubin Mining Facility SM0-18","Shubin Mining Facility SM0-22","Rayari Deltana Research Outpost","Rayari Livengood Research Outpost","MT OpCenter LTI-4","Outpost 54","The Necropolis","Covalex Distribution Centre S4DC05","Greycat Stanton IV Production Complex-A","Cry-Astro Processing Plant 34-12","Cry-Astro Processing Plant 19-02","MicroTech Logistics Depot S4LD01","MicroTech Logistics Depot S4LD13","Sakura Sun Goldenrod Workcenter"],"stations":["Port Tressler"],"lagrangeStations":["MIC-L1 (Shallow Frontier)","MIC-L2 (Long Forest)","MIC-L3 (Endless Odyssey)","MIC-L4 (Melodic Fields)","MIC-L5 (Shady Stockade)"],"moons":{"CALLIOPE":{"name":"Calliope","designation":"Stanton 4a","pois":["Shubin Mining Facility SMCa-6","Shubin Mining Facility SMCa-8","Shubin Processing Facility SPMC-1","Shubin Processing Facility SPMC-3","Shubin Processing Facility SPMC-5","Shubin Processing Facility SPMC-10","Shubin Processing Facility SPMC-11","Shubin Processing Facility SPMC-14","Rayari Anvik Research Outpost","Rayari Kaltag Research Outpost","Raven's Roost","CommArray ST4-31","Blighter's Run","Hard Knocks","Hasbin Hall","Regiment Downs"]},"CLIO":{"name":"Clio","designation":"Stanton 4b","pois":["Rayari Cantwell Research Outpost","Rayari McGrath Research Outpost","CommArray ST4-59"]},"EUTERPE":{"name":"Euterpe","designation":"Stanton 4c","pois":["Bud's Growery","The Icebreaker","Devlin Scrap & Salvage","CommArray ST4-64"]}}}}},"PYRO":{"name":"Pyro","jumpPointStations":["Stanton Gateway"],"planets":{"PYRO1":{"name":"Pyro I","designation":"Pyro I","type":"planet","pois":["Gray Gardens Depot","Rustville","Stag's Rut","Lazarus Phoenix Research Lab","Lazarus Tithonus Research Lab","Lazarus Transport Hub Phoenix-I","Lazarus Transport Hub Phoenix-II","Lazarus Transport Hub Phoenix-III","Lazarus Transport Hub Tithonus-I","Lazarus Transport Hub Tithonus-II","Lazarus Transport Hub Tithonus-III"],"lagrangeStations":["PYAM-FARSTAT-1-2 (L2)","PYAM-FARSTAT-1-3 (L3 - Akiro Cluster)","PYAM-FARSTAT-1-5 (L5)"]},"MONOX":{"name":"Monox","designation":"Pyro II","type":"planet","pois":["Arid Reach","Jackson's Swap","Last Ditch","Ostler's Claim","Slowburn Depot","Sunset Mesa","Yang's Place"],"lagrangeStations":["Checkmate Station (L4)"]},"BLOOM":{"name":"Bloom","designation":"Pyro III","type":"planet","pois":["Bueno Ravine","Frigid Knot","Narena's Rest","Shepherd's Rest","Carver's Ridge","The Golden Riviera","The Yard","Windfall","Shadowfall","Prospect Depot"],"stations":["Orbituary"],"lagrangeStations":["Starlight Service Station (L1)","PYAM-FARSTAT-3-2 (L2)","Patch City (L3)","PYAM-FARSTAT-3-4 (L4)","PYAM-FARSTAT-3-5 (L5)"]},"PYRO4":{"name":"Pyro IV","designation":"Pyro IV","type":"planet","pois":["Sacren's Plot","Chawla's Beach","Dinger's Depot","Fallow Field","Farro Data Center I","Farro Data Center II","Farro Data Center III","Farro Data Center IV","Farro Data Center V","Farro Data Center VI","Farro Data Center VII","Farro Data Center VIII","Farro Data Center IX","Farro Data Center X","Goner's Deal"]},"PYRO5":{"name":"Pyro V","designation":"Pyro V","type":"gas_giant","lagrangeStations":["PYAM-FARSTAT-5-1 (L1)","Gaslight (L2)","PYAM-FARSTAT-5-3 (L3)","Rod's Fuel 'N Supplies (L4)","Rat's Nest (L5)"],"moons":{"IGNIS":{"name":"Ignis","designation":"Pyro 5a","pois":["Ashland","Kabir's Post"]},"VATRA":{"name":"Vatra","designation":"Pyro 5b","pois":["Seer's Canyon"]},"ADIR":{"name":"Adir","designation":"Pyro 5c","pois":["Prophet's Peak","Derelict Outpost","Obsidian Crack"]},"FAIRO":{"name":"Fairo","designation":"Pyro 5d","pois":["Outpost 08P","FEO Canyon Depot","YW-2455-WS"]},"FUEGO":{"name":"Fuego","designation":"Pyro 5e","pois":["RAB-Lamda","RAB-Over","RAB-Victory"]},"VUUR":{"name":"Vuur","designation":"Pyro 5f","pois":[]}}},"TERMINUS":{"name":"Terminus","designation":"Pyro VI","type":"planet","pois":["Blackrock Exchange","Bullock's Reach","Canard View","Kinder Plots","Last Landings","Rough Landing","Scarper's Turn","Stonetree","Supply Gap","Watcher's Depot"],"stations":["Ruin Station"],"lagrangeStations":["PYAM-FARSTAT-6-2 (L2)","Endgame (L3)","Dudley & Daughters (L4)","Megumi Refueling (L5)"]}}}},"locationTypes":{"city":"Landing Zone / City","settlement":"Settlement / Outpost","station":"Space Station","lagrange":"Lagrange Station","mining":"Mining Facility / Outpost","processing":"Processing Facility","research":"Research Outpost","security":"Security Post / Bunker","distribution":"Distribution Center","data":"Data Center","farm":"Agricultural / Farm","shelter":"Aid Shelter / Emergency Shelter","salvage":"Salvage Yard","cave":"Cave System","wreck":"Derelict / Wreck","racetrack":"Racetrack","prison":"Prison / Rehabilitation Facility","commarray":"Communication Array","other":"Other Point of Interest"}};

// ============================================================================
// INITIALIZATION FUNCTIONS
// ============================================================================

/**
 * Loads the locations database (currently using embedded data)
 * @async
 * @returns {Promise<Object>} The locations database object
 */
async function loadLocationsDatabase() {
    return LOCATIONS_DATABASE_DATA;
}

/**
 * Initializes planetary bodies from the locations database
 * Populates PLANETARY_BODIES array and PLANETARY_BODY_TO_POIS mapping
 * Also populates the AAR planet dropdown and extracted-to dropdown
 * @async
 */
async function initializePlanetaryBodies() {
    LOCATIONS_DATABASE = await loadLocationsDatabase();

    if (!LOCATIONS_DATABASE) {
        console.warn('Locations database not available');
        return;
    }

    // Build planetary bodies list and POI mappings
    const bodies = [];
    PLANETARY_BODY_TO_POIS = {};

    // Process each system
    for (const [systemKey, systemData] of Object.entries(LOCATIONS_DATABASE.systems)) {
        // Add jump point stations as a special category
        if (systemData.jumpPointStations && systemData.jumpPointStations.length > 0) {
            const jumpPointName = `Jump Points (${systemData.name})`;
            bodies.push({
                name: jumpPointName,
                designation: 'System Jump Points',
                system: systemData.name,
                isJumpPoint: true
            });
            PLANETARY_BODY_TO_POIS[jumpPointName] = systemData.jumpPointStations;
        }

        // Process each planet
        for (const [planetKey, planetData] of Object.entries(systemData.planets)) {
            const planetName = planetData.name;
            bodies.push({
                name: planetName,
                designation: planetData.designation || '',
                system: systemData.name
            });

            // Collect all POIs for this planet
            const pois = [
                ...(planetData.landingZones || []),
                ...(planetData.settlements || []),
                ...(planetData.pois || []),
                ...(planetData.stations || []),
                ...(planetData.lagrangeStations || [])
            ];

            PLANETARY_BODY_TO_POIS[planetName] = pois;

            // Process moons
            if (planetData.moons) {
                for (const [moonKey, moonData] of Object.entries(planetData.moons)) {
                    const moonName = moonData.name;
                    bodies.push({
                        name: moonName,
                        designation: moonData.designation || '',
                        system: systemData.name,
                        parent: planetName
                    });

                    // Collect POIs for this moon
                    const moonPois = [
                        ...(moonData.landingZones || []),
                        ...(moonData.settlements || []),
                        ...(moonData.pois || []),
                        ...(moonData.stations || [])
                    ];

                    PLANETARY_BODY_TO_POIS[moonName] = moonPois;
                }
            }
        }
    }

    // Sort bodies by system, then by name
    bodies.sort((a, b) => {
        if (a.system !== b.system) {
            return a.system.localeCompare(b.system);
        }
        return a.name.localeCompare(b.name);
    });

    PLANETARY_BODIES = bodies;
    populateAARPlanetDropdown();
    initializeAARPOISelect(); // Initialize POI dropdown even if empty
    populateExtractedToDropdown(); // Populate "Client Extracted To" dropdown
}

// ============================================================================
// SHIP DROPDOWN POPULATION FUNCTIONS
// ============================================================================

/**
 * Populates AAR ship dropdowns (Gunship and Medical) from current ship assignments
 * Extracts unique ships from the ships array and populates both dropdowns
 */
function populateAARShipDropdowns() {
    const assignedShips = ships.map(s => s.ship).filter(s => s && s.trim() !== '');

    // Get unique ships (in case of duplicates)
    const uniqueShips = [...new Set(assignedShips)];

    // Populate each ship dropdown (CAP is now a text input, not dropdown)
    populateAARShipDropdown('aar-gunship', uniqueShips);
    populateAARShipDropdown('aar-medical', uniqueShips);
}

/**
 * Populates a specific AAR ship dropdown with options
 * Creates two sections: assigned ships from ship assignments, and all available ships
 *
 * @param {string} selectId - The ID of the select element (e.g., 'aar-gunship')
 * @param {Array<string>} assignedShips - Array of ship names from current assignments
 */
function populateAARShipDropdown(selectId, assignedShips) {
    const optionsContainer = document.getElementById(selectId + '-options');
    if (!optionsContainer) {
        console.warn('Options container not found for:', selectId);
        return;
    }

    let options = '';

    // Add assigned ships first if any
    if (assignedShips.length > 0) {
        options += '<div class="px-3 py-2 text-xs font-semibold uppercase text-blue-300 bg-gray-800">From Assignments</div>';
        assignedShips.forEach(ship => {
            options += `<div class="custom-select-option cursor-pointer px-3 py-2 text-sm text-gray-300 hover:bg-mrs-button hover:text-white" data-value="${ship}">${ship}</div>`;
        });
        options += '<div class="border-t border-gray-600 my-1"></div>';
        options += '<div class="px-3 py-2 text-xs font-semibold uppercase text-blue-300 bg-gray-800">All Ships</div>';
    }

    // Add all ships from SHIPS array
    SHIPS.forEach(ship => {
        options += `<div class="custom-select-option cursor-pointer px-3 py-2 text-sm text-gray-300 hover:bg-mrs-button hover:text-white" data-value="${ship}">${ship}</div>`;
    });

    optionsContainer.innerHTML = options;

    // Wait a tick for DOM to update, then initialize the select
    setTimeout(() => {
        initializeAARSelect(selectId);
    }, 0);
}

// ============================================================================
// LOCATION DROPDOWN POPULATION FUNCTIONS
// ============================================================================

/**
 * Populates the AAR planet dropdown with all planetary bodies
 * Creates sections grouped by star system
 */
function populateAARPlanetDropdown() {
    const optionsContainer = document.getElementById('aar-planet-options');
    if (!optionsContainer) {
        console.warn('Planet options container not found');
        return;
    }

    if (PLANETARY_BODIES.length === 0) {
        optionsContainer.innerHTML = '<div class="px-3 py-2 text-sm text-gray-400">Loading locations...</div>';
        return;
    }

    let options = '';
    let currentSystem = '';

    PLANETARY_BODIES.forEach(body => {
        // Add system header if changed
        if (body.system !== currentSystem) {
            if (currentSystem !== '') {
                options += '<div class="border-t border-gray-600 my-1"></div>';
            }
            options += `<div class="px-3 py-2 text-xs font-semibold uppercase text-blue-300 bg-gray-800">${body.system} System</div>`;
            currentSystem = body.system;
        }

        const displayText = body.designation ? `${body.name} (${body.designation})` : body.name;
        options += `<div class="custom-select-option cursor-pointer px-3 py-2 text-sm text-gray-300 hover:bg-mrs-button hover:text-white" data-value="${body.name}">${displayText}</div>`;
    });

    optionsContainer.innerHTML = options;

    // Wait a tick for DOM to update, then initialize the select
    setTimeout(() => {
        initializeAARPlanetSelect();
    }, 0);
}

/**
 * Populates the POI (Point of Interest) dropdown based on selected planet
 *
 * @param {string} planetName - Name of the selected planet/moon
 */
function populateAARPOIDropdown(planetName) {
    const optionsContainer = document.getElementById('aar-poi-options');
    if (!optionsContainer) {
        console.warn('POI options container not found');
        return;
    }

    const pois = PLANETARY_BODY_TO_POIS[planetName];

    if (!pois || pois.length === 0) {
        optionsContainer.innerHTML = '<div class="px-3 py-2 text-sm text-gray-400">No POIs available for this location</div>';
        return;
    }

    let options = '';
    pois.forEach(poi => {
        options += `<div class="custom-select-option cursor-pointer px-3 py-2 text-sm text-gray-300 hover:bg-mrs-button hover:text-white" data-value="${poi}">${poi}</div>`;
    });

    // Add "Other" option at the end
    options += `<div class="custom-select-option cursor-pointer px-3 py-2 text-sm text-gray-300 hover:bg-mrs-button hover:text-white border-t border-gray-600 mt-1 pt-2" data-value="Other">Other (specify below)</div>`;

    optionsContainer.innerHTML = options;

    // Wait a tick for DOM to update, then initialize the select
    setTimeout(() => {
        initializeAARPOISelect();
    }, 0);
}

/**
 * Populates and initializes the "Client Extracted To" dropdown
 * Includes common options (Player Ship, Declined, N/A) and all stations/landing zones
 */
function populateExtractedToDropdown() {
    const optionsContainer = document.getElementById('aar-extracted-options');
    if (!optionsContainer || !LOCATIONS_DATABASE) return;

    let options = '';

    // Add common options first
    options += `<div class="px-2 py-1 text-xs font-semibold text-gray-400 uppercase">Common</div>`;
    options += `<div class="custom-select-option cursor-pointer px-3 py-2 text-sm text-gray-300 hover:bg-mrs-button hover:text-white" data-value="Player Ship">Player Ship</div>`;
    options += `<div class="custom-select-option cursor-pointer px-3 py-2 text-sm text-gray-300 hover:bg-mrs-button hover:text-white" data-value="Declined">Declined</div>`;
    options += `<div class="custom-select-option cursor-pointer px-3 py-2 text-sm text-gray-300 hover:bg-mrs-button hover:text-white" data-value="N/A">N/A</div>`;

    // Collect all stations from all systems
    const allStations = [];
    for (const [systemKey, systemData] of Object.entries(LOCATIONS_DATABASE.systems)) {
        // Add jump point stations
        if (systemData.jumpPointStations) {
            systemData.jumpPointStations.forEach(station => {
                allStations.push(station);
            });
        }

        for (const [planetKey, planetData] of Object.entries(systemData.planets)) {
            // Add planet stations
            if (planetData.stations) {
                planetData.stations.forEach(station => {
                    allStations.push(`${station} (${planetData.name})`);
                });
            }
            // Add lagrange stations
            if (planetData.lagrangeStations) {
                planetData.lagrangeStations.forEach(station => {
                    allStations.push(station);
                });
            }
            // Add landing zones (cities)
            if (planetData.landingZones) {
                planetData.landingZones.forEach(city => {
                    allStations.push(`${city} (${planetData.name})`);
                });
            }
        }
    }

    // Sort alphabetically
    allStations.sort();

    // Add stations section
    if (allStations.length > 0) {
        options += `<div class="px-2 py-1 mt-2 text-xs font-semibold text-gray-400 uppercase border-t border-gray-600 pt-2">Stations & Landing Zones</div>`;
        allStations.forEach(station => {
            options += `<div class="custom-select-option cursor-pointer px-3 py-2 text-sm text-gray-300 hover:bg-mrs-button hover:text-white" data-value="${station}">${station}</div>`;
        });
    }

    // Add "Other" option at the end
    options += `<div class="custom-select-option cursor-pointer px-3 py-2 text-sm text-gray-300 hover:bg-mrs-button hover:text-white border-t border-gray-600 mt-2 pt-2" data-value="Other">Other (specify below)</div>`;

    optionsContainer.innerHTML = options;

    // Initialize the custom select
    initializeExtractedToSelect();
}

// ============================================================================
// CUSTOM SELECT/DROPDOWN INITIALIZATION FUNCTIONS
// ============================================================================

/**
 * Initializes a custom select component for AAR ship selection
 * Sets up click handlers, search functionality, and option selection
 *
 * @param {string} selectId - The ID of the select element (e.g., 'aar-gunship')
 */
function initializeAARSelect(selectId) {
    const wrapper = document.getElementById(selectId + '-select');
    if (!wrapper) return;

    const trigger = wrapper.querySelector('.custom-select-trigger');
    const dropdown = wrapper.querySelector('.custom-select-dropdown');
    const searchInput = wrapper.querySelector('.aar-ship-search-input');
    const optionsContainer = wrapper.querySelector('.custom-select-options');

    // Clear existing event listeners by cloning elements
    const newTrigger = trigger.cloneNode(true);
    const newDropdown = dropdown.cloneNode(true);

    trigger.parentNode.replaceChild(newTrigger, trigger);
    dropdown.parentNode.replaceChild(newDropdown, dropdown);

    // Re-query elements from the new nodes (including valueDisplay!)
    const arrow = newTrigger.querySelector('.custom-select-arrow');
    const newSearchInput = newDropdown.querySelector('.aar-ship-search-input');
    const newOptionsContainer = newDropdown.querySelector('.custom-select-options');
    const valueDisplay = document.getElementById(selectId + '-value'); // Re-query after cloning

    newTrigger.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = !newDropdown.classList.contains('hidden');

        document.querySelectorAll('.custom-select-dropdown').forEach(dd => {
            if (dd !== newDropdown) {
                dd.classList.add('hidden');
            }
        });

        newDropdown.classList.toggle('hidden');
        newTrigger.classList.toggle('ring-1');
        newTrigger.classList.toggle('ring-primary-500');
        arrow.classList.toggle('rotate-180');

        if (!isOpen) {
            newSearchInput.value = '';
            newOptionsContainer.querySelectorAll('.custom-select-option').forEach(opt => opt.classList.remove('hidden'));
            newSearchInput.focus();
        }
    });

    newSearchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        newOptionsContainer.querySelectorAll('.custom-select-option').forEach(option => {
            const text = option.textContent.toLowerCase();
            option.classList.toggle('hidden', !text.includes(searchTerm));
        });
    });

    newSearchInput.addEventListener('click', (e) => e.stopPropagation());

    newOptionsContainer.addEventListener('click', (e) => {
        const option = e.target.closest('.custom-select-option');
        if (!option) return;

        const value = option.dataset.value;
        valueDisplay.textContent = value;

        newDropdown.classList.add('hidden');
        newTrigger.classList.remove('ring-1', 'ring-primary-500');
        arrow.classList.remove('rotate-180');
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!wrapper.contains(e.target)) {
            newDropdown.classList.add('hidden');
            newTrigger.classList.remove('ring-1', 'ring-primary-500');
            arrow.classList.remove('rotate-180');
        }
    });
}

/**
 * Initializes the "Client Extracted To" custom select component
 * Sets up click handlers, search functionality, and option selection
 */
function initializeExtractedToSelect() {
    const wrapper = document.getElementById('aar-extracted-select');
    if (!wrapper) return;

    const trigger = wrapper.querySelector('.custom-select-trigger');
    const dropdown = wrapper.querySelector('.custom-select-dropdown');
    const searchInput = wrapper.querySelector('.extracted-search-input');
    const optionsContainer = wrapper.querySelector('.custom-select-options');

    const newTrigger = trigger.cloneNode(true);
    const newDropdown = dropdown.cloneNode(true);

    trigger.parentNode.replaceChild(newTrigger, trigger);
    dropdown.parentNode.replaceChild(newDropdown, dropdown);

    const newArrow = newTrigger.querySelector('.custom-select-arrow');
    const newSearchInput = newDropdown.querySelector('.extracted-search-input');
    const newOptionsContainer = newDropdown.querySelector('.custom-select-options');
    const valueDisplay = document.getElementById('aar-extracted-value');

    newTrigger.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = !newDropdown.classList.contains('hidden');

        document.querySelectorAll('.custom-select-dropdown').forEach(dd => {
            if (dd !== newDropdown) dd.classList.add('hidden');
        });

        newDropdown.classList.toggle('hidden');
        newTrigger.classList.toggle('ring-1', 'ring-primary-500');
        newArrow.classList.toggle('rotate-180');

        if (!isOpen) {
            newSearchInput.value = '';
            newOptionsContainer.querySelectorAll('.custom-select-option').forEach(opt => opt.classList.remove('hidden'));
            newSearchInput.focus();
        }
    });

    newSearchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        newOptionsContainer.querySelectorAll('.custom-select-option').forEach(option => {
            const text = option.textContent.toLowerCase();
            option.classList.toggle('hidden', !text.includes(searchTerm));
        });
    });

    newSearchInput.addEventListener('click', (e) => e.stopPropagation());

    newOptionsContainer.addEventListener('click', (e) => {
        const option = e.target.closest('.custom-select-option');
        if (!option) return;

        const value = option.dataset.value;
        valueDisplay.textContent = value;

        // Show/hide "Other" free-form input
        const extractedOther = document.getElementById('aar-extracted-other');
        if (extractedOther) {
            if (value === 'Other') {
                extractedOther.classList.remove('hidden');
            } else {
                extractedOther.classList.add('hidden');
                extractedOther.value = '';
            }
        }

        newDropdown.classList.add('hidden');
        newTrigger.classList.remove('ring-1', 'ring-primary-500');
        newArrow.classList.remove('rotate-180');
    });

    document.addEventListener('click', (e) => {
        if (!wrapper.contains(e.target)) {
            newDropdown.classList.add('hidden');
            newTrigger.classList.remove('ring-1', 'ring-primary-500');
            newArrow.classList.remove('rotate-180');
        }
    });
}

/**
 * Initializes the AAR planet custom select component
 * Sets up click handlers, search functionality, and option selection
 * Also triggers POI dropdown population when a planet is selected
 */
function initializeAARPlanetSelect() {
    const wrapper = document.getElementById('aar-planet-select');
    if (!wrapper) return;

    const trigger = wrapper.querySelector('.custom-select-trigger');
    const dropdown = wrapper.querySelector('.custom-select-dropdown');
    const searchInput = wrapper.querySelector('.planet-search-input');
    const optionsContainer = wrapper.querySelector('.custom-select-options');

    // Remove old listeners by cloning and replacing
    const newTrigger = trigger.cloneNode(true);
    const newDropdown = dropdown.cloneNode(true);

    trigger.parentNode.replaceChild(newTrigger, trigger);
    dropdown.parentNode.replaceChild(newDropdown, dropdown);

    // Get fresh references (including valueDisplay!)
    const newArrow = newTrigger.querySelector('.custom-select-arrow');
    const newSearchInput = newDropdown.querySelector('.planet-search-input');
    const newOptionsContainer = newDropdown.querySelector('.custom-select-options');
    const valueDisplay = document.getElementById('aar-planet-value'); // Re-query after cloning

    newTrigger.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = !newDropdown.classList.contains('hidden');

        document.querySelectorAll('.custom-select-dropdown').forEach(dd => {
            if (dd !== newDropdown) dd.classList.add('hidden');
        });

        newDropdown.classList.toggle('hidden');
        newTrigger.classList.toggle('ring-1', 'ring-primary-500');
        newArrow.classList.toggle('rotate-180');

        if (!isOpen) {
            newSearchInput.value = '';
            newOptionsContainer.querySelectorAll('.custom-select-option').forEach(opt => opt.classList.remove('hidden'));
            newSearchInput.focus();
        }
    });

    newSearchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        newOptionsContainer.querySelectorAll('.custom-select-option').forEach(option => {
            const text = option.textContent.toLowerCase();
            option.classList.toggle('hidden', !text.includes(searchTerm));
        });
    });

    newSearchInput.addEventListener('click', (e) => e.stopPropagation());

    newOptionsContainer.addEventListener('click', (e) => {
        const option = e.target.closest('.custom-select-option');
        if (!option) return;

        const value = option.dataset.value;
        valueDisplay.textContent = value;

        // Populate POI dropdown for selected planet
        populateAARPOIDropdown(value);

        // Reset POI selection
        document.getElementById('aar-poi-value').textContent = 'Select POI...';

        newDropdown.classList.add('hidden');
        newTrigger.classList.remove('ring-1', 'ring-primary-500');
        newArrow.classList.remove('rotate-180');
    });

    document.addEventListener('click', (e) => {
        if (!wrapper.contains(e.target)) {
            newDropdown.classList.add('hidden');
            newTrigger.classList.remove('ring-1', 'ring-primary-500');
            newArrow.classList.remove('rotate-180');
        }
    });
}

/**
 * Initializes the AAR POI (Point of Interest) custom select component
 * Sets up click handlers, search functionality, and option selection
 */
function initializeAARPOISelect() {
    const wrapper = document.getElementById('aar-poi-select');
    if (!wrapper) return;

    const trigger = wrapper.querySelector('.custom-select-trigger');
    const dropdown = wrapper.querySelector('.custom-select-dropdown');
    const searchInput = wrapper.querySelector('.poi-search-input');
    const optionsContainer = wrapper.querySelector('.custom-select-options');

    // Remove old listeners by cloning and replacing
    const newTrigger = trigger.cloneNode(true);
    const newDropdown = dropdown.cloneNode(true);

    trigger.parentNode.replaceChild(newTrigger, trigger);
    dropdown.parentNode.replaceChild(newDropdown, dropdown);

    // Get fresh references (including valueDisplay!)
    const newArrow = newTrigger.querySelector('.custom-select-arrow');
    const newSearchInput = newDropdown.querySelector('.poi-search-input');
    const newOptionsContainer = newDropdown.querySelector('.custom-select-options');
    const valueDisplay = document.getElementById('aar-poi-value'); // Re-query after cloning

    newTrigger.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = !newDropdown.classList.contains('hidden');

        document.querySelectorAll('.custom-select-dropdown').forEach(dd => {
            if (dd !== newDropdown) dd.classList.add('hidden');
        });

        newDropdown.classList.toggle('hidden');
        newTrigger.classList.toggle('ring-1', 'ring-primary-500');
        newArrow.classList.toggle('rotate-180');

        if (!isOpen) {
            newSearchInput.value = '';
            newOptionsContainer.querySelectorAll('.custom-select-option').forEach(opt => opt.classList.remove('hidden'));
            newSearchInput.focus();
        }
    });

    newSearchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        newOptionsContainer.querySelectorAll('.custom-select-option').forEach(option => {
            const text = option.textContent.toLowerCase();
            option.classList.toggle('hidden', !text.includes(searchTerm));
        });
    });

    newSearchInput.addEventListener('click', (e) => e.stopPropagation());

    newOptionsContainer.addEventListener('click', (e) => {
        const option = e.target.closest('.custom-select-option');
        if (!option) return;

        const value = option.dataset.value;
        valueDisplay.textContent = value;

        // Show/hide POI "Other" free-form input
        const poiOther = document.getElementById('aar-poi-other');
        if (poiOther) {
            if (value === 'Other') {
                poiOther.classList.remove('hidden');
            } else {
                poiOther.classList.add('hidden');
                poiOther.value = '';
            }
        }

        newDropdown.classList.add('hidden');
        newTrigger.classList.remove('ring-1', 'ring-primary-500');
        newArrow.classList.remove('rotate-180');
    });

    document.addEventListener('click', (e) => {
        if (!wrapper.contains(e.target)) {
            newDropdown.classList.add('hidden');
            newTrigger.classList.remove('ring-1', 'ring-primary-500');
            newArrow.classList.remove('rotate-180');
        }
    });
}

// ============================================================================
// AAR GENERATION AND OUTPUT FUNCTIONS
// ============================================================================

/**
 * Generates the AAR preview text from all form inputs
 * Collects data from all AAR form fields and formats it into a structured report
 * Updates the preview element with the generated text
 */
function generateAARPreview() {
    let aar = 'SHIPS USED\n\n';

    // Ships
    const gunship = document.getElementById('aar-gunship-value').textContent;
    const medical = document.getElementById('aar-medical-value').textContent;
    const capShips = document.getElementById('aar-cap-ships').value;
    const additionalShips = document.getElementById('aar-additional-ships').value;
    const reason = document.getElementById('aar-reason').value;

    aar += `Gunship: ${gunship !== 'Select ship...' ? gunship : ''}\n`;
    aar += `Medical: ${medical !== 'Select ship...' ? medical : ''}\n`;
    aar += `CAP: ${capShips}\n`;
    aar += `Additional Ships: ${additionalShips}\n`;
    aar += `Reason: ${reason}\n\n`;

    // Intersystem Response
    const intersystem = document.getElementById('aar-intersystem-toggle').checked;
    if (intersystem) {
        aar += 'INTERSYSTEM RESPONSE\n\n';
    }

    // Location
    aar += 'LOCATION\n\n';
    const planet = document.getElementById('aar-planet-value').textContent;
    let locationType = document.getElementById('aar-location-type').value;
    const locationTypeOther = document.getElementById('aar-location-type-other').value;
    let poi = document.getElementById('aar-poi-value').textContent;
    const poiOther = document.getElementById('aar-poi-other').value;

    // Use custom input if "Other" is selected
    if (locationType === 'Other' && locationTypeOther) {
        locationType = locationTypeOther;
    }
    if (poi === 'Other' && poiOther) {
        poi = poiOther;
    }

    aar += `Planetary Body: ${planet !== 'Select planetary body...' ? planet : ''}\n`;
    aar += `Location Type: ${locationType}\n`;
    aar += `Specific POI: ${poi !== 'Select POI...' ? poi : ''}\n\n`;

    // Timestamps
    aar += 'TIMESTAMPS\n\n';
    const alert = document.getElementById('aar-alert').value;
    const depart = document.getElementById('aar-depart').value;
    const client = document.getElementById('aar-client').value;
    const rtb = document.getElementById('aar-rtb').value;

    aar += `Alert:${alert} | Depart:${depart} | Client:${client} | RTB:${rtb}\n\n`;

    // Encounters
    aar += 'ENCOUNTERS\n\n';
    const pve = document.getElementById('aar-pve').value;
    const pvp = document.getElementById('aar-pvp').value;
    const actions = document.getElementById('aar-actions').value;

    aar += `PVE: ${pve}\n`;
    aar += `PVP: ${pvp}\n`;
    aar += `Actions Taken: ${actions}\n\n`;

    // Issues
    aar += 'ISSUES\n\n';
    const issueCheckboxes = document.querySelectorAll('.aar-issue-checkbox:checked');
    const issues = Array.from(issueCheckboxes).map(cb => cb.value).join(', ');
    const otherIssues = document.getElementById('aar-other-issues').value;
    const fix = document.getElementById('aar-fix').value;

    aar += `Problems: ${issues}${otherIssues ? (issues ? ', ' : '') + otherIssues : ''}\n`;
    aar += `Brief Fix: ${fix}\n\n`;

    // Summary
    aar += 'SUMMARY\n\n';
    const summary = document.getElementById('aar-summary').value;
    aar += `${summary}\n\n`;

    // Result
    aar += 'RESULT\n\n';
    const outcome = document.getElementById('aar-outcome').value;
    let extractedTo = document.getElementById('aar-extracted-value').textContent;
    const extractedOther = document.getElementById('aar-extracted-other').value;
    let challenges = document.getElementById('aar-challenges').value;
    const challengesOther = document.getElementById('aar-challenges-other').value;
    const failure = document.getElementById('aar-failure').value;

    // Use custom input if "Other" is selected
    if (extractedTo === 'Other' && extractedOther) {
        extractedTo = extractedOther;
    }
    // Don't show placeholder text
    if (extractedTo === 'Select...') {
        extractedTo = '';
    }

    // Use custom input for challenges if "Other" is selected
    if (challenges === 'Other' && challengesOther) {
        challenges = challengesOther;
    }

    aar += `Mission Outcome: ${outcome}\n`;
    // Only show "Client Extracted To" if outcome is Success
    if (outcome === 'Success') {
        aar += `Client Extracted To: ${extractedTo}\n`;
    }
    aar += `Challenges: ${challenges}\n`;
    aar += `Failure/Abort Reason: ${failure}\n\n`;

    // Notes
    aar += 'NOTES:\n\n';
    const notes = document.getElementById('aar-notes').value;
    aar += notes;

    // Update preview
    document.getElementById('aar-preview').textContent = aar;
}

// ============================================================================
// CLIPBOARD AND UI FUNCTIONS
// ============================================================================

/**
 * Copies the generated AAR text to the clipboard
 * Uses navigator.clipboard API with fallback for older browsers
 * Shows success message after copying
 */
function copyAARToClipboard() {
    const output = document.getElementById('aar-preview').textContent;

    if (!navigator.clipboard) {
        try {
            const textArea = document.createElement('textarea');
            textArea.value = output;
            textArea.style.position = 'fixed';
            textArea.style.top = '0';
            textArea.style.left = '0';
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            showAARSuccessMessage();
        } catch (err) {
            console.error('Fallback: Oops, unable to copy', err);
            alert('Failed to copy to clipboard. Please try again.');
        }
        return;
    }

    navigator.clipboard.writeText(output).then(() => {
        showAARSuccessMessage();
    }).catch(err => {
        alert('Failed to copy to clipboard. Please try again.');
        console.error('Failed to copy:', err);
    });
}

/**
 * Shows a success message after copying AAR to clipboard
 * Message automatically hides after 3 seconds
 */
function showAARSuccessMessage() {
    const successMessage = document.getElementById('aar-successMessage');
    successMessage.classList.remove('hidden');
    setTimeout(() => {
        successMessage.classList.add('hidden');
    }, 3000);
}

/**
 * Clears all AAR form fields and resets to default state
 * Resets all dropdowns, inputs, checkboxes, and preview text
 */
function clearAAR() {
    // Reset all select values
    document.getElementById('aar-gunship-value').textContent = 'Select ship...';
    document.getElementById('aar-medical-value').textContent = 'Select ship...';
    document.getElementById('aar-planet-value').textContent = 'Select planetary body...';
    document.getElementById('aar-poi-value').textContent = 'Select POI...';
    document.getElementById('aar-extracted-value').textContent = 'Select...';

    // Reset all inputs
    document.getElementById('aar-cap-ships').value = '';
    document.getElementById('aar-additional-ships').value = '';
    document.getElementById('aar-reason').value = '';
    document.getElementById('aar-location-type').value = '';
    document.getElementById('aar-location-type-other').value = '';
    document.getElementById('aar-poi-other').value = '';
    document.getElementById('aar-extracted-other').value = '';
    document.getElementById('aar-alert').value = '00';
    document.getElementById('aar-depart').value = '';
    document.getElementById('aar-client').value = '';
    document.getElementById('aar-rtb').value = '';
    document.getElementById('aar-pve').value = '';
    document.getElementById('aar-pvp').value = '';
    document.getElementById('aar-actions').value = '';
    document.getElementById('aar-other-issues').value = '';
    document.getElementById('aar-fix').value = '';
    document.getElementById('aar-summary').value = '';
    document.getElementById('aar-outcome').value = '';
    document.getElementById('aar-challenges').value = '';
    document.getElementById('aar-challenges-other').value = '';
    document.getElementById('aar-failure').value = '';
    document.getElementById('aar-notes').value = '';

    // Hide all "Other" free-form inputs
    document.getElementById('aar-location-type-other').classList.add('hidden');
    document.getElementById('aar-poi-other').classList.add('hidden');
    document.getElementById('aar-extracted-other').classList.add('hidden');
    document.getElementById('aar-challenges-other').classList.add('hidden');

    // Hide extracted container (only shown when outcome is Success)
    document.getElementById('aar-extracted-container').classList.add('hidden');

    // Uncheck all checkboxes
    document.getElementById('aar-intersystem-toggle').checked = false;
    document.querySelectorAll('.aar-issue-checkbox').forEach(cb => cb.checked = false);

    // Reset preview
    document.getElementById('aar-preview').textContent = 'Generate AAR to see preview...';
}

// ============================================================================
// MODULE EXPORTS (for ES6 modules if needed)
// ============================================================================

// Uncomment the following if using ES6 modules:
/*
export {
    // Initialization
    initializePlanetaryBodies,

    // Ship dropdowns
    populateAARShipDropdowns,
    populateAARShipDropdown,

    // Location dropdowns
    populateAARPlanetDropdown,
    populateAARPOIDropdown,
    populateExtractedToDropdown,

    // Custom select initialization
    initializeAARSelect,
    initializeExtractedToSelect,
    initializeAARPlanetSelect,
    initializeAARPOISelect,

    // AAR generation and output
    generateAARPreview,
    copyAARToClipboard,
    showAARSuccessMessage,
    clearAAR,

    // State setters (for linking with external modules)
    setShips: (shipsArray) => { ships = shipsArray; },
    setSHIPS: (shipsArray) => { SHIPS = shipsArray; }
};
*/
