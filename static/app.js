let mediaRecorder;
let audioChunks = [];
let currentPrompt = null;
let audioBlob = null;

async function fetchPrompt(){
  const res = await fetch('/next_prompt');
  if(!res.ok){
    document.getElementById('promptBox').textContent = 'No hay prompts.';
    return;
  }
  const p = await res.json();
  currentPrompt = p;
  document.getElementById('promptBox').textContent = p.text;
}

function setStatus(msg){
  document.getElementById('status').textContent = msg;
}

document.addEventListener('DOMContentLoaded', ()=>{
  fetchPrompt();

  const recordBtn = document.getElementById('recordBtn');
  const stopBtn = document.getElementById('stopBtn');
  const playBtn = document.getElementById('playBtn');
  const submitBtn = document.getElementById('submitBtn');
  const nextBtn = document.getElementById('nextBtn');

  recordBtn.onclick = async ()=>{
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream);
    audioChunks = [];
    mediaRecorder.ondataavailable = e => audioChunks.push(e.data);
    mediaRecorder.onstop = () => {
      audioBlob = new Blob(audioChunks, { type: audioChunks[0].type });
      playBtn.disabled = false;
      submitBtn.disabled = false;
      setStatus('Grabación lista');
    };
    mediaRecorder.start();
    recordBtn.disabled = true;
    stopBtn.disabled = false;
    setStatus('Grabando...');
  };

  stopBtn.onclick = ()=>{
    if(mediaRecorder && mediaRecorder.state !== 'inactive') mediaRecorder.stop();
    recordBtn.disabled = false;
    stopBtn.disabled = true;
  };

  playBtn.onclick = ()=>{
    if(!audioBlob) return;
    const url = URL.createObjectURL(audioBlob);
    const audio = new Audio(url);
    audio.play();
  };

  submitBtn.onclick = async ()=>{
    if(!audioBlob || !currentPrompt) return;
    const userId = document.getElementById('userId').value || '';
    const transcript = document.getElementById('transcript').value || '';
    const form = new FormData();
    form.append('audio', audioBlob, 'recording.webm');
    form.append('prompt_id', currentPrompt.id);
    form.append('prompt_text', currentPrompt.text);
    form.append('user_id', userId);
    form.append('transcript', transcript);
    setStatus('Subiendo...');
    const res = await fetch('/upload_recording', { method: 'POST', body: form });
    const j = await res.json();
    if(res.ok){
      setStatus('Subido: ' + j.filename);
      // reset
      audioBlob = null;
      document.getElementById('transcript').value = '';
      document.getElementById('playBtn').disabled = true;
      document.getElementById('submitBtn').disabled = true;
    } else {
      setStatus('Error: ' + (j.error || res.statusText));
    }
  };

  nextBtn.onclick = ()=> fetchPrompt();
});
