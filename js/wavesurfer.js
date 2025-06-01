document.addEventListener('DOMContentLoaded', () => {
    class AudioButton {
        constructor({ name, pauseText, playText, audioFile, container, buttonId, waveColor, progressColor, buttonColor }) {
            this.name = name;
            this.pauseText = pauseText;
            this.playText = playText;
            this.audioFile = audioFile;
            this.container = container;
            this.button = document.getElementById(buttonId);
            this.button.style.backgroundColor = buttonColor;
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

    // Create instances of AudioButton
    buttons.push(
        new AudioButton({
            name: 'Rock Highlights',
            pauseText: 'Pause Rock Highlights',
            playText: 'Play Rock Highlights',
            audioFile: '/audio/dark_audio.mp3',
            container: '#waveform1',
            buttonId: 'playPauseButton1',
            waveColor: 'rgb(58,58,58)',
            progressColor: 'rgb(21,45,163)',
            buttonColor: 'rgb(21,45,163)',
        }),
        new AudioButton({
            name: 'Softer Vibes',
            pauseText: 'Pause Softer Vibes',
            playText: 'Listen to Softer Vibes',
            audioFile: '/audio/softmix.mp3',
            container: '#waveform2',
            buttonId: 'playPauseButton2',
            waveColor: 'rgb(58,58,58)',
            progressColor: 'rgb(51,153,204)',
            buttonColor: 'rgb(51,153,204)',
        })
    );
});
