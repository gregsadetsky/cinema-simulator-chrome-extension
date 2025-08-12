let currentUrl = window.location.href;
let loggedVideoSrc = null;
let overlayAdded = false;
let currentVideo = null;
let audioContext = null;
let soundBuffers = {};
let soundPlaybackActive = false;
let loopingAudioSource = null;

const soundFiles = [
  "audio/cough00001.wav",
  "audio/cough00002.wav",
  "audio/cough00003.wav",
  "audio/cough00004.wav",
  "audio/cough00005.wav",
  "audio/cough00006.wav",
  "audio/cough00007.wav",
  "audio/cough00008.wav",
  "audio/cough00009.wav",
  "audio/cough00010.wav",
  "audio/cough00011.wav",
  "audio/cough00012.wav",
];

const loopingFile = "audio/popcorn.mp3";

function createOverlay(video) {
  // Check if overlay already exists in DOM
  if (document.getElementById('cinema-simulator-overlay')) {
    // console.log('Overlay already exists, skipping');
    return;
  }
  
  const overlay = document.createElement('div');
  overlay.id = 'cinema-simulator-overlay';
  const videoRect = video.getBoundingClientRect();
  const overlayWidth = Math.round(videoRect.width);
  const overlayHeight = Math.round(videoRect.height);
  
  overlay.style.cssText = `
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
    width: ${overlayWidth}px;
    height: ${overlayHeight}px;
    z-index: 9999;
    pointer-events: none;
    background-image: url('${chrome.runtime.getURL('persons.png')}');
    background-size: cover;
    background-repeat: no-repeat;
    background-position: center;
  `;
  
  const videoContainer = video.parentElement;
  videoContainer.style.position = 'relative';
  videoContainer.appendChild(overlay);
  overlayAdded = true;
  currentVideo = video;
  
  // console.log('Created overlay div:', overlay);
  // console.log('Video container:', videoContainer);
  // console.log('Overlay in DOM after creation:', document.getElementById('cinema-simulator-overlay'));
  
  // Check if it's still there after 2 seconds
  setTimeout(() => {
    console.log('Overlay still in DOM after 2s:', document.getElementById('cinema-simulator-overlay'));
  }, 2000);
}

function updateOverlaySize() {
  const overlay = document.getElementById('cinema-simulator-overlay');
  if (overlay && currentVideo) {
    const videoRect = currentVideo.getBoundingClientRect();
    const overlayWidth = Math.round(videoRect.width);
    const overlayHeight = Math.round(videoRect.height);
    
    overlay.style.width = `${overlayWidth}px`;
    overlay.style.height = `${overlayHeight}px`;
  }
}

async function setupAudioContext() {
  try {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    if (audioContext.state === 'suspended') {
      await audioContext.resume();
    }
    
    // console.log('Audio context ready:', audioContext.state);
    return true;
  } catch (error) {
    console.error('Failed to setup audio context:', error);
    return false;
  }
}

async function loadSound(soundFile) {
  try {
    const response = await fetch(chrome.runtime.getURL(soundFile));
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    soundBuffers[soundFile] = audioBuffer;
    // console.log('Loaded sound:', soundFile);
  } catch (error) {
    console.error('Failed to load sound:', soundFile, error);
  }
}

async function loadAllSounds() {
  const audioReady = await setupAudioContext();
  if (!audioReady) return false;
  
  // Load cough sounds
  await Promise.all(soundFiles.map(loadSound));
  
  // Load looping sound
  await loadSound(loopingFile);
  
  // console.log('All sounds loaded');
  return true;
}

function startLoopingSound() {
  if (loopingAudioSource || !audioContext || !soundBuffers[loopingFile]) return;
  
  const buffer = soundBuffers[loopingFile];
  loopingAudioSource = audioContext.createBufferSource();
  loopingAudioSource.buffer = buffer;
  loopingAudioSource.loop = true;
  loopingAudioSource.connect(audioContext.destination);
  loopingAudioSource.start();
  // console.log('Started looping popcorn sound');
}

function stopLoopingSound() {
  if (loopingAudioSource) {
    loopingAudioSource.stop();
    loopingAudioSource = null;
    // console.log('Stopped looping popcorn sound');
  }
}

function playRandomSound() {
  if (!audioContext || Object.keys(soundBuffers).length === 0) return;
  
  const randomFile = soundFiles[Math.floor(Math.random() * soundFiles.length)];
  const buffer = soundBuffers[randomFile];
  
  if (buffer) {
    const source = audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(audioContext.destination);
    source.start();
    // console.log('Playing sound:', randomFile);
  }
}

function startRandomSoundPlayback() {
  if (soundPlaybackActive) return;
  soundPlaybackActive = true;
  
  function scheduleNextSound() {
    if (!soundPlaybackActive) return;
    
    const delay = 1000 + Math.random() * 9000; // 1-10 seconds
    setTimeout(() => {
      playRandomSound();
      scheduleNextSound();
    }, delay);
  }
  
  // First sound after 1 second
  setTimeout(() => {
    playRandomSound();
    scheduleNextSound();
  }, 1000);
}

function findVideoElement() {
  const video = document.querySelector('video');
  
  if (video && video.src && video.src !== loggedVideoSrc) {
    loggedVideoSrc = video.src;
    overlayAdded = false;
    // console.log('Found YouTube video element:', video);
    // console.log('Video src:', video.src || 'No direct src');
    // console.log('Video dimensions:', video.videoWidth + 'x' + video.videoHeight);
    
    createOverlay(video);
    
    // Start sound playback after overlay is created
    loadAllSounds().then(success => {
      if (success) {
        startLoopingSound();
        startRandomSoundPlayback();
      }
    });
  }
}

function checkForUrlChange() {
  if (window.location.href !== currentUrl) {
    currentUrl = window.location.href;
    loggedVideoSrc = null; // Reset for new video
    overlayAdded = false; // Reset overlay flag
    soundPlaybackActive = false; // Stop current sound playback
    stopLoopingSound(); // Stop looping sound
    setTimeout(findVideoElement, 5000); // Wait 5 seconds
  }
}

findVideoElement();

setInterval(checkForUrlChange, 1000);

window.addEventListener('resize', updateOverlaySize);