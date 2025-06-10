document.addEventListener('DOMContentLoaded',()=>{
    const menuToggle=document.querySelector('.menu-toggle');
    const sideMenu=document.querySelector('.side-menu');
    const closeMenu=document.querySelector('.close-menu');
    const overlay=document.querySelector('.overlay');
    const tabs=document.querySelectorAll('.tabs button');
    const tabContents=document.querySelectorAll('.tab-content');
    const fileInput=document.getElementById('audioFile');
    const fileName=document.getElementById('fileName');
    const startBtn=document.getElementById('startRecord');
    const stopBtn=document.getElementById('stopRecord');
    const timer=document.getElementById('timer');
    const recordMsg=document.getElementById('recordMsg');
    const playback=document.getElementById('playback');
    const transcribeBtn=document.getElementById('transcribe');
    const loading=document.getElementById('loading');
    const outputSection=document.getElementById('output');
    const transcription=document.getElementById('transcription');
    const copyBtn=document.getElementById('copyText');
    const downloadBtn=document.getElementById('downloadText');
    const errorMsg=document.getElementById('error');
    const language=document.getElementById('language');
    const speakers=document.getElementById('speakers');
    const context=document.getElementById('context');

    let mediaRecorder;let chunks=[];let recordedBlob=null;let uploadedFile=null;let interval;let seconds=0;

    /* menu */
    menuToggle.addEventListener('click',()=>{sideMenu.classList.add('open');overlay.classList.add('active');});
    closeMenu.addEventListener('click',closeSideMenu);
    overlay.addEventListener('click',closeSideMenu);
    function closeSideMenu(){sideMenu.classList.remove('open');overlay.classList.remove('active');}

    /* tabs */
    tabs.forEach(btn=>btn.addEventListener('click',()=>{showTab(btn.dataset.tab);}));
    function showTab(name){tabs.forEach(b=>b.classList.remove('active'));tabContents.forEach(c=>c.classList.remove('active'));document.querySelector(`button[data-tab="${name}"]`).classList.add('active');document.getElementById(name).classList.add('active');if(name==='upload'){clearRecord();}else{clearUpload();}}

    /* file upload */
    fileInput.addEventListener('change',e=>{const f=e.target.files[0];if(f){uploadedFile=f;fileName.textContent=f.name;transcribeBtn.disabled=false;}else{clearUpload();}});
    function clearUpload(){uploadedFile=null;fileInput.value='';fileName.textContent='';if(!recordedBlob)transcribeBtn.disabled=true;}

    /* recording */
    startBtn.addEventListener('click',async()=>{
        if(!navigator.mediaDevices)return;
        try{
            const stream=await navigator.mediaDevices.getUserMedia({audio:true});
            mediaRecorder=new MediaRecorder(stream);
            mediaRecorder.ondataavailable=e=>chunks.push(e.data);
            mediaRecorder.onstart=()=>{startBtn.classList.add('hidden');stopBtn.classList.remove('hidden');recordMsg.textContent='در حال ضبط...';playback.classList.add('hidden');uploadedFile=null;fileName.textContent='';transcribeBtn.disabled=true;seconds=0;timer.textContent='۰۰:۰۰';interval=setInterval(()=>{seconds++;timer.textContent=formatTime(seconds);},1000);};
            mediaRecorder.onstop=()=>{clearInterval(interval);startBtn.classList.remove('hidden');stopBtn.classList.add('hidden');recordMsg.textContent='';recordedBlob=new Blob(chunks,{type:'audio/webm'});playback.src=URL.createObjectURL(recordedBlob);playback.classList.remove('hidden');transcribeBtn.disabled=false;};
            mediaRecorder.start();
        }catch(err){showError('عدم دسترسی به میکروفون');}
    });
    stopBtn.addEventListener('click',()=>{if(mediaRecorder&&mediaRecorder.state!=='inactive')mediaRecorder.stop();});
    function clearRecord(){if(mediaRecorder&&mediaRecorder.state!=='inactive'){mediaRecorder.stream.getTracks().forEach(t=>t.stop());}
        clearInterval(interval);seconds=0;timer.textContent='۰۰:۰۰';recordMsg.textContent='';recordedBlob=null;playback.classList.add('hidden');if(!uploadedFile)transcribeBtn.disabled=true;}

    function formatTime(s){const m=String(Math.floor(s/60)).padStart(2,'0');const sec=String(s%60).padStart(2,'0');return `${m}:${sec}`;}

    /* transcription */
    transcribeBtn.addEventListener('click',async()=>{
        if(!uploadedFile&&!recordedBlob){showError('فایل صوتی موجود نیست');return;}
        hideError();loading.classList.remove('hidden');transcribeBtn.disabled=true;outputSection.classList.add('hidden');
        const data=new FormData();
        if(uploadedFile){data.append('audioFile',uploadedFile,uploadedFile.name);}else{data.append('audioFile',recordedBlob,'record.webm');}
        data.append('language',language.value);data.append('numSpeakers',speakers.value);data.append('context',context.value);
        try{
            const res=await fetch('https://mhhf1375.pythonanywhere.com/api/transcribe',{method:'POST',body:data});
            const json=await res.json();
            if(res.ok&&json.success){transcription.textContent=json.transcription;outputSection.classList.remove('hidden');saveHistory(json.transcription);}
            else throw new Error(json.message||'خطا در سرور');
        }catch(err){showError(err.message);}finally{loading.classList.add('hidden');transcribeBtn.disabled=false;}
    });

    /* copy & download */
    copyBtn.addEventListener('click',()=>{navigator.clipboard.writeText(transcription.textContent);});
    downloadBtn.addEventListener('click',()=>{
        const blob=new Blob([transcription.textContent],{type:'text/plain'});
        const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='transcription.txt';a.click();URL.revokeObjectURL(a.href);
    });

    function showError(msg){errorMsg.textContent=msg;errorMsg.classList.remove('hidden');}
    function hideError(){errorMsg.textContent='';errorMsg.classList.add('hidden');}

    /* history & credits */
    const historyModal=document.getElementById('historyModal');
    const creditsModal=document.getElementById('creditsModal');
    const aboutModal=document.getElementById('aboutModal');
    document.querySelectorAll('[data-modal]').forEach(link=>{
        link.addEventListener('click',e=>{e.preventDefault();openModal(document.getElementById(link.dataset.modal));});
    });
    document.querySelectorAll('[data-close]').forEach(btn=>btn.addEventListener('click',()=>closeModal(btn.closest('.modal'))));

    function openModal(m){m.classList.add('show');overlay.classList.add('active');}
    function closeModal(m){m.classList.remove('show');overlay.classList.remove('active');}

    /* history */
    const HISTORY_KEY='history_v1';
    const historyList=document.getElementById('historyList');
    function saveHistory(text){const items=getHistory();items.unshift({text,ts:Date.now()});localStorage.setItem(HISTORY_KEY,JSON.stringify(items.slice(0,20)));renderHistory();}
    function getHistory(){try{return JSON.parse(localStorage.getItem(HISTORY_KEY))||[];}catch(e){return[];}}
    function renderHistory(){historyList.innerHTML='';getHistory().forEach(item=>{const li=document.createElement('li');li.textContent=new Date(item.ts).toLocaleString('fa-IR');li.addEventListener('click',()=>{transcription.textContent=item.text;outputSection.classList.remove('hidden');closeModal(historyModal);});historyList.appendChild(li);});}
    renderHistory();

    /* credits */
    const CREDIT_KEY='credit_v1';
    const creditBalance=document.getElementById('creditBalance');
    document.querySelectorAll('[data-credit]').forEach(btn=>btn.addEventListener('click',()=>{const amt=parseInt(btn.dataset.credit,10);updateCredit(getCredit()+amt);}));
    function getCredit(){return parseInt(localStorage.getItem(CREDIT_KEY)||'0',10);}
    function updateCredit(v){localStorage.setItem(CREDIT_KEY,v);creditBalance.textContent=v;}
    updateCredit(getCredit());
});
