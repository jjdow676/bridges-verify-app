/**
 * Bridges Verify - Work Verification App
 * Handles both participant and employer verification flows
 */

// Configuration
const CONFIG = {
    // Update this to your Salesforce Site URL
    apiUrl: 'https://bridgestowork.my.site.com/forms/services/apexrest/verify'
};

// App State
const state = {
    token: null,
    requestType: null,
    verificationLevel: null,
    requestId: null,
    jobPlacement: null,
    selectedFile: null,
    fileData: null
};

// DOM Elements
const elements = {
    loadingScreen: document.getElementById('loading-screen'),
    errorScreen: document.getElementById('error-screen'),
    participantScreen: document.getElementById('participant-screen'),
    employerScreen: document.getElementById('employer-screen'),
    successScreen: document.getElementById('success-screen'),
    errorTitle: document.getElementById('error-title'),
    errorMessage: document.getElementById('error-message'),
    // Participant elements
    pEmployer: document.getElementById('p-employer'),
    pJobTitle: document.getElementById('p-job-title'),
    pMilestone: document.getElementById('p-milestone'),
    participantForm: document.getElementById('participant-form'),
    verificationType: document.getElementById('verification-type'),
    lastWorkDate: document.getElementById('last-work-date'),
    fileUploadArea: document.getElementById('file-upload-area'),
    fileInput: document.getElementById('file-input'),
    uploadPlaceholder: document.getElementById('upload-placeholder'),
    filePreview: document.getElementById('file-preview'),
    previewImage: document.getElementById('preview-image'),
    fileName: document.getElementById('file-name'),
    removeFile: document.getElementById('remove-file'),
    participantSubmit: document.getElementById('participant-submit'),
    // Employer elements
    eParticipantName: document.getElementById('e-participant-name'),
    eJobTitle: document.getElementById('e-job-title'),
    eMilestone: document.getElementById('e-milestone'),
    employerForm: document.getElementById('employer-form'),
    eLastWorkDate: document.getElementById('e-last-work-date'),
    eComments: document.getElementById('e-comments'),
    employerSubmit: document.getElementById('employer-submit')
};

// Initialize app
document.addEventListener('DOMContentLoaded', init);

async function init() {
    // Extract token from URL
    const path = window.location.pathname;
    const parts = path.split('/').filter(p => p);

    // Expected format: /p/{token} or /e/{token}
    if (parts.length >= 2) {
        const type = parts[0];
        state.token = parts[1];

        if (type === 'p') {
            state.requestType = 'Participant';
        } else if (type === 'e') {
            state.requestType = 'Employer';
        }
    }

    // Also check query string for token (fallback)
    if (!state.token) {
        const params = new URLSearchParams(window.location.search);
        state.token = params.get('token');
        state.requestType = params.get('type');
    }

    if (!state.token) {
        showError('Invalid Link', 'No verification token found in the URL.');
        return;
    }

    // Set up event listeners
    setupEventListeners();

    // Fetch verification details
    await loadVerificationDetails();
}

function setupEventListeners() {
    // File upload
    elements.fileUploadArea.addEventListener('click', () => elements.fileInput.click());
    elements.fileInput.addEventListener('change', handleFileSelect);
    elements.removeFile.addEventListener('click', (e) => {
        e.stopPropagation();
        clearFile();
    });

    // Forms
    elements.participantForm.addEventListener('submit', handleParticipantSubmit);
    elements.employerForm.addEventListener('submit', handleEmployerSubmit);

    // Set default date to today
    const today = new Date().toISOString().split('T')[0];
    elements.lastWorkDate.value = today;
    elements.lastWorkDate.max = today;
    elements.eLastWorkDate.value = today;
    elements.eLastWorkDate.max = today;
}

async function loadVerificationDetails() {
    try {
        const response = await fetch(`${CONFIG.apiUrl}/${state.token}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();

        if (!data.success) {
            showError('Verification Unavailable', data.message || 'This verification link is no longer valid.');
            return;
        }

        // Store data
        state.requestType = data.requestType;
        state.verificationLevel = data.verificationLevel;
        state.requestId = data.requestId;
        state.jobPlacement = data.jobPlacement;

        // Show appropriate screen
        if (data.requestType === 'Participant') {
            showParticipantScreen(data);
        } else if (data.requestType === 'Employer') {
            showEmployerScreen(data);
        } else {
            showError('Unknown Request Type', 'Unable to determine verification type.');
        }

    } catch (error) {
        console.error('Error loading verification:', error);
        showError('Connection Error', 'Unable to load verification details. Please check your internet connection and try again.');
    }
}

function showScreen(screenId) {
    // Hide all screens
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    // Show requested screen
    document.getElementById(screenId).classList.add('active');
}

function showError(title, message) {
    elements.errorTitle.textContent = title;
    elements.errorMessage.textContent = message;
    showScreen('error-screen');
}

function showParticipantScreen(data) {
    if (data.jobPlacement) {
        elements.pEmployer.textContent = data.jobPlacement.employerName || '-';
        elements.pJobTitle.textContent = data.jobPlacement.jobTitle || '-';
    }
    elements.pMilestone.textContent = data.verificationLevel || '-';
    showScreen('participant-screen');
}

function showEmployerScreen(data) {
    if (data.jobPlacement) {
        elements.eParticipantName.textContent = data.jobPlacement.participantName || '-';
        elements.eJobTitle.textContent = data.jobPlacement.jobTitle || '-';
    }
    elements.eMilestone.textContent = data.verificationLevel || '-';
    showScreen('employer-screen');
}

function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
        alert('File is too large. Please select a file under 10MB.');
        return;
    }

    state.selectedFile = file;

    // Read file as base64
    const reader = new FileReader();
    reader.onload = (e) => {
        state.fileData = e.target.result.split(',')[1]; // Remove data:mime;base64, prefix

        // Show preview
        elements.uploadPlaceholder.hidden = true;
        elements.filePreview.hidden = false;
        elements.fileName.textContent = file.name;

        if (file.type.startsWith('image/')) {
            elements.previewImage.src = e.target.result;
            elements.previewImage.hidden = false;
        } else {
            elements.previewImage.hidden = true;
        }
    };
    reader.readAsDataURL(file);
}

function clearFile() {
    state.selectedFile = null;
    state.fileData = null;
    elements.fileInput.value = '';
    elements.uploadPlaceholder.hidden = false;
    elements.filePreview.hidden = true;
    elements.previewImage.src = '';
}

async function handleParticipantSubmit(event) {
    event.preventDefault();

    // Validate
    if (!state.fileData) {
        alert('Please upload a document.');
        return;
    }

    const submitBtn = elements.participantSubmit;
    setButtonLoading(submitBtn, true);

    try {
        const payload = {
            verificationType: elements.verificationType.value,
            fileData: state.fileData,
            fileName: state.selectedFile.name,
            fileType: state.selectedFile.type,
            lastWorkDate: elements.lastWorkDate.value
        };

        const response = await fetch(`${CONFIG.apiUrl}/${state.token}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (data.success) {
            showScreen('success-screen');
        } else {
            alert(data.message || 'Failed to submit verification. Please try again.');
        }

    } catch (error) {
        console.error('Submit error:', error);
        alert('An error occurred. Please check your connection and try again.');
    } finally {
        setButtonLoading(submitBtn, false);
    }
}

async function handleEmployerSubmit(event) {
    event.preventDefault();

    const isEmployed = document.querySelector('input[name="is-employed"]:checked');
    if (!isEmployed) {
        alert('Please indicate whether the person is still employed.');
        return;
    }

    const submitBtn = elements.employerSubmit;
    setButtonLoading(submitBtn, true);

    try {
        const payload = {
            isEmployed: isEmployed.value === 'true',
            lastWorkDate: elements.eLastWorkDate.value,
            comments: elements.eComments.value
        };

        const response = await fetch(`${CONFIG.apiUrl}/${state.token}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (data.success) {
            showScreen('success-screen');
        } else {
            alert(data.message || 'Failed to submit verification. Please try again.');
        }

    } catch (error) {
        console.error('Submit error:', error);
        alert('An error occurred. Please check your connection and try again.');
    } finally {
        setButtonLoading(submitBtn, false);
    }
}

function setButtonLoading(button, loading) {
    const textEl = button.querySelector('.btn-text');
    const spinnerEl = button.querySelector('.btn-spinner');

    if (loading) {
        button.disabled = true;
        textEl.hidden = true;
        spinnerEl.hidden = false;
    } else {
        button.disabled = false;
        textEl.hidden = false;
        spinnerEl.hidden = true;
    }
}
