import WaveSurfer from 'https://cdn.jsdelivr.net/npm/wavesurfer.js@7/dist/wavesurfer.esm.js'

const wavesurfer = WaveSurfer.create({
  container: '#waveform',
  waveColor: 'rgba(0, 51, 102, 0.4)',
  progressColor: 'rgba(0, 197, 215, 0.7)',
  url: 'audio/c-toning.mp3',
  height: 80,
  responsive: true,
})

// Get the button element
const playButton = document.getElementById('playButton')

// Add click event to toggle play/pause
playButton.addEventListener('click', function() {
  wavesurfer.playPause()
  
  // Update button text based on playback state
  if (wavesurfer.isPlaying()) {
    playButton.textContent = 'Pause Sound Healing'
    playButton.classList.add('playing')
  } else {
    playButton.textContent = 'Play Sound Healing'
    playButton.classList.remove('playing')
  }
})

// Reset button when audio finishes
wavesurfer.on('finish', function() {
  playButton.textContent = 'Play Sound Healing'
  playButton.classList.remove('playing')
})