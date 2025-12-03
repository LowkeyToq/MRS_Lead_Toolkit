/**
 * Constants and configuration for Medrunner Operations Tool
 */

// Emoji definitions for Discord formatting
const EMOJIS = {
    header: "<:Medrunner:1054921406091112558>",
    shipTypes: {
        Gunship: "<:MDRgun:1104388682116518018>",
        Medship: "<:MDRhug:1127961815977046130>",
        CAP: "<:MDRknife:1104388679641874522>"
    },
    roles: {
        PIL: "<:MRS_Pilot:984839934273806356>",
        LEAD: "<:MRS_Teamlead:1073627559272652820>",
        MED: "<:MRS_Medical:984839920755568680>",
        SEC: "<:MRS_Security:984839927604871218>",
        CAP: "<:CAP:1355255191854645407>"
    },
    positions: {
        1: "<:P1:1432823559364935852>",
        2: "<:P2:1432823555698982973>",
        3: "<:P3:1432823553186861109>",
        4: "<:P4:1432823550997299330>",
        5: "<:P5:1432823547902034010>",
        6: "<:P6:1432823545746161734>",
        7: "<:P7:1432823543518724157>",
        8: "<:P8:1432823540733837342>",
        9: "<:P9:1432823537915396280>"
    }
};

// Star Citizen flyable ships list - will be populated from API
let SHIPS = [];

// Fallback ship list in case API fails
const FALLBACK_SHIPS = [
    "Aegis Avenger Titan",
    "Aegis Gladius",
    "Aegis Sabre",
    "Aegis Vanguard Warden",
    "Aegis Hammerhead",
    "Aegis Redeemer",
    "Anvil Arrow",
    "Anvil Carrack",
    "Anvil Paladin",
    "Drake Cutlass Black",
    "Drake Cutlass Red",
    "MISC Freelancer",
    "RSI Apollo Medivac",
    "RSI Apollo Triage",
    "RSI Constellation Andromeda"
].sort();
