/**
 * YouTube Background Video Script
 * Sets up and controls the YouTube background video
 */

document.addEventListener('DOMContentLoaded', function() {
  // Load YouTube API asynchronously
  const tag = document.createElement('script');
  tag.src = "https://www.youtube.com/iframe_api";
  const firstScriptTag = document.getElementsByTagName('script')[0];
  firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
  
  // The YouTube player will be initialized when the API is ready
  window.onYouTubeIframeAPIReady = function() {
    const player = new YT.Player('background-video', {
      videoId: 'xLHVkY2UO4A', // The YouTube video ID
      playerVars: {
        autoplay: 1,
        loop: 1,
        playlist: 'xLHVkY2UO4A', // Needed for looping
        controls: 0,
        showinfo: 0,
        autohide: 1,
        modestbranding: 1,
        mute: 1, // Muted by default to allow autoplay
        rel: 0,
        disablekb: 1,
        fs: 0,
        iv_load_policy: 3,
      },
      events: {
        'onReady': onPlayerReady,
        'onStateChange': onPlayerStateChange
      }
    });
  };

  // When the player is ready, start playing
  function onPlayerReady(event) {
    event.target.playVideo();
    event.target.mute(); // Ensure muted for autoplay
    
    // Make sure the video is fullscreen
    resizeVideo();
    
    // Add resize listener
    window.addEventListener('resize', resizeVideo);
  }

  // When the video ends, restart it
  function onPlayerStateChange(event) {
    if (event.data === YT.PlayerState.ENDED) {
      event.target.playVideo();
    }
  }

  // Resize the video to maintain fullscreen coverage
  function resizeVideo() {
    const videoContainer = document.getElementById('background-video-container');
    if (!videoContainer) return;
    
    const width = window.innerWidth;
    const height = window.innerHeight;
    const aspectRatio = 16 / 9;
    
    let newWidth, newHeight;
    
    if (width / height > aspectRatio) {
      newWidth = width;
      newHeight = width / aspectRatio;
    } else {
      newWidth = height * aspectRatio;
      newHeight = height;
    }
    
    videoContainer.style.width = newWidth + 'px';
    videoContainer.style.height = newHeight + 'px';
  }
});