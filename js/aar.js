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

// ============================================================================
// ALERT TIMER MODULE
// ============================================================================

/**
 * Timer stages in order
 * @type {Array<{id: string, label: string, buttonText: string, field: string|null}>}
 */
const TIMER_STAGES = [
    { id: "idle", label: "Ready", buttonText: "Start Alert Timer", field: null },
    { id: "alert", label: "Alert Started", buttonText: "Left Station", field: "aar-alert" },
    { id: "depart", label: "En Route", buttonText: "Arrived at Client", field: "aar-depart" },
    { id: "client", label: "On Scene", buttonText: "RTB", field: "aar-client" },
    { id: "rtb", label: "Complete", buttonText: "Start Alert Timer", field: "aar-rtb" }
];

/**
 * Current timer stage index
 * @type {number}
 */
let timerStageIndex = 0;

/**
 * Timer start timestamp (ms since epoch)
 * @type {number|null}
 */
let timerStartTime = null;

/**
 * Timer interval ID for updating display
 * @type {number|null}
 */
let timerIntervalId = null;

/**
 * Shows a brief reminder message near the timer.
 *
 * @function showTimerReminder
 * @param {string} message - The reminder message to display
 * @param {number} duration - How long to show the reminder (ms)
 */
function showTimerReminder(message, duration = 4000) {
    const reminder = document.getElementById("timer-reminder");
    const reminderText = document.getElementById("timer-reminder-text");
    if (!reminder || !reminderText) return;

    reminderText.textContent = message;
    reminder.classList.remove("hidden");

    // Hide after duration
    setTimeout(() => {
        reminder.classList.add("hidden");
    }, duration);
}

/**
 * Advances the alert timer to the next stage.
 * Records elapsed time in the appropriate AAR field.
 *
 * @function advanceAlertTimer
 */
function advanceAlertTimer() {
    const currentStage = TIMER_STAGES[timerStageIndex];

    if (timerStageIndex === 0) {
        // Starting the timer
        timerStartTime = Date.now();
        timerStageIndex = 1;

        // Set Alert field to 00
        const alertField = document.getElementById("aar-alert");
        if (alertField) alertField.value = "00";

        // Start the display update interval (every 50ms for smooth centiseconds)
        timerIntervalId = setInterval(updateTimerDisplay, 50);
        updateTimerDisplay();

        // Show reminder to update channel status
        showTimerReminder("🚨 Update channel status to ACTIVE ALERT!", 5000);
    } else if (timerStageIndex < TIMER_STAGES.length - 1) {
        // Advancing to next stage
        timerStageIndex++;
        const newStage = TIMER_STAGES[timerStageIndex];

        // Calculate elapsed minutes
        const elapsedMs = Date.now() - timerStartTime;
        const elapsedMinutes = Math.floor(elapsedMs / 60000);

        // Fill in the AAR field for this stage
        if (newStage.field) {
            const field = document.getElementById(newStage.field);
            if (field) {
                field.value = elapsedMinutes.toString();
                // Trigger change event for AAR preview update
                field.dispatchEvent(new Event("input", { bubbles: true }));
            }
        }

        // If this was the last stage (RTB), show reminder and reset after a delay
        if (timerStageIndex === TIMER_STAGES.length - 1) {
            // Show reminder to update channel status
            showTimerReminder("✅ Update channel status to STANDBY!", 5000);

            setTimeout(() => {
                resetAlertTimer();
            }, 2000);
        }
    }

    updateTimerButton();
    updateTimerDisplay();
    generateAARPreview();
}

/**
 * Resets the alert timer to idle state.
 *
 * @function resetAlertTimer
 * @param {boolean} clearTimestamps - Whether to also clear AAR timestamps
 */
function resetAlertTimer(clearTimestamps = false) {
    if (timerIntervalId) {
        clearInterval(timerIntervalId);
        timerIntervalId = null;
    }
    timerStageIndex = 0;
    timerStartTime = null;

    // Clear AAR timestamp fields if requested
    if (clearTimestamps) {
        document.getElementById("aar-alert").value = "00";
        document.getElementById("aar-depart").value = "";
        document.getElementById("aar-client").value = "";
        document.getElementById("aar-rtb").value = "";
        generateAARPreview();
    }

    // Deactivate alert from home module
    if (typeof deactivateAlert === 'function') {
        deactivateAlert();
    }

    updateTimerButton();
    updateTimerDisplay();
}

/**
 * Confirms and resets the alert timer, warning about AAR timestamp clearing.
 * Called by the Reset button in the UI.
 *
 * @function confirmResetAlertTimer
 */
function confirmResetAlertTimer() {
    // If timer hasn't started, just reset without warning
    if (!timerStartTime) {
        resetAlertTimer(false);
        return;
    }

    const message = "Reset the timer?\n\nThis will also clear the AAR timestamp fields (Alert, Depart, Client, RTB).";

    if (confirm(message)) {
        resetAlertTimer(true);
    }
}

/**
 * Updates the timer button text based on current stage.
 *
 * @function updateTimerButton
 */
function updateTimerButton() {
    const button = document.getElementById("alert-timer-button");
    if (!button) return;

    const stage = TIMER_STAGES[timerStageIndex];
    button.textContent = stage.buttonText;

    // Update button styling based on stage
    button.className = "w-full rounded-lg px-6 py-4 text-lg font-bold transition ";

    if (timerStageIndex === 0) {
        // Idle - green start button
        button.className += "bg-green-600 hover:bg-green-700 text-white border border-green-500";
    } else if (timerStageIndex === TIMER_STAGES.length - 1) {
        // Complete - brief success state
        button.className += "bg-blue-600 text-white border border-blue-500 cursor-default";
    } else {
        // Active stages - orange/amber
        button.className += "bg-amber-600 hover:bg-amber-700 text-white border border-amber-500";
    }
}

/**
 * Updates the timer display showing elapsed time and current stage.
 * Format: MM:SS:cs (minutes:seconds:centiseconds)
 *
 * @function updateTimerDisplay
 */
function updateTimerDisplay() {
    const display = document.getElementById("alert-timer-display");
    const stageLabel = document.getElementById("alert-timer-stage");
    if (!display) return;

    if (timerStartTime) {
        const elapsedMs = Date.now() - timerStartTime;
        const totalSeconds = Math.floor(elapsedMs / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        const centiseconds = Math.floor((elapsedMs % 1000) / 10);
        display.textContent = `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}:${centiseconds.toString().padStart(2, "0")}`;
    } else {
        display.textContent = "00:00:00";
    }

    if (stageLabel) {
        const stage = TIMER_STAGES[timerStageIndex];
        stageLabel.textContent = stage.label;
    }
}

/**
 * Initializes the alert timer on page load.
 *
 * @function initializeAlertTimer
 */
function initializeAlertTimer() {
    updateTimerButton();
    updateTimerDisplay();
}

// ============================================================================
// LOCATION DATA
// ============================================================================

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
const LOCATIONS_DATABASE_DATA = {
    systems: {
        STANTON: {
            name: "Stanton",
            jumpPointStations: ["Pyro Gateway"],
            planets: {
                HURSTON: {
                    name: "Hurston",
                    designation: "Stanton I",
                    type: "planet",
                    landingZones: ["Lorville"],
                    settlements: [
                        "Cutter's Rig",
                        "Finn's Folly",
                        "Ludlow",
                        "Maker's Point",
                        "Picker's Field",
                        "Rappel",
                        "Weeping Cove",
                        "Zephyr"
                    ],
                    pois: [
                        "Broken Patch",
                        "Covalex Distribution Centre S1DC06",
                        "Downed Relay AC-652",
                        "Dupree Industrial Manufacturing Facility",
                        "Echo Isle",
                        "Greycat Stanton I Production Complex-B",
                        "HDMO-Calthrope",
                        "HDMS-Edmond",
                        "HDMS-Hadley",
                        "HDMS-Oparei",
                        "HDMS-Pinewood",
                        "HDMS-Stanhope",
                        "HDMS-Thedus",
                        "HDOF-Palomar",
                        "HDPC-Cassillo",
                        "HDPC-Farnesway",
                        "HDRSO-Baier",
                        "HDRSO-Bardie",
                        "HDRSO-Bersch",
                        "HDRSO-Bowes",
                        "HDRSO-Brel",
                        "HDRSO-Cronshaw",
                        "HDRSO-Foster",
                        "HDRSO-Franz",
                        "HDRSO-Giblin",
                        "HDRSO-Hosley",
                        "HDRSO-Malloy",
                        "HDRSO-Marling",
                        "HDRSO-McKuen",
                        "HDRSO-Newman",
                        "HDRSO-Olliff",
                        "HDRSO-Pearce",
                        "HDRSO-Sheppard",
                        "HDRSO-Simms",
                        "HDRSO-Stott",
                        "HDRSO-Tillman",
                        "HDRSO-Walker",
                        "HDRSO-Wyatt",
                        "HDSF-Adlai",
                        "HDSF-Barnabas",
                        "HDSF-Breckinridge",
                        "HDSF-Colfax",
                        "HDSF-Damaris",
                        "HDSF-Elbridge",
                        "HDSF-Hendricks",
                        "HDSF-Hiram",
                        "HDSF-Hobart",
                        "HDSF-Ishmael",
                        "HDSF-Millerand",
                        "HDSF-Rufus",
                        "HDSF-Sherman",
                        "HDSF-Tamar",
                        "HDSF-Tompkins",
                        "HDSF-Zacharias",
                        "Lorville Outskirts",
                        "Lowdown",
                        "Reclamation & Disposal Orinth",
                        "Rico's Remains",
                        "Sakura Sun Magnolia Workcenter",
                        "Trilo"
                    ],
                    stations: ["Everus Harbor"],
                    lagrangeStations: [
                        "HUR-L1 (Rest & Relax)",
                        "HUR-L2 (Faithful Dream)",
                        "HUR-L3 (Thundering Express)",
                        "HUR-L4 (Ambitious Dream)",
                        "HUR-L5 (Beautiful Glen)"
                    ],
                    moons: {
                        ARIAL: {
                            name: "Arial",
                            designation: "Stanton 1a",
                            pois: [
                                "HDMS-Bezdek",
                                "HDMS-Lathan",
                                "CommArray ST1-13",
                                "Coven",
                                "Onyx Facility S1A8",
                                "Smokestack",
                                "The Dregs"
                            ]
                        },
                        ABERDEEN: {
                            name: "Aberdeen",
                            designation: "Stanton 1b",
                            pois: [
                                "HDMS-Anderson",
                                "HDMS-Norgaard",
                                "Klescher Rehabilitation Facility",
                                "Barton Flats Aid Shelter",
                                "HDMO-Dobbs",
                                "CommArray ST1-92",
                                "The Grove",
                                "Boondoggle",
                                "Rupture OLP",
                                "Vivere OLP"
                            ]
                        },
                        MAGDA: { name: "Magda", designation: "Stanton 1c", pois: ["HDMS-Hahn", "HDMS-Perlman", "CommArray ST1-48"] },
                        ITA: {
                            name: "Ita",
                            designation: "Stanton 1d",
                            pois: ["HDMS-Woodruff", "HDMS-Ryder", "The Shades", "Thimblerig", "CommArray ST1-13"]
                        }
                    }
                },
                CRUSADER: {
                    name: "Crusader",
                    designation: "Stanton II",
                    type: "gas_giant",
                    landingZones: ["Orison"],
                    settlements: ["Cloudrest Retreat", "Empyrean Park", "Prospect Point"],
                    stations: ["Port Olisar", "Security Post Kareah", "Seraphim Station", "CommArray ST2-55", "GrimHEX"],
                    lagrangeStations: ["CRU-L1 (Ambitious Dream)", "CRU-L4 (Shallow Frontier)", "CRU-L5 (Beautiful Glen)"],
                    moons: {
                        CELLIN: {
                            name: "Cellin",
                            designation: "Stanton 2a",
                            pois: [
                                "Gallete Family Farms",
                                "Terra Mills HydroFarm",
                                "Tram & Myers Mining",
                                "Hickes Research Outpost",
                                "Security Post Criska",
                                "Security Post Dipur",
                                "Security Post Lespin",
                                "Ashburn Channel Aid Shelter",
                                "Flanagan's Ravine Aid Shelter",
                                "Julep Ravine Aid Shelter",
                                "Mogote Aid Shelter",
                                "NT-999-XV",
                                "Stash House (Cellin)",
                                "Unnamed Abandoned Outpost",
                                "CommArray ST2-28"
                            ]
                        },
                        DAYMAR: {
                            name: "Daymar",
                            designation: "Stanton 2b",
                            pois: [
                                "Bountiful Harvest Hydroponics",
                                "ArcCorp Mining Area 141",
                                "Kudre Ore",
                                "Shubin Mining Facility SCD-1",
                                "Security Post Moluto",
                                "Security Post Prashad",
                                "Security Post Thaquray",
                                "NT-999-XVI",
                                "The Garden",
                                "TPF",
                                "Wailing Rock",
                                "Kudre Ore Mine (Closed)",
                                "Dunlow Ridge Aid Shelter",
                                "Eager Flats Aid Shelter",
                                "Tamdon Plains Aid Shelter",
                                "Wolf Point Aid Shelter",
                                "Brio's Breaker Yard",
                                "Whistlers Crypt",
                                "Yadar Valley",
                                "Nuen Waste Management",
                                "UEES Flyssa Wreck",
                                "Covalex Hub Gundo",
                                "CommArray ST2-47"
                            ]
                        },
                        YELA: {
                            name: "Yela",
                            designation: "Stanton 2c",
                            pois: [
                                "Abandoned Outpost (Mining Facility)",
                                "ArcCorp Mining Area 157",
                                "Benson Mining Outpost",
                                "Deakins Research Outpost",
                                "Jumptown",
                                "Security Post Opal",
                                "Security Post Wan",
                                "Aston Ridge Aid Shelter",
                                "Kosso Basin Aid Shelter",
                                "Nakamura Valley Aid Shelter",
                                "Talarine Divide Aid Shelter",
                                "Afterlife",
                                "Connor's",
                                "Utopia",
                                "NT-999-XX",
                                "NT-999-XXII",
                                "Half Stack",
                                "Mainline",
                                "Miner's Lament",
                                "Rolo's Crater",
                                "Benny Henge",
                                "CommArray ST2-76"
                            ],
                            stations: ["GrimHEX"]
                        }
                    }
                },
                ARCCORP: {
                    name: "ArcCorp",
                    designation: "Stanton III",
                    type: "planet",
                    landingZones: ["Area 18"],
                    settlements: ["Area04", "Area06", "Area07", "Area11", "Area17", "Area20", "Area26", "Area39"],
                    pois: ["The Sky Scraper", "Ermer Family Farms Creamery", "CommArray ST3-90"],
                    stations: ["Baijini Point"],
                    lagrangeStations: [
                        "ARC-L1 (Wide Forest)",
                        "ARC-L2 (Lively Pathway)",
                        "ARC-L3 (Modern Icarus)",
                        "ARC-L4 (Faint Glen)",
                        "ARC-L5 (Stately Home)"
                    ],
                    moons: {
                        LYRIA: {
                            name: "Lyria",
                            designation: "Stanton 3a",
                            pois: [
                                "Humboldt Mines",
                                "Loveridge Mineral Reserve",
                                "Shubin Mining Facility SAL-2",
                                "Shubin Mining Facility SAL-5",
                                "Shubin Processing Facility SPAL-3",
                                "Shubin Processing Facility SPAL-7",
                                "Shubin Processing Facility SPAL-9",
                                "Shubin Processing Facility SPAL-12",
                                "Shubin Processing Facility SPAL-16",
                                "Shubin Processing Facility SPAL-21",
                                "Security Depot Lyria-1",
                                "Elsewhere",
                                "Teddy's Playhouse",
                                "The Orphanage",
                                "The Pit",
                                "Wheeler's",
                                "Paradise Cove",
                                "Buckets",
                                "Launch Pad",
                                "CommArray ST3-18"
                            ]
                        },
                        WALA: {
                            name: "Wala",
                            designation: "Stanton 3b",
                            pois: [
                                "Shady Glen Farms",
                                "ArcCorp Mining Area 045",
                                "ArcCorp Mining Area 048",
                                "ArcCorp Mining Area 056",
                                "ArcCorp Mining Area 061",
                                "ArcCorp Processing Center 115",
                                "ArcCorp Processing Center 123",
                                "Lost and Found",
                                "Good Times Temple",
                                "Samson & Sons Salvage Center",
                                "CommArray ST3-35"
                            ]
                        }
                    }
                },
                MICROTECH: {
                    name: "microTech",
                    designation: "Stanton IV",
                    type: "planet",
                    landingZones: ["New Babbage"],
                    settlements: [
                        "Astor's Clearing",
                        "Bloodshot Ridge",
                        "Dunboro",
                        "Frostbite",
                        "Ghost Hollow",
                        "Harper's Point",
                        "Moreland Hills",
                        "Razor's Edge"
                    ],
                    pois: [
                        "MT DataCenter 2UB-RB9-5",
                        "MT DataCenter 4HJ-LVE-A",
                        "MT DataCenter 5WQ-R2V-C",
                        "MT DataCenter 8FK-Q2X-K",
                        "MT DataCenter D79-ECG-R",
                        "MT DataCenter E2Q-NSG-Y",
                        "MT DataCenter TMG-XEV-2",
                        "MT DataCenter QVX-J88-J",
                        "MT DataCenter L8P-JUC-8",
                        "MT DataCenter KH3-AAE-L",
                        "Calhoun Pass Emergency Shelter",
                        "Point Wain Emergency Shelter",
                        "Nuiqsut Emergency Shelter",
                        "Clear View Emergency Shelter",
                        "Shubin Mining Facility SM0-10",
                        "Shubin Mining Facility SM0-13",
                        "Shubin Mining Facility SM0-18",
                        "Shubin Mining Facility SM0-22",
                        "Rayari Deltana Research Outpost",
                        "Rayari Livengood Research Outpost",
                        "MT OpCenter LTI-4",
                        "Outpost 54",
                        "The Necropolis",
                        "Covalex Distribution Centre S4DC05",
                        "Greycat Stanton IV Production Complex-A",
                        "Cry-Astro Processing Plant 34-12",
                        "Cry-Astro Processing Plant 19-02",
                        "MicroTech Logistics Depot S4LD01",
                        "MicroTech Logistics Depot S4LD13",
                        "Sakura Sun Goldenrod Workcenter"
                    ],
                    stations: ["Port Tressler"],
                    lagrangeStations: [
                        "MIC-L1 (Shallow Frontier)",
                        "MIC-L2 (Long Forest)",
                        "MIC-L3 (Endless Odyssey)",
                        "MIC-L4 (Melodic Fields)",
                        "MIC-L5 (Shady Stockade)"
                    ],
                    moons: {
                        CALLIOPE: {
                            name: "Calliope",
                            designation: "Stanton 4a",
                            pois: [
                                "Shubin Mining Facility SMCa-6",
                                "Shubin Mining Facility SMCa-8",
                                "Shubin Processing Facility SPMC-1",
                                "Shubin Processing Facility SPMC-3",
                                "Shubin Processing Facility SPMC-5",
                                "Shubin Processing Facility SPMC-10",
                                "Shubin Processing Facility SPMC-11",
                                "Shubin Processing Facility SPMC-14",
                                "Rayari Anvik Research Outpost",
                                "Rayari Kaltag Research Outpost",
                                "Raven's Roost",
                                "CommArray ST4-31",
                                "Blighter's Run",
                                "Hard Knocks",
                                "Hasbin Hall",
                                "Regiment Downs"
                            ]
                        },
                        CLIO: {
                            name: "Clio",
                            designation: "Stanton 4b",
                            pois: ["Rayari Cantwell Research Outpost", "Rayari McGrath Research Outpost", "CommArray ST4-59"]
                        },
                        EUTERPE: {
                            name: "Euterpe",
                            designation: "Stanton 4c",
                            pois: ["Bud's Growery", "The Icebreaker", "Devlin Scrap & Salvage", "CommArray ST4-64"]
                        }
                    }
                }
            }
        },
        PYRO: {
            name: "Pyro",
            jumpPointStations: ["Stanton Gateway"],
            planets: {
                PYRO1: {
                    name: "Pyro I",
                    designation: "Pyro I",
                    type: "planet",
                    pois: [
                        "Gray Gardens Depot",
                        "Rustville",
                        "Stag's Rut",
                        "Lazarus Phoenix Research Lab",
                        "Lazarus Tithonus Research Lab",
                        "Lazarus Transport Hub Phoenix-I",
                        "Lazarus Transport Hub Phoenix-II",
                        "Lazarus Transport Hub Phoenix-III",
                        "Lazarus Transport Hub Tithonus-I",
                        "Lazarus Transport Hub Tithonus-II",
                        "Lazarus Transport Hub Tithonus-III"
                    ],
                    lagrangeStations: ["PYAM-FARSTAT-1-2 (L2)", "PYAM-FARSTAT-1-3 (L3 - Akiro Cluster)", "PYAM-FARSTAT-1-5 (L5)"]
                },
                MONOX: {
                    name: "Monox",
                    designation: "Pyro II",
                    type: "planet",
                    pois: ["Arid Reach", "Jackson's Swap", "Last Ditch", "Ostler's Claim", "Slowburn Depot", "Sunset Mesa", "Yang's Place"],
                    lagrangeStations: ["Checkmate Station (L4)"]
                },
                BLOOM: {
                    name: "Bloom",
                    designation: "Pyro III",
                    type: "planet",
                    pois: [
                        "Bueno Ravine",
                        "Frigid Knot",
                        "Narena's Rest",
                        "Shepherd's Rest",
                        "Carver's Ridge",
                        "The Golden Riviera",
                        "The Yard",
                        "Windfall",
                        "Shadowfall",
                        "Prospect Depot"
                    ],
                    stations: ["Orbituary"],
                    lagrangeStations: [
                        "Starlight Service Station (L1)",
                        "PYAM-FARSTAT-3-2 (L2)",
                        "Patch City (L3)",
                        "PYAM-FARSTAT-3-4 (L4)",
                        "PYAM-FARSTAT-3-5 (L5)"
                    ]
                },
                PYRO4: {
                    name: "Pyro IV",
                    designation: "Pyro IV",
                    type: "planet",
                    pois: [
                        "Sacren's Plot",
                        "Chawla's Beach",
                        "Dinger's Depot",
                        "Fallow Field",
                        "Farro Data Center I",
                        "Farro Data Center II",
                        "Farro Data Center III",
                        "Farro Data Center IV",
                        "Farro Data Center V",
                        "Farro Data Center VI",
                        "Farro Data Center VII",
                        "Farro Data Center VIII",
                        "Farro Data Center IX",
                        "Farro Data Center X",
                        "Goner's Deal"
                    ]
                },
                PYRO5: {
                    name: "Pyro V",
                    designation: "Pyro V",
                    type: "gas_giant",
                    lagrangeStations: [
                        "PYAM-FARSTAT-5-1 (L1)",
                        "Gaslight (L2)",
                        "PYAM-FARSTAT-5-3 (L3)",
                        "Rod's Fuel 'N Supplies (L4)",
                        "Rat's Nest (L5)"
                    ],
                    moons: {
                        IGNIS: { name: "Ignis", designation: "Pyro 5a", pois: ["Ashland", "Kabir's Post"] },
                        VATRA: { name: "Vatra", designation: "Pyro 5b", pois: ["Seer's Canyon"] },
                        ADIR: { name: "Adir", designation: "Pyro 5c", pois: ["Prophet's Peak", "Derelict Outpost", "Obsidian Crack"] },
                        FAIRO: { name: "Fairo", designation: "Pyro 5d", pois: ["Outpost 08P", "FEO Canyon Depot", "YW-2455-WS"] },
                        FUEGO: { name: "Fuego", designation: "Pyro 5e", pois: ["RAB-Lamda", "RAB-Over", "RAB-Victory"] },
                        VUUR: { name: "Vuur", designation: "Pyro 5f", pois: [] }
                    }
                },
                TERMINUS: {
                    name: "Terminus",
                    designation: "Pyro VI",
                    type: "planet",
                    pois: [
                        "Blackrock Exchange",
                        "Bullock's Reach",
                        "Canard View",
                        "Kinder Plots",
                        "Last Landings",
                        "Rough Landing",
                        "Scarper's Turn",
                        "Stonetree",
                        "Supply Gap",
                        "Watcher's Depot"
                    ],
                    stations: ["Ruin Station"],
                    lagrangeStations: ["PYAM-FARSTAT-6-2 (L2)", "Endgame (L3)", "Dudley & Daughters (L4)", "Megumi Refueling (L5)"]
                }
            }
        },
        NYX: {
            name: "Nyx",
            jumpPointStations: ["Stanton Gateway", "Pyro Gateway", "Castra Gateway"],
            planets: {
                GLACIANBELT: {
                    name: "Glacian Belt",
                    designation: "Belt",
                    type: "belt",
                    pois: [],
                    stations: ["Levski"],
                    lagrangeStations: ["QV Sites"]
                }
            }
        }
    },
    locationTypes: {
        city: "Landing Zone / City",
        settlement: "Settlement / Outpost",
        station: "Space Station",
        lagrange: "Lagrange Station",
        mining: "Mining Facility / Outpost",
        processing: "Processing Facility",
        research: "Research Outpost",
        security: "Security Post / Bunker",
        distribution: "Distribution Center",
        data: "Data Center",
        farm: "Agricultural / Farm",
        shelter: "Aid Shelter / Emergency Shelter",
        salvage: "Salvage Yard",
        cave: "Cave System",
        wreck: "Derelict / Wreck",
        racetrack: "Racetrack",
        prison: "Prison / Rehabilitation Facility",
        commarray: "Communication Array",
        other: "Other Point of Interest"
    }
};

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
        console.warn("Locations database not available");
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
                designation: "System Jump Points",
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
                designation: planetData.designation || "",
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
                        designation: moonData.designation || "",
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
    initializeAARLocationTypeSelect(); // Initialize Location Type dropdown
}

// ============================================================================
// SHIP DROPDOWN POPULATION FUNCTIONS
// ============================================================================

/**
 * Populates AAR ship dropdowns (Gunship, Medical, and CAP) from current ship assignments
 * Extracts unique ships from the ships array and populates dropdowns
 * Pre-selects ships based on their type in Ship Assignments
 */
function populateAARShipDropdowns() {
    const assignedShips = ships.map(s => s.ship).filter(s => s && s.trim() !== "");

    // Get unique ships (in case of duplicates)
    const uniqueShips = [...new Set(assignedShips)];

    // Find Gunship and Medship from assignments
    const gunshipAssignment = ships.find(s => s.type === "Gunship" && s.ship && s.ship.trim() !== "");
    const medshipAssignment = ships.find(s => s.type === "Medship" && s.ship && s.ship.trim() !== "");

    // Populate Gunship and Medical dropdowns with pre-selection
    // Medical includes "None" option for when Gunship doubles as Medical
    populateAARShipDropdown("aar-gunship", uniqueShips, gunshipAssignment?.ship || null, false);
    populateAARShipDropdown("aar-medical", uniqueShips, medshipAssignment?.ship || null, true);

    // Populate CAP dropdowns from CAP ships in assignments
    populateCAPFromAssignments();
}

/**
 * Populates a specific AAR ship dropdown with options
 * Creates two sections: assigned ships from ship assignments, and all available ships
 *
 * @param {string} selectId - The ID of the select element (e.g., 'aar-gunship')
 * @param {Array<string>} assignedShips - Array of ship names from current assignments
 * @param {string|null} preselectedShip - Optional ship name to pre-select
 */
function populateAARShipDropdown(selectId, assignedShips, preselectedShip = null, includeNone = false) {
    const optionsContainer = document.getElementById(selectId + "-options");
    if (!optionsContainer) {
        console.warn("Options container not found for:", selectId);
        return;
    }

    let options = "";

    // Add "None" option if requested (useful for Medical when Gunship doubles as Medical)
    if (includeNone) {
        options += `<div class="custom-select-option cursor-pointer px-3 py-2 text-sm text-gray-400 italic hover:bg-mrs-button hover:text-white" data-value="None">None (Gunship doubles as Medical)</div>`;
        options += '<div class="border-t border-gray-600 my-1"></div>';
    }

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

    // Pre-select the ship if provided
    if (preselectedShip) {
        const valueDisplay = document.getElementById(selectId + "-value");
        if (valueDisplay) {
            valueDisplay.textContent = preselectedShip;
        }
    }

    // Wait a tick for DOM to update, then initialize the select
    setTimeout(() => {
        initializeAARSelect(selectId);
    }, 0);
}

// ============================================================================
// CAP SHIP DROPDOWN FUNCTIONS
// ============================================================================

/**
 * Counter for unique CAP dropdown IDs
 * @type {number}
 */
let capDropdownCounter = 0;

/**
 * Adds a new CAP ship dropdown to the container
 * When a ship is selected, automatically adds another empty dropdown
 *
 * @param {string} [preselectedShip] - Optional ship name to pre-select
 */
function addCAPShipDropdown(preselectedShip = null) {
    const container = document.getElementById("aar-cap-container");
    if (!container) return;

    // Hide the "No CAP ships" message
    const emptyMsg = document.getElementById("aar-cap-empty");
    if (emptyMsg) emptyMsg.classList.add("hidden");

    const dropdownId = `aar-cap-${capDropdownCounter++}`;

    // Get ships from assignments and all ships
    const assignedShips = ships.map(s => s.ship).filter(s => s && s.trim() !== "");
    const uniqueAssignedShips = [...new Set(assignedShips)];

    // Build options HTML
    let optionsHtml = "";
    if (uniqueAssignedShips.length > 0) {
        optionsHtml += '<div class="px-3 py-2 text-xs font-semibold uppercase text-blue-300 bg-gray-800">From Assignments</div>';
        uniqueAssignedShips.forEach(ship => {
            optionsHtml += `<div class="custom-select-option cursor-pointer px-3 py-2 text-sm text-gray-300 hover:bg-mrs-button hover:text-white" data-value="${ship}">${ship}</div>`;
        });
        optionsHtml += '<div class="border-t border-gray-600 my-1"></div>';
        optionsHtml += '<div class="px-3 py-2 text-xs font-semibold uppercase text-blue-300 bg-gray-800">All Ships</div>';
    }
    SHIPS.forEach(ship => {
        optionsHtml += `<div class="custom-select-option cursor-pointer px-3 py-2 text-sm text-gray-300 hover:bg-mrs-button hover:text-white" data-value="${ship}">${ship}</div>`;
    });

    // Create the dropdown wrapper
    const wrapper = document.createElement("div");
    wrapper.className = "cap-ship-wrapper relative flex items-center gap-1";
    wrapper.id = dropdownId + "-wrapper";
    wrapper.innerHTML = `
        <div class="custom-select-wrapper relative flex-1" id="${dropdownId}-select" style="min-width: 180px;">
            <div class="custom-select-trigger relative flex w-full cursor-pointer items-center justify-between rounded-md border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-gray-200 transition hover:border-primary-500">
                <span class="custom-select-value truncate pr-4" id="${dropdownId}-value">${preselectedShip || "Select CAP ship..."}</span>
                <svg class="custom-select-arrow absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 transition-transform duration-200" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd"/>
                </svg>
            </div>
            <div class="custom-select-dropdown absolute left-0 right-0 top-full z-50 mt-1 hidden overflow-hidden rounded-md border border-gray-600 bg-gray-700 shadow-lg">
                <div class="border-b border-gray-600 bg-gray-800 p-2">
                    <input type="text" placeholder="Search ships..." class="cap-ship-search-input w-full rounded-md border border-gray-600 bg-gray-900 px-3 py-1.5 text-sm text-gray-200 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500">
                </div>
                <div class="custom-select-options custom-scrollbar max-h-60 overflow-y-auto" id="${dropdownId}-options">
                    ${optionsHtml}
                </div>
            </div>
        </div>
        <button type="button" onclick="removeCAPShipDropdown('${dropdownId}-wrapper')" class="rounded p-1 text-gray-400 hover:bg-gray-700 hover:text-red-400 transition">
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
        </button>
    `;

    container.appendChild(wrapper);

    // Initialize the dropdown
    setTimeout(() => {
        initializeCAPDropdown(dropdownId);
    }, 0);
}

/**
 * Removes a CAP ship dropdown from the container
 *
 * @param {string} wrapperId - The ID of the wrapper element to remove
 */
function removeCAPShipDropdown(wrapperId) {
    const wrapper = document.getElementById(wrapperId);
    if (wrapper) {
        wrapper.remove();
    }

    // Show "No CAP ships" message if container is empty
    const container = document.getElementById("aar-cap-container");
    const emptyMsg = document.getElementById("aar-cap-empty");
    if (container && emptyMsg) {
        const hasDropdowns = container.querySelectorAll(".cap-ship-wrapper").length > 0;
        if (!hasDropdowns) {
            emptyMsg.classList.remove("hidden");
        }
    }
}

/**
 * Initializes a CAP ship dropdown with event listeners
 *
 * @param {string} dropdownId - The base ID of the dropdown (without -select suffix)
 */
function initializeCAPDropdown(dropdownId) {
    const wrapper = document.getElementById(dropdownId + "-select");
    if (!wrapper) return;

    const trigger = wrapper.querySelector(".custom-select-trigger");
    const dropdown = wrapper.querySelector(".custom-select-dropdown");
    const searchInput = wrapper.querySelector(".cap-ship-search-input");
    const optionsContainer = wrapper.querySelector(".custom-select-options");
    const valueDisplay = document.getElementById(dropdownId + "-value");

    trigger.addEventListener("click", e => {
        e.stopPropagation();
        const isOpen = !dropdown.classList.contains("hidden");

        // Close all other dropdowns
        document.querySelectorAll(".custom-select-dropdown").forEach(dd => {
            if (dd !== dropdown) dd.classList.add("hidden");
        });

        dropdown.classList.toggle("hidden");
        trigger.classList.toggle("ring-1");
        trigger.classList.toggle("ring-primary-500");
        wrapper.querySelector(".custom-select-arrow").classList.toggle("rotate-180");

        if (!isOpen && searchInput) {
            searchInput.value = "";
            optionsContainer.querySelectorAll(".custom-select-option").forEach(opt => opt.classList.remove("hidden"));
            searchInput.focus();
        }
    });

    if (searchInput) {
        searchInput.addEventListener("input", e => {
            const searchTerm = e.target.value.toLowerCase();
            optionsContainer.querySelectorAll(".custom-select-option").forEach(option => {
                const text = option.textContent.toLowerCase();
                option.classList.toggle("hidden", !text.includes(searchTerm));
            });
        });
        searchInput.addEventListener("click", e => e.stopPropagation());
    }

    optionsContainer.addEventListener("click", e => {
        const option = e.target.closest(".custom-select-option");
        if (!option) return;

        const value = option.dataset.value;
        const previousValue = valueDisplay.textContent;
        valueDisplay.textContent = value;

        dropdown.classList.add("hidden");
        trigger.classList.remove("ring-1", "ring-primary-500");
        wrapper.querySelector(".custom-select-arrow").classList.remove("rotate-180");

        // If this was an empty dropdown and now has a value, add another empty one
        if (previousValue === "Select CAP ship..." && value !== "Select CAP ship...") {
            // Don't auto-add, user can click "+ Add CAP" if needed
        }
    });

    // Close dropdown when clicking outside
    document.addEventListener("click", e => {
        if (!wrapper.contains(e.target)) {
            dropdown.classList.add("hidden");
            trigger.classList.remove("ring-1", "ring-primary-500");
            wrapper.querySelector(".custom-select-arrow")?.classList.remove("rotate-180");
        }
    });
}

/**
 * Populates CAP dropdowns based on CAP ships in the Ship Assignment tab
 * Called when switching to AAR tab
 */
function populateCAPFromAssignments() {
    const container = document.getElementById("aar-cap-container");
    if (!container) return;

    // Clear existing CAP dropdowns
    container.querySelectorAll(".cap-ship-wrapper").forEach(wrapper => wrapper.remove());
    capDropdownCounter = 0;

    // Find CAP ships from assignments
    const capShips = ships.filter(s => s.type === "CAP" && s.ship && s.ship.trim() !== "");

    if (capShips.length === 0) {
        // Show "No CAP ships" message
        const emptyMsg = document.getElementById("aar-cap-empty");
        if (emptyMsg) emptyMsg.classList.remove("hidden");
    } else {
        // Add a dropdown for each CAP ship
        capShips.forEach(capShip => {
            addCAPShipDropdown(capShip.ship);
        });
    }
}

/**
 * Gets all selected CAP ships as an array
 *
 * @returns {Array<string>} Array of selected CAP ship names
 */
function getSelectedCAPShips() {
    const container = document.getElementById("aar-cap-container");
    if (!container) return [];

    const capShips = [];
    container.querySelectorAll(".cap-ship-wrapper").forEach(wrapper => {
        const valueEl = wrapper.querySelector(".custom-select-value");
        if (valueEl && valueEl.textContent !== "Select CAP ship...") {
            capShips.push(valueEl.textContent);
        }
    });
    return capShips;
}

/**
 * Clears all CAP ship dropdowns
 */
function clearCAPShips() {
    const container = document.getElementById("aar-cap-container");
    if (!container) return;

    container.querySelectorAll(".cap-ship-wrapper").forEach(wrapper => wrapper.remove());
    capDropdownCounter = 0;

    const emptyMsg = document.getElementById("aar-cap-empty");
    if (emptyMsg) emptyMsg.classList.remove("hidden");
}

// ============================================================================
// LOCATION DROPDOWN POPULATION FUNCTIONS
// ============================================================================

/**
 * Populates the AAR planet dropdown with all planetary bodies
 * Creates sections grouped by star system
 */
function populateAARPlanetDropdown() {
    const optionsContainer = document.getElementById("aar-planet-options");
    if (!optionsContainer) {
        console.warn("Planet options container not found");
        return;
    }

    if (PLANETARY_BODIES.length === 0) {
        optionsContainer.innerHTML = '<div class="px-3 py-2 text-sm text-gray-400">Loading locations...</div>';
        return;
    }

    let options = "";
    let currentSystem = "";

    PLANETARY_BODIES.forEach(body => {
        // Add system header if changed
        if (body.system !== currentSystem) {
            if (currentSystem !== "") {
                options += '<div class="border-t border-gray-600 my-1"></div>';
            }
            options += `<div class="px-3 py-2 text-xs font-semibold uppercase text-blue-300 bg-gray-800">${body.system} System</div>`;
            currentSystem = body.system;
        }

        const displayText = body.designation ? `${body.name} (${body.designation})` : body.name;
        options += `<div class="custom-select-option cursor-pointer px-3 py-2 text-sm text-gray-300 hover:bg-mrs-button hover:text-white" data-value="${body.name}">${displayText}</div>`;
    });

    // Add "Other" option at the end
    options += `<div class="custom-select-option cursor-pointer px-3 py-2 text-sm text-gray-300 hover:bg-mrs-button hover:text-white border-t border-gray-600 mt-1 pt-2" data-value="Other">Other (specify below)</div>`;

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
    const optionsContainer = document.getElementById("aar-poi-options");
    if (!optionsContainer) {
        console.warn("POI options container not found");
        return;
    }

    const pois = PLANETARY_BODY_TO_POIS[planetName];

    if (!pois || pois.length === 0) {
        optionsContainer.innerHTML = '<div class="px-3 py-2 text-sm text-gray-400">No POIs available for this location</div>';
        return;
    }

    let options = "";
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
    const optionsContainer = document.getElementById("aar-extracted-options");
    if (!optionsContainer || !LOCATIONS_DATABASE) return;

    let options = "";

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
    const wrapper = document.getElementById(selectId + "-select");
    if (!wrapper) return;

    const trigger = wrapper.querySelector(".custom-select-trigger");
    const dropdown = wrapper.querySelector(".custom-select-dropdown");
    const searchInput = wrapper.querySelector(".aar-ship-search-input");
    const optionsContainer = wrapper.querySelector(".custom-select-options");

    // Clear existing event listeners by cloning elements
    const newTrigger = trigger.cloneNode(true);
    const newDropdown = dropdown.cloneNode(true);

    trigger.parentNode.replaceChild(newTrigger, trigger);
    dropdown.parentNode.replaceChild(newDropdown, dropdown);

    // Re-query elements from the new nodes (including valueDisplay!)
    const arrow = newTrigger.querySelector(".custom-select-arrow");
    const newSearchInput = newDropdown.querySelector(".aar-ship-search-input");
    const newOptionsContainer = newDropdown.querySelector(".custom-select-options");
    const valueDisplay = document.getElementById(selectId + "-value"); // Re-query after cloning

    newTrigger.addEventListener("click", e => {
        e.stopPropagation();
        const isOpen = !newDropdown.classList.contains("hidden");

        document.querySelectorAll(".custom-select-dropdown").forEach(dd => {
            if (dd !== newDropdown) {
                dd.classList.add("hidden");
            }
        });

        newDropdown.classList.toggle("hidden");
        newTrigger.classList.toggle("ring-1");
        newTrigger.classList.toggle("ring-primary-500");
        arrow.classList.toggle("rotate-180");

        if (!isOpen) {
            newSearchInput.value = "";
            newOptionsContainer.querySelectorAll(".custom-select-option").forEach(opt => opt.classList.remove("hidden"));
            newSearchInput.focus();
        }
    });

    newSearchInput.addEventListener("input", e => {
        const searchTerm = e.target.value.toLowerCase();
        newOptionsContainer.querySelectorAll(".custom-select-option").forEach(option => {
            const text = option.textContent.toLowerCase();
            option.classList.toggle("hidden", !text.includes(searchTerm));
        });
    });

    newSearchInput.addEventListener("click", e => e.stopPropagation());

    newOptionsContainer.addEventListener("click", e => {
        const option = e.target.closest(".custom-select-option");
        if (!option) return;

        const value = option.dataset.value;
        valueDisplay.textContent = value;

        newDropdown.classList.add("hidden");
        newTrigger.classList.remove("ring-1", "ring-primary-500");
        arrow.classList.remove("rotate-180");
    });

    // Close dropdown when clicking outside
    document.addEventListener("click", e => {
        if (!wrapper.contains(e.target)) {
            newDropdown.classList.add("hidden");
            newTrigger.classList.remove("ring-1", "ring-primary-500");
            arrow.classList.remove("rotate-180");
        }
    });
}

/**
 * Initializes the "Client Extracted To" custom select component
 * Sets up click handlers, search functionality, and option selection
 */
function initializeExtractedToSelect() {
    const wrapper = document.getElementById("aar-extracted-select");
    if (!wrapper) return;

    const trigger = wrapper.querySelector(".custom-select-trigger");
    const dropdown = wrapper.querySelector(".custom-select-dropdown");
    const searchInput = wrapper.querySelector(".extracted-search-input");
    const optionsContainer = wrapper.querySelector(".custom-select-options");

    const newTrigger = trigger.cloneNode(true);
    const newDropdown = dropdown.cloneNode(true);

    trigger.parentNode.replaceChild(newTrigger, trigger);
    dropdown.parentNode.replaceChild(newDropdown, dropdown);

    const newArrow = newTrigger.querySelector(".custom-select-arrow");
    const newSearchInput = newDropdown.querySelector(".extracted-search-input");
    const newOptionsContainer = newDropdown.querySelector(".custom-select-options");
    const valueDisplay = document.getElementById("aar-extracted-value");

    newTrigger.addEventListener("click", e => {
        e.stopPropagation();
        const isOpen = !newDropdown.classList.contains("hidden");

        document.querySelectorAll(".custom-select-dropdown").forEach(dd => {
            if (dd !== newDropdown) dd.classList.add("hidden");
        });

        newDropdown.classList.toggle("hidden");
        newTrigger.classList.toggle("ring-1", "ring-primary-500");
        newArrow.classList.toggle("rotate-180");

        if (!isOpen) {
            newSearchInput.value = "";
            newOptionsContainer.querySelectorAll(".custom-select-option").forEach(opt => opt.classList.remove("hidden"));
            newSearchInput.focus();
        }
    });

    newSearchInput.addEventListener("input", e => {
        const searchTerm = e.target.value.toLowerCase();
        newOptionsContainer.querySelectorAll(".custom-select-option").forEach(option => {
            const text = option.textContent.toLowerCase();
            option.classList.toggle("hidden", !text.includes(searchTerm));
        });
    });

    newSearchInput.addEventListener("click", e => e.stopPropagation());

    newOptionsContainer.addEventListener("click", e => {
        const option = e.target.closest(".custom-select-option");
        if (!option) return;

        const value = option.dataset.value;
        valueDisplay.textContent = value;

        // Show/hide "Other" free-form input
        const extractedOther = document.getElementById("aar-extracted-other");
        if (extractedOther) {
            if (value === "Other") {
                extractedOther.classList.remove("hidden");
            } else {
                extractedOther.classList.add("hidden");
                extractedOther.value = "";
            }
        }

        newDropdown.classList.add("hidden");
        newTrigger.classList.remove("ring-1", "ring-primary-500");
        newArrow.classList.remove("rotate-180");
    });

    document.addEventListener("click", e => {
        if (!wrapper.contains(e.target)) {
            newDropdown.classList.add("hidden");
            newTrigger.classList.remove("ring-1", "ring-primary-500");
            newArrow.classList.remove("rotate-180");
        }
    });
}

/**
 * Initializes the AAR Location Type custom select component
 * Sets up click handlers, search functionality, and option selection
 */
function initializeAARLocationTypeSelect() {
    const wrapper = document.getElementById("aar-location-type-select");
    if (!wrapper) return;

    const trigger = wrapper.querySelector(".custom-select-trigger");
    const dropdown = wrapper.querySelector(".custom-select-dropdown");
    const searchInput = wrapper.querySelector(".location-type-search-input");
    const optionsContainer = wrapper.querySelector(".custom-select-options");

    // Remove old listeners by cloning and replacing
    const newTrigger = trigger.cloneNode(true);
    const newDropdown = dropdown.cloneNode(true);

    trigger.parentNode.replaceChild(newTrigger, trigger);
    dropdown.parentNode.replaceChild(newDropdown, dropdown);

    // Get fresh references
    const newArrow = newTrigger.querySelector(".custom-select-arrow");
    const newSearchInput = newDropdown.querySelector(".location-type-search-input");
    const newOptionsContainer = newDropdown.querySelector(".custom-select-options");
    const valueDisplay = document.getElementById("aar-location-type-value");

    newTrigger.addEventListener("click", e => {
        e.stopPropagation();
        const isOpen = !newDropdown.classList.contains("hidden");

        document.querySelectorAll(".custom-select-dropdown").forEach(dd => {
            if (dd !== newDropdown) dd.classList.add("hidden");
        });

        newDropdown.classList.toggle("hidden");
        newTrigger.classList.toggle("ring-1", "ring-primary-500");
        newArrow.classList.toggle("rotate-180");

        if (!isOpen) {
            newSearchInput.value = "";
            newOptionsContainer.querySelectorAll(".custom-select-option").forEach(opt => opt.classList.remove("hidden"));
            newSearchInput.focus();
        }
    });

    newSearchInput.addEventListener("input", e => {
        const searchTerm = e.target.value.toLowerCase();
        newOptionsContainer.querySelectorAll(".custom-select-option").forEach(option => {
            const text = option.textContent.toLowerCase();
            option.classList.toggle("hidden", !text.includes(searchTerm));
        });
    });

    newSearchInput.addEventListener("click", e => e.stopPropagation());

    newOptionsContainer.addEventListener("click", e => {
        const option = e.target.closest(".custom-select-option");
        if (!option) return;

        const value = option.dataset.value;
        valueDisplay.textContent = value;

        // Show/hide "Other" free-form input
        const locationTypeOther = document.getElementById("aar-location-type-other");
        if (locationTypeOther) {
            if (value === "Other") {
                locationTypeOther.classList.remove("hidden");
            } else {
                locationTypeOther.classList.add("hidden");
                locationTypeOther.value = "";
            }
        }

        newDropdown.classList.add("hidden");
        newTrigger.classList.remove("ring-1", "ring-primary-500");
        newArrow.classList.remove("rotate-180");
    });

    document.addEventListener("click", e => {
        if (!wrapper.contains(e.target)) {
            newDropdown.classList.add("hidden");
            newTrigger.classList.remove("ring-1", "ring-primary-500");
            newArrow.classList.remove("rotate-180");
        }
    });
}

/**
 * Initializes the AAR planet custom select component
 * Sets up click handlers, search functionality, and option selection
 * Also triggers POI dropdown population when a planet is selected
 */
function initializeAARPlanetSelect() {
    const wrapper = document.getElementById("aar-planet-select");
    if (!wrapper) return;

    const trigger = wrapper.querySelector(".custom-select-trigger");
    const dropdown = wrapper.querySelector(".custom-select-dropdown");
    const searchInput = wrapper.querySelector(".planet-search-input");
    const optionsContainer = wrapper.querySelector(".custom-select-options");

    // Remove old listeners by cloning and replacing
    const newTrigger = trigger.cloneNode(true);
    const newDropdown = dropdown.cloneNode(true);

    trigger.parentNode.replaceChild(newTrigger, trigger);
    dropdown.parentNode.replaceChild(newDropdown, dropdown);

    // Get fresh references (including valueDisplay!)
    const newArrow = newTrigger.querySelector(".custom-select-arrow");
    const newSearchInput = newDropdown.querySelector(".planet-search-input");
    const newOptionsContainer = newDropdown.querySelector(".custom-select-options");
    const valueDisplay = document.getElementById("aar-planet-value"); // Re-query after cloning

    newTrigger.addEventListener("click", e => {
        e.stopPropagation();
        const isOpen = !newDropdown.classList.contains("hidden");

        document.querySelectorAll(".custom-select-dropdown").forEach(dd => {
            if (dd !== newDropdown) dd.classList.add("hidden");
        });

        newDropdown.classList.toggle("hidden");
        newTrigger.classList.toggle("ring-1", "ring-primary-500");
        newArrow.classList.toggle("rotate-180");

        if (!isOpen) {
            newSearchInput.value = "";
            newOptionsContainer.querySelectorAll(".custom-select-option").forEach(opt => opt.classList.remove("hidden"));
            newSearchInput.focus();
        }
    });

    newSearchInput.addEventListener("input", e => {
        const searchTerm = e.target.value.toLowerCase();
        newOptionsContainer.querySelectorAll(".custom-select-option").forEach(option => {
            const text = option.textContent.toLowerCase();
            option.classList.toggle("hidden", !text.includes(searchTerm));
        });
    });

    newSearchInput.addEventListener("click", e => e.stopPropagation());

    newOptionsContainer.addEventListener("click", e => {
        const option = e.target.closest(".custom-select-option");
        if (!option) return;

        const value = option.dataset.value;
        valueDisplay.textContent = value;

        // Show/hide "Other" free-form input
        const planetOther = document.getElementById("aar-planet-other");
        if (planetOther) {
            if (value === "Other") {
                planetOther.classList.remove("hidden");
            } else {
                planetOther.classList.add("hidden");
                planetOther.value = "";
            }
        }

        // Populate POI dropdown for selected planet (skip if "Other")
        if (value !== "Other") {
            populateAARPOIDropdown(value);
        }

        // Reset POI selection
        document.getElementById("aar-poi-value").textContent = "Select POI...";

        newDropdown.classList.add("hidden");
        newTrigger.classList.remove("ring-1", "ring-primary-500");
        newArrow.classList.remove("rotate-180");
    });

    document.addEventListener("click", e => {
        if (!wrapper.contains(e.target)) {
            newDropdown.classList.add("hidden");
            newTrigger.classList.remove("ring-1", "ring-primary-500");
            newArrow.classList.remove("rotate-180");
        }
    });
}

/**
 * Initializes the AAR POI (Point of Interest) custom select component
 * Sets up click handlers, search functionality, and option selection
 */
function initializeAARPOISelect() {
    const wrapper = document.getElementById("aar-poi-select");
    if (!wrapper) return;

    const trigger = wrapper.querySelector(".custom-select-trigger");
    const dropdown = wrapper.querySelector(".custom-select-dropdown");
    const searchInput = wrapper.querySelector(".poi-search-input");
    const optionsContainer = wrapper.querySelector(".custom-select-options");

    // Remove old listeners by cloning and replacing
    const newTrigger = trigger.cloneNode(true);
    const newDropdown = dropdown.cloneNode(true);

    trigger.parentNode.replaceChild(newTrigger, trigger);
    dropdown.parentNode.replaceChild(newDropdown, dropdown);

    // Get fresh references (including valueDisplay!)
    const newArrow = newTrigger.querySelector(".custom-select-arrow");
    const newSearchInput = newDropdown.querySelector(".poi-search-input");
    const newOptionsContainer = newDropdown.querySelector(".custom-select-options");
    const valueDisplay = document.getElementById("aar-poi-value"); // Re-query after cloning

    newTrigger.addEventListener("click", e => {
        e.stopPropagation();
        const isOpen = !newDropdown.classList.contains("hidden");

        document.querySelectorAll(".custom-select-dropdown").forEach(dd => {
            if (dd !== newDropdown) dd.classList.add("hidden");
        });

        newDropdown.classList.toggle("hidden");
        newTrigger.classList.toggle("ring-1", "ring-primary-500");
        newArrow.classList.toggle("rotate-180");

        if (!isOpen) {
            newSearchInput.value = "";
            newOptionsContainer.querySelectorAll(".custom-select-option").forEach(opt => opt.classList.remove("hidden"));
            newSearchInput.focus();
        }
    });

    newSearchInput.addEventListener("input", e => {
        const searchTerm = e.target.value.toLowerCase();
        newOptionsContainer.querySelectorAll(".custom-select-option").forEach(option => {
            const text = option.textContent.toLowerCase();
            option.classList.toggle("hidden", !text.includes(searchTerm));
        });
    });

    newSearchInput.addEventListener("click", e => e.stopPropagation());

    newOptionsContainer.addEventListener("click", e => {
        const option = e.target.closest(".custom-select-option");
        if (!option) return;

        const value = option.dataset.value;
        valueDisplay.textContent = value;

        // Show/hide POI "Other" free-form input
        const poiOther = document.getElementById("aar-poi-other");
        if (poiOther) {
            if (value === "Other") {
                poiOther.classList.remove("hidden");
            } else {
                poiOther.classList.add("hidden");
                poiOther.value = "";
            }
        }

        newDropdown.classList.add("hidden");
        newTrigger.classList.remove("ring-1", "ring-primary-500");
        newArrow.classList.remove("rotate-180");
    });

    document.addEventListener("click", e => {
        if (!wrapper.contains(e.target)) {
            newDropdown.classList.add("hidden");
            newTrigger.classList.remove("ring-1", "ring-primary-500");
            newArrow.classList.remove("rotate-180");
        }
    });
}

// ============================================================================
// AAR GENERATION AND OUTPUT FUNCTIONS
// ============================================================================

/**
 * Generates the AAR preview text from all form inputs
 * Collects data from all AAR form fields and formats it into a structured report
 * Only includes fields that have values (skips empty fields)
 * Updates the preview element with the generated text
 */
function generateAARPreview() {
    let aar = "";

    // Helper function to add a line only if value is not empty
    const addLine = (label, value) => {
        if (value && value.trim() !== "") {
            return `${label}: ${value}\n`;
        }
        return "";
    };

    // Ships section
    const gunship = document.getElementById("aar-gunship-value").textContent;
    const gunshipValue = gunship !== "Select ship..." ? gunship : "";
    const medical = document.getElementById("aar-medical-value").textContent;
    // Treat "None" and "Select ship..." as empty (no separate medical ship)
    const medicalValue = medical !== "Select ship..." && medical !== "None" ? medical : "";
    const capShipsArray = getSelectedCAPShips();
    const capShipsText = capShipsArray.length > 0 ? capShipsArray.join(", ") : "";
    const additionalShips = document.getElementById("aar-additional-ships").value;
    const reason = document.getElementById("aar-reason").value;

    let shipsSection = "";
    shipsSection += addLine("Gunship", gunshipValue);
    shipsSection += addLine("Medical", medicalValue);
    if (capShipsArray.length > 0) {
        shipsSection += `CAP (${capShipsArray.length}): ${capShipsText}\n`;
    }
    shipsSection += addLine("Additional Ships", additionalShips);
    shipsSection += addLine("Reason", reason);

    if (shipsSection) {
        aar += "SHIPS USED\n\n" + shipsSection + "\n";
    }

    // Intersystem Response
    const intersystem = document.getElementById("aar-intersystem-toggle").checked;
    if (intersystem) {
        aar += "INTERSYSTEM RESPONSE\n\n";
    }

    // Location section
    let planet = document.getElementById("aar-planet-value").textContent;
    const planetOther = document.getElementById("aar-planet-other").value;
    let locationType = document.getElementById("aar-location-type-value").textContent;
    const locationTypeOther = document.getElementById("aar-location-type-other").value;
    let poi = document.getElementById("aar-poi-value").textContent;
    const poiOther = document.getElementById("aar-poi-other").value;

    // Use custom input if "Other" is selected
    if (planet === "Other" && planetOther) {
        planet = planetOther;
    } else if (planet === "Select planetary body...") {
        planet = "";
    }
    if ((locationType === "Other" || locationType === "Other (specify below)") && locationTypeOther) {
        locationType = locationTypeOther;
    } else if (locationType === "Select type...") {
        locationType = "";
    }
    if ((poi === "Other" || poi === "Other (specify below)") && poiOther) {
        poi = poiOther;
    } else if (poi === "Select POI...") {
        poi = "";
    }

    let locationSection = "";
    locationSection += addLine("Planetary Body", planet);
    locationSection += addLine("Location Type", locationType);
    locationSection += addLine("Specific POI", poi);

    if (locationSection) {
        aar += "LOCATION\n\n" + locationSection + "\n";
    }

    // Timestamps section
    const alert = document.getElementById("aar-alert").value;
    const depart = document.getElementById("aar-depart").value;
    const client = document.getElementById("aar-client").value;
    const rtb = document.getElementById("aar-rtb").value;

    // Only include timestamps if at least one has a meaningful value
    const hasTimestamps = (alert && alert !== "00") || depart || client || rtb;
    if (hasTimestamps) {
        aar += "TIMESTAMPS\n\n";
        aar += `Alert:${alert || "00"} | Depart:${depart} | Client:${client} | RTB:${rtb}\n\n`;
    }

    // Encounters section
    const pve = document.getElementById("aar-pve").value;
    const pvp = document.getElementById("aar-pvp").value;
    const actions = document.getElementById("aar-actions").value;

    let encountersSection = "";
    encountersSection += addLine("PVE", pve);
    encountersSection += addLine("PVP", pvp);
    encountersSection += addLine("Actions Taken", actions);

    if (encountersSection) {
        aar += "ENCOUNTERS\n\n" + encountersSection + "\n";
    }

    // Issues section
    const issueCheckboxes = document.querySelectorAll(".aar-issue-checkbox:checked");
    const issues = Array.from(issueCheckboxes)
        .map(cb => cb.value)
        .join(", ");
    const otherIssues = document.getElementById("aar-other-issues").value;
    const fix = document.getElementById("aar-fix").value;

    const allProblems = issues + (otherIssues ? (issues ? ", " : "") + otherIssues : "");

    let issuesSection = "";
    issuesSection += addLine("Problems", allProblems);
    issuesSection += addLine("Brief Fix", fix);

    if (issuesSection) {
        aar += "ISSUES\n\n" + issuesSection + "\n";
    }

    // Summary section
    const summary = document.getElementById("aar-summary").value;
    if (summary && summary.trim() !== "") {
        aar += "SUMMARY\n\n" + summary + "\n\n";
    }

    // Result section
    const outcome = document.getElementById("aar-outcome").value;
    let extractedTo = document.getElementById("aar-extracted-value").textContent;
    const extractedOther = document.getElementById("aar-extracted-other").value;
    let challenges = document.getElementById("aar-challenges").value;
    const challengesOther = document.getElementById("aar-challenges-other").value;
    const failure = document.getElementById("aar-failure").value;

    // Use custom input if "Other" is selected
    if (extractedTo === "Other" && extractedOther) {
        extractedTo = extractedOther;
    } else if (extractedTo === "Select...") {
        extractedTo = "";
    }

    // Use custom input for challenges if "Other" is selected
    if (challenges === "Other" && challengesOther) {
        challenges = challengesOther;
    }

    let resultSection = "";
    resultSection += addLine("Mission Outcome", outcome);
    // Only show "Client Extracted To" if outcome is Success and has value
    if (outcome === "Success" && extractedTo) {
        resultSection += addLine("Client Extracted To", extractedTo);
    }
    resultSection += addLine("Challenges", challenges);
    resultSection += addLine("Failure/Abort Reason", failure);

    if (resultSection) {
        aar += "RESULT\n\n" + resultSection + "\n";
    }

    // Notes section
    const notes = document.getElementById("aar-notes").value;
    if (notes && notes.trim() !== "") {
        aar += "NOTES:\n\n" + notes;
    }

    // Update preview (show placeholder if empty)
    document.getElementById("aar-preview").textContent = aar || "Fill in the form fields to generate your AAR...";
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
    const output = document.getElementById("aar-preview").textContent;

    if (!navigator.clipboard) {
        try {
            const textArea = document.createElement("textarea");
            textArea.value = output;
            textArea.style.position = "fixed";
            textArea.style.top = "0";
            textArea.style.left = "0";
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            document.execCommand("copy");
            document.body.removeChild(textArea);
            showAARSuccessMessage();
        } catch (err) {
            console.error("Fallback: Oops, unable to copy", err);
            alert("Failed to copy to clipboard. Please try again.");
        }
        return;
    }

    navigator.clipboard
        .writeText(output)
        .then(() => {
            showAARSuccessMessage();
        })
        .catch(err => {
            alert("Failed to copy to clipboard. Please try again.");
            console.error("Failed to copy:", err);
        });
}

/**
 * Shows a success message after copying AAR to clipboard
 * Message automatically hides after 3 seconds
 */
function showAARSuccessMessage() {
    const successMessage = document.getElementById("aar-successMessage");
    successMessage.classList.remove("hidden");
    setTimeout(() => {
        successMessage.classList.add("hidden");
    }, 3000);
}

/**
 * Clears all AAR form fields and resets to default state
 * Resets all dropdowns, inputs, checkboxes, and preview text
 */
function clearAAR() {
    // Reset all select values
    document.getElementById("aar-gunship-value").textContent = "Select ship...";
    document.getElementById("aar-medical-value").textContent = "Select ship...";
    document.getElementById("aar-planet-value").textContent = "Select planetary body...";
    document.getElementById("aar-poi-value").textContent = "Select POI...";
    document.getElementById("aar-extracted-value").textContent = "Select...";
    document.getElementById("aar-location-type-value").textContent = "Select type...";

    // Reset CAP dropdowns
    clearCAPShips();

    // Reset all inputs
    document.getElementById("aar-additional-ships").value = "";
    document.getElementById("aar-reason").value = "";
    document.getElementById("aar-planet-other").value = "";
    document.getElementById("aar-location-type-other").value = "";
    document.getElementById("aar-poi-other").value = "";
    document.getElementById("aar-extracted-other").value = "";
    document.getElementById("aar-alert").value = "00";
    document.getElementById("aar-depart").value = "";
    document.getElementById("aar-client").value = "";
    document.getElementById("aar-rtb").value = "";
    document.getElementById("aar-pve").value = "";
    document.getElementById("aar-pvp").value = "";
    document.getElementById("aar-actions").value = "";
    document.getElementById("aar-other-issues").value = "";
    document.getElementById("aar-fix").value = "";
    document.getElementById("aar-summary").value = "";
    document.getElementById("aar-outcome").value = "";
    document.getElementById("aar-challenges").value = "";
    document.getElementById("aar-challenges-other").value = "";
    document.getElementById("aar-failure").value = "";
    document.getElementById("aar-notes").value = "";

    // Hide all "Other" free-form inputs
    document.getElementById("aar-planet-other").classList.add("hidden");
    document.getElementById("aar-location-type-other").classList.add("hidden");
    document.getElementById("aar-poi-other").classList.add("hidden");
    document.getElementById("aar-extracted-other").classList.add("hidden");
    document.getElementById("aar-challenges-other").classList.add("hidden");

    // Hide extracted container (only shown when outcome is Success)
    document.getElementById("aar-extracted-container").classList.add("hidden");

    // Uncheck all checkboxes
    document.getElementById("aar-intersystem-toggle").checked = false;
    document.querySelectorAll(".aar-issue-checkbox").forEach(cb => (cb.checked = false));

    // Reset preview
    document.getElementById("aar-preview").textContent = "Generate AAR to see preview...";
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
