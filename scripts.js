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
    const recordTimerDisplay = document.getElementById('recordTimerDisplay');

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
    const navAboutUsBtn = document.getElementById('navAboutUsBtn');

    const historyModal = document.getElementById('historyModal');
    const creditsModal = document.getElementById('creditsModal');
    const aboutUsModal = document.getElementById('aboutUsModal');
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
    const TRANSCRIPTION_HISTORY_KEY = 'transcriptionHistory_v3_fa';
    const USER_CREDITS_KEY = 'userCredits_v3_fa';

    let recordingTimerInterval;
    let recordingSeconds = 0;

    // --- Hamburger Menu Logic ---
    if (hamburgerMenuBtn && sideNav && overlay && closeNavBtn) {
        hamburgerMenuBtn.addEventListener('click', () => {
            sideNav.classList.add('open');
            overlay.classList.add('active');
            hamburgerMenuBtn.classList.add('active');
        });

        function closeSideNav() {
            if (sideNav) sideNav.classList.remove('open');
            if (hamburgerMenuBtn) hamburgerMenuBtn.classList.remove('active');
            if (overlay && !document.querySelector('.modal.active')) {
                overlay.classList.remove('active');
            }
        }

        closeNavBtn.addEventListener('click', closeSideNav);
        overlay.addEventListener('click', () => {
            if (sideNav.classList.contains('open')) {
                closeSideNav();
            }
        });
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
    if (navAboutUsBtn && aboutUsModal) {
        navAboutUsBtn.addEventListener('click', (e) => {
            e.preventDefault();
            openModal(aboutUsModal);
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
                if (recordTimerDisplay) recordTimerDisplay.textContent = formatTime(0);
            }
        }
    };

    // --- File Upload Logic ---
    if (audioFileInput && fileNameDisplay && audioPlayback) {
        audioFileInput.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (file) {
                uploadedFile = file;
                fileNameDisplay.textContent = `انتخاب شده: ${file.name}`;
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
    function formatTime(totalSeconds) {
        const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '۰');
        const seconds = (totalSeconds % 60).toString().padStart(2, '۰');
        return `${minutes}:${seconds}`;
    }

    if (startRecordBtn && stopRecordBtn && recordingStatus && audioPlayback && transcribeBtn && audioFileInput && recordTimerDisplay) {
        startRecordBtn.addEventListener('click', async () => {
            if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                try {
                    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                    mediaRecorder = new MediaRecorder(stream);
                    mediaRecorder.ondataavailable = (event) => audioChunks.push(event.data);

                    mediaRecorder.onstart = () => {
                        startRecordBtn.classList.add('hidden');
                        stopRecordBtn.classList.remove('hidden');
                        recordContent.classList.add('is-recording');
                        audioFileInput.disabled = true;
                        transcribeBtn.disabled = true;
                        recordingStatus.textContent = 'در حال ضبط...';
                        audioPlayback.style.display = 'none'; audioPlayback.src = '';
                        audioChunks = []; recordedAudioBlob = null; uploadedFile = null;
                        if (fileNameDisplay) fileNameDisplay.textContent = '';
                        hideError();

                        recordingSeconds = 0;
                        recordTimerDisplay.textContent = formatTime(recordingSeconds);
                        clearInterval(recordingTimerInterval);
                        recordingTimerInterval = setInterval(() => {
                            recordingSeconds++;
                            recordTimerDisplay.textContent = formatTime(recordingSeconds);
                        }, 1000);
                    };

                    mediaRecorder.onstop = () => {
                        clearInterval(recordingTimerInterval);
                        startRecordBtn.classList.remove('hidden');
                        stopRecordBtn.classList.add('hidden');
                        recordContent.classList.remove('is-recording');
                        audioFileInput.disabled = false;
                        transcribeBtn.disabled = false;
                        recordingStatus.textContent = 'ضبط متوقف شد. آماده برای رونویسی یا ضبط مجدد.';

                        recordedAudioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                        const audioUrl = URL.createObjectURL(recordedAudioBlob);
                        audioPlayback.src = audioUrl; audioPlayback.style.display = 'block';
                    };
                    mediaRecorder.onerror = (event) => {
                        showError(`خطای ضبط: ${event.error ? event.error.message : 'خطای نامشخص'}`);
                        resetRecordingControls();
                    };
                    mediaRecorder.start();
                } catch (err) {
                    showError(`خطای دسترسی به میکروفون: ${err.message}. توجه: برای دسترسی به میکروفون اغلب به HTTPS نیاز است.`);
                    resetRecordingControls();
                }
            } else {
                showError('ضبط صدا در این مرورگر پشتیبانی نمی‌شود.');
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
        }
        clearInterval(recordingTimerInterval);
        recordingSeconds = 0;
        if (recordTimerDisplay) recordTimerDisplay.textContent = formatTime(0);
        if (recordContent) recordContent.classList.remove('is-recording');

        audioChunks = []; recordedAudioBlob = null;
        if (audioPlayback) { audioPlayback.style.display = 'none'; audioPlayback.src = ''; }
        if (recordingStatus) recordingStatus.textContent = '';
        resetRecordingControls();
    }

    function resetRecordingControls() {
        if (startRecordBtn) startRecordBtn.classList.remove('hidden');
        if (stopRecordBtn) stopRecordBtn.classList.add('hidden');
        if (recordContent) recordContent.classList.remove('is-recording');

        if (audioFileInput) audioFileInput.disabled = false;
        if (transcribeBtn && !uploadedFile && !recordedAudioBlob) transcribeBtn.disabled = true;
        else if (transcribeBtn) transcribeBtn.disabled = false;
    }

    // --- Transcribe Button Logic ---
    if (transcribeBtn && languageSelect && numSpeakersSelect && contextTextarea && loadingIndicator && transcriptionOutputSection) {
        transcribeBtn.addEventListener('click', async () => {
            if (!uploadedFile && !recordedAudioBlob) {
                showError('لطفاً ابتدا یک فایل صوتی بارگذاری کنید یا صدا ضبط کنید.');
                return;
            }

            hideError();
            loadingIndicator.style.display = 'flex';
            transcriptionOutputSection.style.display = 'none';
            transcribeBtn.disabled = true;

            const formData = new FormData();
            const sourceName = uploadedFile ? uploadedFile.name : 'صدای ضبط شده';
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
                const response = await fetch('https://mhhf1375.pythonanywhere.com/api/transcribe', {
                    method: 'POST',
                    body: formData,
                });

                if (!response.ok) {
                    let errorData = { message: "خطای نامشخص سرور." };
                    try {
                        errorData = await response.json();
                    } catch (e) {
                        errorData.message = response.statusText || errorData.message;
                    }
                    throw new Error(`خطای سرور: ${response.status}. ${errorData.message || 'پاسخی از سرور دریافت نشد.'}`);
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
                    showError(result.message || 'رونویسی ناموفق بود. لطفاً دوباره تلاش کنید.');
                }

            } catch (error) {
                showError(`خطای شبکه یا برنامه: ${error.message}. کنسول را بررسی کرده و از فعال بودن بک‌اند اطمینان حاصل کنید.`);
                console.error("خطای فرآیند رونویسی:", error);
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
                        const svgIcon = copyTextBtn.querySelector('svg').outerHTML;
                        copyTextBtn.innerHTML = `${svgIcon} کپی شد!`;
                        setTimeout(() => { copyTextBtn.innerHTML = originalHTML; }, 1500);
                    })
                    .catch(err => {
                        showError('خطا در کپی متن. کنسول را بررسی کنید.');
                        console.error('خطای کپی:', err);
                    });
            }
        });
    }
    if (downloadDocxBtn && transcriptionTextDiv) {
        downloadDocxBtn.addEventListener('click', () => {
            const transcription = transcriptionTextDiv.textContent;
            if (!transcription) {
                showError("رونوشتی برای دانلود موجود نیست."); return;
            }
            simulateDocxDownload(transcription, "رونویسی_فعلی.docx");
        });
    }

    function simulateDocxDownload(text, filename = "transcription.docx") {
        const element = document.createElement('a');
        const fileContent = `محتوای DOCX (شبیه‌سازی شده):\n\n${text}`;
        const file = new Blob([fileContent], { type: 'text/plain;charset=utf-8' });
        element.href = URL.createObjectURL(file);
        element.download = filename.replace('.docx', '.txt');
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
        URL.revokeObjectURL(element.href);
    }

    // --- Transcription History Logic ---
    function getHistory() {
        try {
            const history = localStorage.getItem(TRANSCRIPTION_HISTORY_KEY);
            return history ? JSON.parse(history) : [];
        } catch (e) {
            console.error("خطا در خواندن تاریخچه از حافظه محلی", e);
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
            console.error("خطا در ذخیره تاریخچه در حافظه محلی", e);
            showError("امکان ذخیره رونویسی در تاریخچه وجود ندارد (ممکن است حافظه محلی پر یا غیرفعال باشد).");
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
            const itemName = item.name ? item.name.substring(0, 30) + (item.name.length > 30 ? '...' : '') : 'رونویسی';
            const itemDate = new Date(item.date).toLocaleString('fa-IR');
            const itemPreview = item.text ? item.text.substring(0, 50) + (item.text.length > 50 ? '...' : '') : '';

            li.innerHTML = `
                <span class="history-item-name">${itemName}</span>
                <span class="history-item-date">${itemDate}</span>
                <span class="history-item-preview">${itemPreview}</span>
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
            historyDetailDate.textContent = new Date(item.date).toLocaleString('fa-IR');
            historyDetailName.textContent = item.name || 'نامشخص';
            historyDetailLang.textContent = item.language && languageSelect.querySelector(`option[value="${item.language}"]`) ? languageSelect.querySelector(`option[value="${item.language}"]`).textContent : 'نامشخص';
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
                        const svgIcon = copyHistoryTextBtn.querySelector('svg').outerHTML;
                        copyHistoryTextBtn.innerHTML = `${svgIcon} کپی شد!`;
                        setTimeout(() => { copyHistoryTextBtn.innerHTML = originalHTML; }, 1500);
                    })
                    .catch(err => {
                        showError('خطا در کپی متن تاریخچه. کنسول را بررسی کنید.');
                        console.error("خطای کپی تاریخچه:", err);
                    });
            }
        });
    }

    if (downloadHistoryDocxBtn) {
        downloadHistoryDocxBtn.addEventListener('click', () => {
            if (currentViewingHistoryItem && currentViewingHistoryItem.text) {
                simulateDocxDownload(currentViewingHistoryItem.text, `${(currentViewingHistoryItem.name || 'مورد_تاریخچه').replace(/\.[^/.]+$/, "")}.docx`);
            }
        });
    }

    // --- Credit System Logic (Simulated) ---
    function getCredits() {
        try {
            const credits = localStorage.getItem(USER_CREDITS_KEY);
            return credits ? parseInt(credits, 10) : 0;
        } catch (e) {
            console.error("خطا در دریافت اعتبار از حافظه محلی", e);
            return 0;
        }
    }

    function updateCredits(newAmount) {
        try {
            localStorage.setItem(USER_CREDITS_KEY, newAmount);
            loadUserCredits();
        } catch (e) {
            console.error("خطا در به‌روزرسانی اعتبار در حافظه محلی", e);
            showCreditMessage("امکان به‌روزرسانی اعتبار وجود ندارد (خطای حافظه محلی).", 'error');
        }
    }

    function loadUserCredits() {
        if (currentCreditBalanceSpan) {
            currentCreditBalanceSpan.textContent = `${getCredits()} دقیقه`;
        }
    }

    if (creditPackageBtns) {
        creditPackageBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const amount = parseInt(btn.dataset.amount, 10);
                const currentCredits = getCredits();
                updateCredits(currentCredits + amount);
                showCreditMessage(`با موفقیت ${amount} دقیقه به موجودی شما اضافه شد.`, 'success');
            });
        });
    }

    if (buyCustomCreditBtn && customCreditAmountInput) {
        buyCustomCreditBtn.addEventListener('click', () => {
            const amount = parseInt(customCreditAmountInput.value, 10);
            if (isNaN(amount) || amount <= 0) {
                showCreditMessage('لطفاً تعداد دقیقه معتبر و مثبت وارد کنید.', 'error');
                return;
            }
            const currentCredits = getCredits();
            updateCredits(currentCredits + amount);
            showCreditMessage(`با موفقیت ${amount} دقیقه به موجودی شما اضافه شد.`, 'success');
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
            if (transcriptionOutputSection && transcriptionOutputSection.contains(errorMessageDiv)) {
                errorMessageDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
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
    if (aboutUsModal) aboutUsModal.classList.remove('active');
    if (overlay) overlay.classList.remove('active');
    if (transcribeBtn) transcribeBtn.disabled = true;
    clearRecordingState();

    console.log("برنامه راه‌اندازی شد. برای رونویسی، از فعال بودن بک‌اند اطمینان حاصل کنید.");
});
