document.addEventListener('DOMContentLoaded', () => {
    class AudioButton {
        constructor({ name, pauseText, playText, audioFile, container, buttonId, waveColor, progressColor, buttonColor }) {
            this.name = name;
            this.pauseText = pauseText;
            this.playText = playText;
            this.audioFile = audioFile;
            this.container = container;
            this.button = document.getElementById(buttonId);

            if (!this.button) {
                console.error(`Button with ID "${buttonId}" not found for audio player "${name}"`);
                return; // Exit the constructor early
            }
            
            // Remove duplicate line
            this.button.style.backgroundColor = buttonColor;
            
            // Check if container exists
            const containerElement = document.querySelector(this.container);
            if (!containerElement) {
                console.error(`Container "${this.container}" not found for audio player "${name}"`);
                return;
            }
            
            this.waveSurfer = WaveSurfer.create({
                container: this.container,
                waveColor: waveColor,
                progressColor: progressColor,
                height: 80,
                responsive: true,
            });
            this.waveSurfer.load(this.audioFile);
            this.button.textContent = this.playText;
            this.initEvents();
        }

        initEvents() {
            this.button.addEventListener('click', () => {
                pauseAllExcept(this);
                this.togglePlay();
            });

            this.waveSurfer.on('finish', () => {
                this.button.textContent = this.playText;
            });

            this.waveSurfer.on('error', (e) => {
                console.error(`WaveSurfer.js Error (${this.name}):`, e);
            });
        }

        togglePlay() {
            if (this.waveSurfer.isPlaying()) {
                this.waveSurfer.pause();
                this.button.textContent = this.playText;
            } else {
                this.waveSurfer.play();
                this.button.textContent = this.pauseText;
            }
        }

        pause() {
            if (this.waveSurfer.isPlaying()) {
                this.waveSurfer.pause();
                this.button.textContent = this.playText;
            }
        }
    }

    const buttons = [];

    // Function to pause all other waveforms
    function pauseAllExcept(currentButton) {
        buttons.forEach((button) => {
            if (button !== currentButton) {
                button.pause();
            }
        });
    }

    // Define button configurations
    const buttonConfigs = [
        {
            name: 'Rock Highlights',
            pauseText: 'Pause Rock Highlights',
            playText: 'Play Rock Highlights',
            audioFile: '/audio/dark_audio.mp3',
            container: '#waveform1',
            buttonId: 'playPauseButton1',
            waveColor: 'rgb(58,58,58)',
            progressColor: 'rgb(21,45,163)',
            buttonColor: 'rgb(21,45,163)',
        },
        {
            name: 'Softer Vibes',
            pauseText: 'Pause Softer Vibes',
            playText: 'Listen to Softer Vibes',
            audioFile: '/audio/softmix.mp3',
            container: '#waveform2',
            buttonId: 'playPauseButton2',
            waveColor: 'rgb(58,58,58)',
            progressColor: 'rgb(51,153,204)',
            buttonColor: 'rgb(51,153,204)',
        },
        {
            name: 'Sound Healing',
            pauseText: 'Pause Sound Healing',
            playText: 'Experience Sound Healing: Chakra C-Toning',
            audioFile: '/audio/c-toning.m4a',
            container: '#waveform',
            buttonId: 'playPauseButton', // Match the HTML ID
            waveColor: 'rgba(0, 51, 102, 0.4)',
            progressColor: 'rgba(0, 197, 215, 0.7)',
            buttonColor: 'rgba(0, 51, 102, 0.8)',
        }
    ];

    // Only create buttons that exist on the page
    buttonConfigs.forEach(config => {
        if (document.getElementById(config.buttonId) && document.querySelector(config.container)) {
            buttons.push(new AudioButton(config));
        }
    });
});