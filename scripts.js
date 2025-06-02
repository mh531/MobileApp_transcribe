// scripts.js
document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Element Selectors ---
    const tabUpload = document.getElementById('tab-upload');
    const tabRecord = document.getElementById('tab-record');
    const uploadContent = document.getElementById('upload-content');
    const recordContent = document.getElementById('record-content');
    const audioFileInput = document.getElementById('audioFile');
    const fileNameDisplay = document.getElementById('fileName');
    const startRecordBtn = document.getElementById('startRecordBtn');
    const stopRecordBtn = document.getElementById('stopRecordBtn');
    const recordingStatus = document.getElementById('recordingStatus');
    const audioPlayback = document.getElementById('audioPlayback');
    const languageSelect = document.getElementById('language');
    const numSpeakersSelect = document.getElementById('numSpeakers');
    const contextTextarea = document.getElementById('context');
    const transcribeBtn = document.getElementById('transcribeBtn');
    const loadingIndicator = document.getElementById('loadingIndicator');
    const transcriptionOutputSection = document.getElementById('transcriptionOutputSection');
    const transcriptionTextDiv = document.getElementById('transcriptionText');
    const copyTextBtn = document.getElementById('copyTextBtn');
    const downloadDocxBtn = document.getElementById('downloadDocxBtn');
    const errorMessageDiv = document.getElementById('errorMessage');

    const hamburgerMenuBtn = document.getElementById('hamburgerMenuBtn');
    const sideNav = document.getElementById('sideNav');
    const closeNavBtn = document.getElementById('closeNavBtn');
    const overlay = document.getElementById('overlay');

    const navHistoryBtn = document.getElementById('navHistoryBtn');
    const navCreditsBtn = document.getElementById('navCreditsBtn');

    const historyModal = document.getElementById('historyModal');
    const creditsModal = document.getElementById('creditsModal');
    const closeModalBtns = document.querySelectorAll('.close-modal-btn');

    const historyListContainer = document.getElementById('historyListContainer');
    const historyListUl = document.getElementById('historyList');
    const noHistoryMessage = document.getElementById('noHistoryMessage');
    const historyDetailView = document.getElementById('historyDetailView');
    const historyDetailDate = document.getElementById('historyDetailDate');
    const historyDetailName = document.getElementById('historyDetailName');
    const historyDetailLang = document.getElementById('historyDetailLang');
    const historyDetailText = document.getElementById('historyDetailText');
    const copyHistoryTextBtn = document.getElementById('copyHistoryTextBtn');
    const downloadHistoryDocxBtn = document.getElementById('downloadHistoryDocxBtn');
    const backToHistoryListBtn = document.getElementById('backToHistoryListBtn');
    let currentViewingHistoryItem = null;

    const currentCreditBalanceSpan = document.getElementById('currentCreditBalance');
    const creditPackageBtns = document.querySelectorAll('.credit-package-btn');
    const customCreditAmountInput = document.getElementById('customCreditAmount');
    const buyCustomCreditBtn = document.getElementById('buyCustomCreditBtn');
    const creditMessage = document.getElementById('creditMessage');

    // --- State Variables ---
    let mediaRecorder;
    let audioChunks = [];
    let recordedAudioBlob = null;
    let uploadedFile = null;
    const TRANSCRIPTION_HISTORY_KEY = 'transcriptionHistory_v1';
    const USER_CREDITS_KEY = 'userCredits_v1';

    // --- Hamburger Menu Logic ---
    if (hamburgerMenuBtn && sideNav && overlay && closeNavBtn) {
        hamburgerMenuBtn.addEventListener('click', () => {
            sideNav.classList.add('open');
            overlay.classList.add('active');
        });

        closeNavBtn.addEventListener('click', closeSideNav);
        overlay.addEventListener('click', () => {
            if (sideNav.classList.contains('open')) {
                closeSideNav();
            }
        });
    }

    function closeSideNav() {
        if (sideNav) sideNav.classList.remove('open');
        if (overlay && !document.querySelector('.modal.active')) {
            overlay.classList.remove('active');
        }
    }

    // --- Modal Logic ---
    function openModal(modalElement) {
        if (modalElement) {
            modalElement.classList.add('active');
            if (overlay) overlay.classList.add('active');
            closeSideNav();
        }
    }

    function closeModal(modalElement) {
        if (modalElement) {
            modalElement.classList.remove('active');
            if (overlay && !sideNav.classList.contains('open') && !document.querySelector('.modal.active')) {
                overlay.classList.remove('active');
            }
        }
    }

    if (closeModalBtns) {
        closeModalBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const modalId = btn.dataset.modalId;
                if (modalId) {
                    const modalToClose = document.getElementById(modalId);
                    if (modalToClose) closeModal(modalToClose);
                }
            });
        });
    }

    if (overlay) {
        overlay.addEventListener('click', () => {
            const activeModal = document.querySelector('.modal.active');
            if (activeModal && !sideNav.classList.contains('open')) {
                closeModal(activeModal);
            }
        });
    }

    // --- Navigation Links ---
    if (navHistoryBtn && historyModal) {
        navHistoryBtn.addEventListener('click', (e) => {
            e.preventDefault();
            loadTranscriptionHistory();
            openModal(historyModal);
            showHistoryListView();
        });
    }

    if (navCreditsBtn && creditsModal) {
        navCreditsBtn.addEventListener('click', (e) => {
            e.preventDefault();
            loadUserCredits();
            openModal(creditsModal);
        });
    }

    // --- Tab Functionality ---
    window.showTab = (tabName) => {
        if (tabUpload && tabRecord && uploadContent && recordContent) {
            if (tabName === 'upload') {
                tabUpload.classList.add('active');
                tabRecord.classList.remove('active');
                uploadContent.classList.add('active');
                recordContent.classList.remove('active');
                clearRecordingState();
            } else if (tabName === 'record') {
                tabRecord.classList.add('active');
                tabUpload.classList.remove('active');
                recordContent.classList.add('active');
                uploadContent.classList.remove('active');
                clearUploadState();
            }
        }
    };

    // --- File Upload Logic ---
    if (audioFileInput && fileNameDisplay && audioPlayback) {
        audioFileInput.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (file) {
                uploadedFile = file;
                fileNameDisplay.textContent = `Selected: ${file.name}`;
                recordedAudioBlob = null;
                audioPlayback.style.display = 'none';
                audioPlayback.src = '';
                if (transcribeBtn) transcribeBtn.disabled = false;
            } else {
                clearUploadState();
            }
        });
    }
    function clearUploadState() {
        uploadedFile = null;
        if (audioFileInput) audioFileInput.value = '';
        if (fileNameDisplay) fileNameDisplay.textContent = '';
        if (transcribeBtn && !recordedAudioBlob) transcribeBtn.disabled = true;
    }

    // --- Audio Recording Logic ---
    if (startRecordBtn && stopRecordBtn && recordingStatus && audioPlayback && transcribeBtn && audioFileInput) {
        startRecordBtn.addEventListener('click', async () => {
            if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                try {
                    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                    mediaRecorder = new MediaRecorder(stream);
                    mediaRecorder.ondataavailable = (event) => audioChunks.push(event.data);
                    mediaRecorder.onstart = () => {
                        startRecordBtn.disabled = true;
                        stopRecordBtn.disabled = false;
                        audioFileInput.disabled = true;
                        transcribeBtn.disabled = true;
                        recordingStatus.textContent = 'Recording...';
                        audioPlayback.style.display = 'none'; audioPlayback.src = '';
                        audioChunks = []; recordedAudioBlob = null; uploadedFile = null;
                        if (fileNameDisplay) fileNameDisplay.textContent = '';
                        hideError();
                    };
                    mediaRecorder.onstop = () => {
                        startRecordBtn.disabled = false; stopRecordBtn.disabled = true;
                        audioFileInput.disabled = false; transcribeBtn.disabled = false;
                        recordingStatus.textContent = 'Recording stopped. Ready to transcribe or re-record.';
                        recordedAudioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                        const audioUrl = URL.createObjectURL(recordedAudioBlob);
                        audioPlayback.src = audioUrl; audioPlayback.style.display = 'block';
                    };
                    mediaRecorder.onerror = (event) => {
                        showError(`Recording error: ${event.error ? event.error.message : 'Unknown error'}`);
                        resetRecordingControls();
                    };
                    mediaRecorder.start();
                } catch (err) {
                    showError(`Mic access error: ${err.message}. Note: HTTPS is often required for microphone access.`);
                    resetRecordingControls();
                }
            } else {
                showError('Audio recording not supported in this browser.');
                resetRecordingControls();
            }
        });

        stopRecordBtn.addEventListener('click', () => {
            if (mediaRecorder && mediaRecorder.state !== 'inactive') mediaRecorder.stop();
        });
    }

    function clearRecordingState() {
        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            if (mediaRecorder.stream && typeof mediaRecorder.stream.getTracks === 'function') {
                mediaRecorder.stream.getTracks().forEach(track => track.stop());
            }
            mediaRecorder.stop();
        }
        audioChunks = []; recordedAudioBlob = null;
        if (audioPlayback) { audioPlayback.style.display = 'none'; audioPlayback.src = ''; }
        if (recordingStatus) recordingStatus.textContent = '';
        resetRecordingControls();
    }
    function resetRecordingControls() {
        if (startRecordBtn) startRecordBtn.disabled = false;
        if (stopRecordBtn) stopRecordBtn.disabled = true;
        if (audioFileInput) audioFileInput.disabled = false;
        if (transcribeBtn && !uploadedFile && !recordedAudioBlob) transcribeBtn.disabled = true;
        else if (transcribeBtn) transcribeBtn.disabled = false;
    }

    // --- Transcribe Button Logic (with Flask Backend Integration) ---
    if (transcribeBtn && languageSelect && numSpeakersSelect && contextTextarea && loadingIndicator && transcriptionOutputSection) {
        transcribeBtn.addEventListener('click', async () => {
            if (!uploadedFile && !recordedAudioBlob) {
                showError('Please upload an audio file or record audio first.');
                return;
            }

            hideError();
            loadingIndicator.style.display = 'flex';
            transcriptionOutputSection.style.display = 'none';
            transcribeBtn.disabled = true;

            const formData = new FormData();
            const sourceName = uploadedFile ? uploadedFile.name : 'Recorded Audio';
            let audioFileNameForForm = 'recorded_audio.webm';

            if (uploadedFile) {
                formData.append('audioFile', uploadedFile, uploadedFile.name);
                audioFileNameForForm = uploadedFile.name;
            } else if (recordedAudioBlob) {
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                audioFileNameForForm = `recorded_audio_${timestamp}.webm`;
                formData.append('audioFile', recordedAudioBlob, audioFileNameForForm);
            }

            const lang = languageSelect.value;
            const speakers = numSpeakersSelect.value;
            const userContext = contextTextarea.value;

            formData.append('language', lang);
            formData.append('numSpeakers', speakers);
            formData.append('context', userContext);

            try {
                console.log(`Sending to Flask: https://mhhf1375.pythonanywhere.com/api/transcribe with file: ${audioFileNameForForm}`);

                const response = await fetch('https://mhhf1375.pythonanywhere.com/api/transcribe', {
                    method: 'POST',
                    body: formData,
                });

                if (!response.ok) {
                    let errorData = { message: "Unknown server error." };
                    try {
                        errorData = await response.json();
                    } catch (e) {
                        // If response is not JSON, use statusText
                        errorData.message = response.statusText || errorData.message;
                    }
                    throw new Error(`Server error: ${response.status}. ${errorData.message}`);
                }

                const result = await response.json();

                if (result.success) {
                    displayTranscription(result.transcription);
                    saveTranscriptionToHistory({
                        text: result.transcription,
                        name: sourceName,
                        language: lang,
                        numSpeakers: speakers,
                        context: userContext,
                        date: new Date().toISOString()
                    });
                } else {
                    showError(result.message || 'Transcription failed. Please try again.');
                }

            } catch (error) {
                showError(`Network or application error: ${error.message}. Check console & ensure backend is running.`);
                console.error("Transcription process error:", error);
            } finally {
                loadingIndicator.style.display = 'none';
                transcribeBtn.disabled = (!uploadedFile && !recordedAudioBlob);
            }
        });
    }

    function displayTranscription(text) {
        if (transcriptionTextDiv && transcriptionOutputSection) {
            transcriptionTextDiv.textContent = text;
            transcriptionOutputSection.style.display = 'block';
            transcriptionOutputSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }

    // --- Output Controls ---
    if (copyTextBtn && transcriptionTextDiv) {
        copyTextBtn.addEventListener('click', () => {
            if (transcriptionTextDiv.textContent) {
                navigator.clipboard.writeText(transcriptionTextDiv.textContent)
                    .then(() => {
                        const originalHTML = copyTextBtn.innerHTML;
                        copyTextBtn.innerHTML = `Copied!`;
                        setTimeout(() => { copyTextBtn.innerHTML = originalHTML; }, 1500);
                    })
                    .catch(err => {
                        showError('Failed to copy text. See console.');
                        console.error('Copy error:', err);
                    });
            }
        });
    }
    if (downloadDocxBtn && transcriptionTextDiv) {
        downloadDocxBtn.addEventListener('click', () => {
            const transcription = transcriptionTextDiv.textContent;
            if (!transcription) {
                showError("No transcription available to download."); return;
            }
            simulateDocxDownload(transcription, "current_transcription.docx");
        });
    }

    function simulateDocxDownload(text, filename = "transcription.docx") {
        // This is a placeholder. Actual DOCX generation would happen on the backend.
        // For now, we can simulate by creating a text file download.
        const element = document.createElement('a');
        const file = new Blob([`DOCX Content (Simulated):\n\n${text}`], {type: 'text/plain'});
        element.href = URL.createObjectURL(file);
        element.download = filename.replace('.docx', '.txt'); // Save as .txt for this simulation
        document.body.appendChild(element); // Required for this to work in FireFox
        element.click();
        document.body.removeChild(element);
        URL.revokeObjectURL(element.href);
        // alert(`Simulating DOCX download of "${filename}" with content preview:\n\n${text.substring(0,200)}...`);
    }

    // --- Transcription History Logic ---
    function getHistory() {
        try {
            const history = localStorage.getItem(TRANSCRIPTION_HISTORY_KEY);
            return history ? JSON.parse(history) : [];
        } catch (e) {
            console.error("Error parsing history from localStorage", e);
            return [];
        }
    }

    function saveTranscriptionToHistory(item) {
        const history = getHistory();
        item.id = Date.now().toString() + Math.random().toString(36).substring(2, 7);
        history.unshift(item);
        try {
            localStorage.setItem(TRANSCRIPTION_HISTORY_KEY, JSON.stringify(history.slice(0, 50)));
        } catch (e) {
            console.error("Error saving history to localStorage", e);
            showError("Could not save transcription to history (localStorage might be full or disabled).");
        }
    }

    function loadTranscriptionHistory() {
        if (!historyListUl || !noHistoryMessage || !historyListContainer || !historyDetailView) return;
        const history = getHistory();
        historyListUl.innerHTML = '';
        if (history.length === 0) {
            noHistoryMessage.style.display = 'block';
            historyListContainer.style.display = 'block';
            historyDetailView.style.display = 'none';
            return;
        }
        noHistoryMessage.style.display = 'none';
        historyListContainer.style.display = 'block';
        historyDetailView.style.display = 'none';

        history.forEach(item => {
            const li = document.createElement('li');
            li.dataset.historyId = item.id;
            li.innerHTML = `
                <span class="history-item-name">${item.name ? item.name.substring(0, 30) + (item.name.length > 30 ? '...' : '') : 'Transcription'}</span>
                <span class="history-item-date">${new Date(item.date).toLocaleString()}</span>
                <span class="history-item-preview">${item.text ? item.text.substring(0, 50) + (item.text.length > 50 ? '...' : '') : ''}</span>
            `;
            li.addEventListener('click', () => viewHistoryItem(item.id));
            historyListUl.appendChild(li);
        });
    }

    function viewHistoryItem(itemId) {
        if (!historyDetailDate || !historyDetailName || !historyDetailLang || !historyDetailText) return;
        const history = getHistory();
        const item = history.find(h => h.id === itemId);
        if (item) {
            currentViewingHistoryItem = item;
            historyDetailDate.textContent = new Date(item.date).toLocaleString();
            historyDetailName.textContent = item.name || 'N/A';
            historyDetailLang.textContent = item.language || 'N/A';
            historyDetailText.textContent = item.text;
            showHistoryDetailView();
        }
    }

    function showHistoryListView() {
        if (historyListContainer && historyDetailView) {
            historyListContainer.style.display = 'block';
            historyDetailView.style.display = 'none';
        }
    }
    function showHistoryDetailView() {
        if (historyListContainer && historyDetailView) {
            historyListContainer.style.display = 'none';
            historyDetailView.style.display = 'block';
        }
    }

    if (backToHistoryListBtn) backToHistoryListBtn.addEventListener('click', showHistoryListView);

    if (copyHistoryTextBtn) {
        copyHistoryTextBtn.addEventListener('click', () => {
            if (currentViewingHistoryItem && currentViewingHistoryItem.text) {
                navigator.clipboard.writeText(currentViewingHistoryItem.text)
                    .then(() => {
                        const originalHTML = copyHistoryTextBtn.innerHTML;
                        copyHistoryTextBtn.innerHTML = `Copied!`;
                        setTimeout(() => { copyHistoryTextBtn.innerHTML = originalHTML; }, 1500);
                    })
                    .catch(err => {
                        showError('Failed to copy history text. See console.');
                        console.error("History copy error:", err);
                    });
            }
        });
    }

    if (downloadHistoryDocxBtn) {
        downloadHistoryDocxBtn.addEventListener('click', () => {
            if (currentViewingHistoryItem && currentViewingHistoryItem.text) {
                simulateDocxDownload(currentViewingHistoryItem.text, `${(currentViewingHistoryItem.name || 'history_item').replace(/\.[^/.]+$/, "")}.docx`);
            }
        });
    }

    // --- Credit System Logic (Simulated) ---
    function getCredits() {
        try {
            const credits = localStorage.getItem(USER_CREDITS_KEY);
            return credits ? parseInt(credits, 10) : 0;
        } catch (e) {
            console.error("Error getting credits from localStorage", e);
            return 0;
        }
    }

    function updateCredits(newAmount) {
        try {
            localStorage.setItem(USER_CREDITS_KEY, newAmount);
            loadUserCredits();
        } catch (e) {
            console.error("Error updating credits in localStorage", e);
            showCreditMessage("Could not update credits (localStorage error).", 'error');
        }
    }

    function loadUserCredits() {
        if (currentCreditBalanceSpan) {
            currentCreditBalanceSpan.textContent = `${getCredits()} minutes`;
        }
    }

    if (creditPackageBtns) {
        creditPackageBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const amount = parseInt(btn.dataset.amount, 10);
                const currentCredits = getCredits();
                updateCredits(currentCredits + amount);
                showCreditMessage(`Successfully added ${amount} minutes to your balance.`, 'success');
            });
        });
    }

    if (buyCustomCreditBtn && customCreditAmountInput) {
        buyCustomCreditBtn.addEventListener('click', () => {
            const amount = parseInt(customCreditAmountInput.value, 10);
            if (isNaN(amount) || amount <= 0) {
                showCreditMessage('Please enter a valid positive number of minutes.', 'error');
                return;
            }
            const currentCredits = getCredits();
            updateCredits(currentCredits + amount);
            showCreditMessage(`Successfully added ${amount} minutes to your balance.`, 'success');
            customCreditAmountInput.value = '';
        });
    }

    function showCreditMessage(message, type = 'info') {
        if (creditMessage) {
            creditMessage.textContent = message;
            creditMessage.className = `message ${type}`;
            creditMessage.style.display = 'block';
            setTimeout(() => { creditMessage.style.display = 'none'; }, 3000);
        }
    }

    // --- Error Handling ---
    function showError(message) {
        if (errorMessageDiv) {
            errorMessageDiv.textContent = message;
            errorMessageDiv.style.display = 'block';
        }
    }
    function hideError() {
        if (errorMessageDiv) {
            errorMessageDiv.textContent = '';
            errorMessageDiv.style.display = 'none';
        }
    }

    // --- Initial UI State ---
    if (typeof showTab === 'function') showTab('upload');
    loadUserCredits();
    if (historyModal) historyModal.classList.remove('active');
    if (creditsModal) creditsModal.classList.remove('active');
    if (overlay) overlay.classList.remove('active');
    if (transcribeBtn) transcribeBtn.disabled = true; // Start disabled
    resetRecordingControls();

    console.log("App initialized. Ensure Flask backend is running on http://127.0.0.1:5000 for transcription.");
});