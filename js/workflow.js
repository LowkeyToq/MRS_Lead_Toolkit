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
    minimized: false
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
        updateWorkflowMinimizedStepLabel(workflowState.currentStep);
    }
}

/**
 * Show a specific workflow step
 * @param {number} stepNumber - The step number to show (1, 2, 3, etc.)
 */
function showWorkflowStep(stepNumber) {
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
 * Copy workflow text to clipboard
 * @param {string} action - The action identifier
 */
function copyWorkflowText(action) {
    let textToCopy = '';
    const timestamp = Math.floor(Date.now() / 1000);
    
    switch (action) {
        case 'set-channel-status':
            textToCopy = `<a:AlertBlue:1064652389711360043><a:AlertRed:985293780288700476><:AA1:1182246601557823520><:AA2:1182246604401561610><:AA3:1182246605718556682><:AA4:1182246607228514304><:AA5:1182246610189692938><:AA6:1182246613150859304><:AA7:1182246614665019393><:AA8:1182246617559072838><a:AlertRed:985293780288700476><a:AlertBlue:1064652389711360043><t:${timestamp}:R>`;
            break;
            
        case 'no-questionform':
            textToCopy = 'Hello! Once the questions have been answered we can proceed.';
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
    
    // Hide after 5 seconds
    setTimeout(() => {
        notification.classList.add('hidden');
    }, 5000);
}
