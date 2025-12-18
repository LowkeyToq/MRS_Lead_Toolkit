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
            const leadName = getLeadName() || 'Zeek';
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
        
        case 'chat-no-response-warning':
            textToCopy = 'Just as fair warning, if we haven\'t heard from you within the next 5 minutes, we will hope all is well and close this alert.';
            break;
            
        case 'without-dispatch':
            const leadName = getLeadName() || 'Zeek';
            textToCopy = `Thank you for choosing Medrunner Services! My name is ${leadName}, and I'll be leading the team dispatched to your location. I will be sending you a friend request and/or party invite. (To accept the invite, make sure you're in first-person view and spam the key to the right of P — typically the [ key, though it may vary depending on your keyboard layout.) Please confirm here when you are ready to receive the invites!`;
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
