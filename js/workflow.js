/**
 * Workflow Module
 *
 * Handles the alert workflow modal including:
 * - Modal display
 * - Step navigation
 * - Text copying to clipboard
 * - Copy notifications
 * - Timer synchronization
 *
 * @module workflow
 */

/**
 * Timer update interval
 * @type {number|null}
 */
let workflowTimerInterval = null;

/**
 * Update workflow timer display
 */
function updateWorkflowTimerDisplay() {
    const timerDisplay = document.getElementById('workflow-timer-display');
    const mainTimerDisplay = document.getElementById('alert-timer-display');
    
    if (timerDisplay && mainTimerDisplay) {
        // Sync the workflow modal timer with the main timer
        timerDisplay.textContent = mainTimerDisplay.textContent;
    }
}

/**
 * Start workflow timer sync
 */
function startWorkflowTimerSync() {
    // Clear existing interval
    if (workflowTimerInterval) {
        clearInterval(workflowTimerInterval);
    }
    
    // Update every 100ms for smooth sync
    workflowTimerInterval = setInterval(updateWorkflowTimerDisplay, 100);
}

/**
 * Stop workflow timer sync
 */
function stopWorkflowTimerSync() {
    if (workflowTimerInterval) {
        clearInterval(workflowTimerInterval);
        workflowTimerInterval = null;
    }
}

/**
 * Open the workflow modal
 */
function openWorkflowModal() {
    const modal = document.getElementById('workflow-modal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        // Reset to step 1
        showWorkflowStep(1);
        // Start syncing the timer
        startWorkflowTimerSync();
    }
}

/**
 * Close the workflow modal
 */
function closeWorkflowModal() {
    const modal = document.getElementById('workflow-modal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
        // Stop syncing the timer
        stopWorkflowTimerSync();
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
