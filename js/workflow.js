/**
 * Workflow Module
 *
 * Handles the alert workflow modal including:
 * - Modal display
 * - Step navigation
 * - Text copying to clipboard
 * - Copy notifications
 *
 * @module workflow
 */

const WORKFLOW_DEFAULT_STEP = 1;
const workflowState = {
    currentStep: WORKFLOW_DEFAULT_STEP,
    minimized: false,
    history: [] // Stack für Navigation history
};

/**
 * Open the workflow modal
 */
function openWorkflowModal(options = {}) {
    const modal = document.getElementById('workflow-modal');
    if (!modal) return;

    const { resetStep = true } = options;

    modal.classList.remove('hidden');
    modal.classList.add('flex');

    workflowState.minimized = false;
    hideWorkflowMinimizedBar();

    const targetStep = resetStep ? WORKFLOW_DEFAULT_STEP : (workflowState.currentStep || WORKFLOW_DEFAULT_STEP);
    showWorkflowStep(targetStep);
}

/**
 * Close the workflow modal
 */
function closeWorkflowModal({ resetState = true } = {}) {
    const modal = document.getElementById('workflow-modal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }

    hideWorkflowMinimizedBar();

    if (resetState) {
        workflowState.currentStep = WORKFLOW_DEFAULT_STEP;
        workflowState.minimized = false;
        workflowState.history = []; // Clear history when closing
        updateWorkflowMinimizedStepLabel(workflowState.currentStep);
    }
}

/**
 * Show a specific workflow step
 * @param {number} stepNumber - The step number to show (1, 2, 3, etc.)
 */
function showWorkflowStep(stepNumber) {
    // Add current step to history before moving to new step
    if (stepNumber !== workflowState.currentStep) {
        workflowState.history.push(workflowState.currentStep);
    }
    
    // Hide all steps
    document.querySelectorAll('.workflow-step').forEach(step => {
        step.classList.add('hidden');
    });
    
    // Show the requested step
    const step = document.getElementById(`workflow-step-${stepNumber}`);
    if (step) {
        step.classList.remove('hidden');
        workflowState.currentStep = stepNumber;
        updateWorkflowMinimizedStepLabel(stepNumber);
        
        // Load saved data for specific steps
        if (stepNumber === 17) {
            loadNearestStation();
        }
    }
}

/**
 * Minimize the workflow modal
 */
function minimizeWorkflowModal() {
    const modal = document.getElementById('workflow-modal');
    const minimized = document.getElementById('workflow-minimized');
    if (!modal || !minimized) return;

    workflowState.minimized = true;
    modal.classList.add('hidden');
    modal.classList.remove('flex');

    minimized.classList.remove('hidden');
    minimized.classList.add('flex');
}

/**
 * Restore the workflow modal from minimized state
 */
function restoreWorkflowModal() {
    const minimized = document.getElementById('workflow-minimized');
    if (minimized) {
        minimized.classList.add('hidden');
        minimized.classList.remove('flex');
    }

    openWorkflowModal({ resetStep: false });
}

/**
 * Hide the minimized bar if present
 */
function hideWorkflowMinimizedBar() {
    const minimized = document.getElementById('workflow-minimized');
    if (minimized) {
        minimized.classList.add('hidden');
        minimized.classList.remove('flex');
    }
}

/**
 * Update minimized bar label with current step
 */
function updateWorkflowMinimizedStepLabel(stepNumber) {
    const stepLabel = document.getElementById('workflow-minimized-step');
    if (stepLabel) {
        stepLabel.textContent = `Current step: ${stepNumber}`;
    }
}

/**
 * Go back to the previous workflow step in history
 */
function goWorkflowBack() {
    if (workflowState.history.length > 0) {
        const previousStep = workflowState.history.pop();
        
        // Hide all steps
        document.querySelectorAll('.workflow-step').forEach(step => {
            step.classList.add('hidden');
        });
        
        // Show the previous step
        const step = document.getElementById(`workflow-step-${previousStep}`);
        if (step) {
            step.classList.remove('hidden');
            workflowState.currentStep = previousStep;
            updateWorkflowMinimizedStepLabel(previousStep);
        }
    }
}

/**
 * Handle stand down action: copy message, reset timer, and close workflow.
 */
function handleStandDownAction() {
    copyWorkflowText('chat-stand-down');

    if (typeof resetAlertTimer === 'function') {
        resetAlertTimer(true);
    }

    closeWorkflowModal();
}

/**
 * Handle stand down with confirmation: show confirm dialog, then copy, reset timer and close modal
 */
function handleStandDownWithConfirm() {
    if (confirm('Are you sure you want to stand down from this alert?')) {
        copyWorkflowText('chat-stand-down');
        
        if (typeof resetAlertTimer === 'function') {
            resetAlertTimer(true);
        }
        
        closeWorkflowModal();
    }
}

/**
 * Handle service denial: copy message, show confirm dialog, then close modal and reset timer
 */
function handleServiceDenial() {
    if (confirm('Are you sure you want to send a service denial?')) {
        copyWorkflowText('service-denial');
        
        if (typeof resetAlertTimer === 'function') {
            resetAlertTimer(true);
        }
        
        setTimeout(() => {
            closeWorkflowModal();
        }, 100);
    }
}

/**
 * Handle stand down from Step 8: copy message, show confirm dialog, then reset timer and close modal
 */
function handleStandDownFromStep8() {
    if (confirm('Are you sure you want to stand down from this alert?')) {
        copyWorkflowText('chat-stand-down');
        
        if (typeof resetAlertTimer === 'function') {
            resetAlertTimer(true);
        }
        
        setTimeout(() => {
            closeWorkflowModal();
        }, 100);
    }
}

/**
 * Handle left station: copy message, advance timer to "Left Station", navigate to Step 14
 */
function handleLeftStation() {
    copyWorkflowText('chat-left-station');
    
    // Advance alert timer to "Left Station" stage
    if (typeof advanceAlertTimer === 'function') {
        advanceAlertTimer();
    }
    
    setTimeout(() => {
        showWorkflowStep(14);
    }, 100);
}

/**
 * Handle mission failure: copy message, show confirm dialog, mark as failure and reset timer
 */
function handleMissionFailure() {
    if (confirm('Are you sure you want to end this mission as a failure?')) {
        copyWorkflowText('chat-failure-feedback');
        
        if (typeof resetAlertTimer === 'function') {
            resetAlertTimer(true);
        }
        
        setTimeout(() => {
            closeWorkflowModal();
        }, 100);
    }
}

/**
 * Handle arrive at client: advance timer to "Arrived at Client", navigate to Step 16
 */
function handleArriveAtClient() {
    // Advance alert timer to "Arrived at Client" stage
    if (typeof advanceAlertTimer === 'function') {
        advanceAlertTimer();
    }
    
    setTimeout(() => {
        showWorkflowStep(16);
    }, 100);
}

/**
 * Save the nearest station name to localStorage
 */
function saveNearestStation() {
    const input = document.getElementById('workflow-nearest-station');
    if (input && input.value.trim()) {
        localStorage.setItem('mrs_workflow_nearest_station', input.value.trim());
    }
}

/**
 * Load the nearest station name from localStorage
 */
function loadNearestStation() {
    const input = document.getElementById('workflow-nearest-station');
    const savedStation = localStorage.getItem('mrs_workflow_nearest_station');
    if (input && savedStation) {
        input.value = savedStation;
    }
}

/**
 * Handle extraction to nearest station: copy message and navigate to Step 18
 */
function handleExtractionToStation() {
    copyWorkflowText('chat-extraction-nearest-station');
    
    setTimeout(() => {
        showWorkflowStep(18);
    }, 100);
}

/**
 * Handle mission end: copy feedback message, show confirmation, advance timer to RTB, copy RTB status, and open AAR tab
 */
function handleMissionEnd() {
    // First copy the end and feedback message
    copyWorkflowText('chat-end-feedback');
    
    // Show confirmation dialog after a short delay to allow the copy notification to appear
    setTimeout(() => {
        if (confirm('Are you sure you wanna end the Mission? Please sent the End and Feedback text first to the Client before you confirm')) {
            // Advance alert timer to RTB
            if (typeof advanceAlertTimer === 'function') {
                advanceAlertTimer();
            }
            
            // Copy RTB channel status
            setTimeout(() => {
                copyWorkflowText('channel-rtb-status');
                
                // Open AAR tab and close workflow modal
                setTimeout(() => {
                    if (typeof switchTab === 'function') {
                        switchTab('aar');
                    }
                    closeWorkflowModal();
                }, 500);
            }, 100);
        }
    }, 500);
}

/**
 * Copy workflow text to clipboard
 * @param {string} action - The action identifier
 */
function copyWorkflowText(action) {
    let textToCopy = '';
    const timestamp = Math.floor(Date.now() / 1000);
    
    switch (action) {
        case 'channel-set-status-alarm':
            textToCopy = `<:AA1:1182246601557823520><:AA2:1182246604401561610><:AA3:1182246605718556682><:AA4:1182246607228514304><:AA5:1182246610189692938><:AA6:1182246613150859304><:AA7:1182246614665019393><:AA8:1182246617559072838><t:${timestamp}:R>`;
            break;
            
        case 'set-channel-status':
            textToCopy = `<a:AlertBlue:1064652389711360043><a:AlertRed:985293780288700476><:AA1:1182246601557823520><:AA2:1182246604401561610><:AA3:1182246605718556682><:AA4:1182246607228514304><:AA5:1182246610189692938><:AA6:1182246613150859304><:AA7:1182246614665019393><:AA8:1182246617559072838><a:AlertRed:985293780288700476><a:AlertBlue:1064652389711360043><t:${timestamp}:R>`;
            break;
            
        case 'no-questionform':
            textToCopy = 'Hello! Once the questions have been answered we can proceed.';
            break;
        
        case 'chat-please-submit-questions':
            textToCopy = 'Hello. Could you please complete the questionnaire and press submit.';
            break;
        
        case 'chat-no-response-5min':
            textToCopy = 'If we do not hear from you within 5 minutes, we will assume all is well and close this alert.';
            break;
        
        case 'chat-no-team-available':
            textToCopy = "Thank you for choosing Medrunner Services! We've received your alert — no need to worry. All active teams are currently deployed, but one will be assigned to you shortly.!";
            break;
        
        case 'service-denial':
            textToCopy = `Greetings. We regret to inform you that we are currently unable to respond to your emergency for one or more of the following reasons:\n• All MEDRUNNER personnel are currently occupied or unavailable.\n• Ongoing technical difficulties affect personnel or game functionality.\n• Active teams are engaged in priority-level operations and cannot be diverted.\n• Your current location falls outside our operational parameters.\nWe understand this may be frustrating and sincerely apologize for any inconvenience. We encourage you to reach out again in the future, and we will make every effort to assist you as soon as possible.`;
            break;
        
        case 'chat-greetings':
            let leadName = getLeadName() || 'Zeek';
            textToCopy = `Thank you for choosing Medrunner Services! My name is ${leadName}, and I'll be leading the team dispatched to your location. I will be sending you a friend request and/or party invite. (To accept the invite, make sure you're in first-person view and spam the key to the right of P — typically the [ key, though it may vary depending on your keyboard layout.) Please confirm here when you are ready to receive the invites!\n\nCould you please tell me if you need a Med Bed and if you need Extraction to the NEAREST Station.\nPlease let me know anytime during this operation if anything changes (for example your medical condition or dangers)`;
            break;
        
        case 'chat-friend-request':
            textToCopy = 'Friend Request sent, please spam the accept key!';
            break;
        
        case 'chat-party-invite':
            textToCopy = 'Party Invite sent, please spam the accept key!';
            break;
        
        case 'chat-check-key-binding':
            textToCopy = 'Hmm it was not accepted, is your default accept key the key on the right of P?';
            break;
        
        case 'chat-bugged-spectrum':
            textToCopy = 'The Friend Request has bugged, this is a known problem. Please can you navigate to https://robertsspaceindustries.com/spectrum to accept the Friend Request.\n\nPlease confirm here once you have accepted it.';
            break;
        
        case 'chat-joining-server':
            textToCopy = 'Perfect! Our Team is joining your Server now. I will notify you when we are shortly arriving.';
            break;
        
        case 'chat-server-full':
            textToCopy = 'Our Team is joining your Server now. I will notify you when we are shortly arriving.\n Do note your server is full, there may be a short delay. I apologize for this in advance.';
            break;
        
        case 'chat-left-station':
            textToCopy = 'Depending on the situation, we may not pick you up immediately. Please be patient while we secure the area. We will reach you soon. Switching over to in-game party chat now. Note: If you are downed, it will be harder to read until you are revived.';
            break;
        
        case 'chat-failure-feedback':
            textToCopy = 'As we conclude our service, we\'d like to sincerely thank you for trusting us. We\'re sorry that we were unable to rescue you this time. Your health and satisfaction are our top priorities, and we hope that we will be able to assist you in the future if needed. If you have a moment, we\'d greatly appreciate it if you could leave a rating and comment on the alert card to let us know how we handled your case today!';
            break;
        
        case 'chat-closing-in':
            textToCopy = 'Our Team is close to you location. We will arrive soon.';
            break;
        
        case 'chat-extraction-nearest-station':
            const nearestStationInput = document.getElementById('workflow-nearest-station');
            const nearestStation = nearestStationInput?.value.trim() || 'nearest Station';
            textToCopy = `We will bring you safely to ${nearestStation}. Please stay close to our team and do not go anywhere else, because it may pose a risk to your safety. The Team will bring you in the ship and will show you where to sit or lay down during the flight. Please do not leave this place during the flight or open your Mobiglass unless the team tells you to do so.\nWe will let you know when we arrive.`;
            break;
        
        case 'chat-arrived-station':
            textToCopy = 'We arrived at the Station, you are good to go now. Please leave the ship.';
            break;
        
        case 'chat-end-feedback':
            textToCopy = 'As we conclude our service, we\'d like to sincerely thank you for trusting us. We hope today\'s response was prompt, professional, and met your expectations. Your health and satisfaction are our top priorities, and we hope to assist you again in the future if needed.\n\n If you have a moment, we\'d greatly appreciate it if you could leave a rating and comment on the alert card to let us know how we did today!';
            break;
        
        case 'channel-rtb-status':
            const rtbTimestamp = Math.floor(Date.now() / 1000);
            textToCopy = `<:RTB1:1182246669564256296><:RTB2:1182246670717689867><:RTB3:1182246674383507476><:RTB4:1182246677101412392><:RTB5:1182246678397464596><:RTB6:1182246679680929803><:RTB7:1182246686177894430><:RTB8:1182246689336213575><t:${rtbTimestamp}:R>`;
            break;
        
        case 'chat-no-response-warning':
            textToCopy = 'Just as fair warning, if we haven\'t heard from you within the next 5 minutes, we will hope all is well and close this alert.';
            break;
            
        case 'without-dispatch':
            let leadNameDispatch = getLeadName() || 'Zeek';
            textToCopy = `Thank you for choosing Medrunner Services! My name is ${leadNameDispatch}, and I'll be leading the team dispatched to your location. I will be sending you a friend request and/or party invite. (To accept the invite, make sure you're in first-person view and spam the key to the right of P — typically the [ key, though it may vary depending on your keyboard layout.) Please confirm here when you are ready to receive the invites!`;
            break;
            
        case 'client-no-react':
            textToCopy = 'Please let me know when you are ready to receive the invites!';
            break;
            
        case 'client-yes-react':
            textToCopy = 'Great! Sending invites now...';
            break;

        case 'chat-warning':
            textToCopy = "Just as fair warning, if we haven't heard from you within the next 5 minutes, we will hope all is well and close this alert.";
            break;

        case 'chat-stand-down':
            textToCopy = "Standing down due to no contact. You're welcome to resubmit, but please know that you will need to be ready to accept friend and party invites and answer the questions in order for us to respond.";
            break;

        case 'check-key-binding':
            textToCopy = 'Hmm it was not accepted, is your default accept key the Left Bracket [ ?';
            break;

        case 'bugged-friend-request':
            textToCopy = 'The Friend Request has bugged, this is a known problem. Please can you navigate to https://robertsspaceindustries.com/spectrum to accept the Friend Request.\n\nPlease confirm here once you have accepted it.';
            break;
            
        default:
            console.warn('Unknown workflow action:', action);
            return;
    }
    
    // Copy to clipboard
    navigator.clipboard.writeText(textToCopy).then(() => {
        console.log('Workflow text copied:', action);
        showCopyNotification('Copied to clipboard!');
    }).catch(err => {
        console.error('Failed to copy workflow text:', err);
        showCopyNotification('Failed to copy!', true);
    });
}

/**
 * Show copy notification
 * @param {string} message - The message to display
 * @param {boolean} isError - Whether this is an error notification
 */
function showCopyNotification(message, isError = false) {
    const notification = document.getElementById('copy-notification');
    const notificationText = document.getElementById('copy-notification-text');
    
    if (!notification || !notificationText) return;
    
    // Set message
    notificationText.textContent = message;
    
    // Set color
    if (isError) {
        notification.classList.remove('bg-green-600');
        notification.classList.add('bg-red-600');
    } else {
        notification.classList.remove('bg-red-600');
        notification.classList.add('bg-green-600');
    }
    
    // Show notification
    notification.classList.remove('hidden');
    
    // Hide after 10 seconds
    setTimeout(() => {
        notification.classList.add('hidden');
    }, 10000);
}
