/**
 * Player component with methods
 * @constructor {buffer, duration, tracks, photo}
 * @param {audioObject} object w/ {artist, track, url, photo, commentArrayWithObjects{time, comment}}
 */

class Player {
    constructor() {
        this.buffer = null,
            this.duration = 0,
            this.tracks = {
                artist: "Bryce Vince",
                song: "Drew Barrymore",
                url: "./shape_of_you.mp3",
                album_image: '/.album_art.jpg',
                comments: [
                    {
                        time: 10,
                        comment: 'i like this part'
                    },
                    {
                        time: 20,
                        comment: 'soooo true!'
                    },
                    {
                        time: 30,
                        comment: 'good job PAUL!'
                    },
                    {
                        time: 35,
                        comment: 'thanks paul!'
                    }
                ]
            }
        this.photo = this.tracks.album_image
        this.comments = this.tracks.comments
    }

    init() {
        // declare audiocontext on web browser, create nodes, connect nodes
        window.AudioContext = window.AudioContext || window.webkitAudioContext;
        this.context = new AudioContext();
        this.context.suspend && this.context.suspend();
        this.firstLaunch = true;
        try {
            // create and connect node for processing audio
            this.javascriptNode = this.context.createScriptProcessor(2048, 1, 1);
            this.javascriptNode.connect(this.context.destination);

            // create and connect node for visualizer of audio
            this.analyser = this.context.createAnalyser();
            this.analyser.connect(this.javascriptNode);
            this.analyser.smoothingTimeConstant = 0.6;
            // Fast Fourier Transform (use to determine frequency domain)
            this.analyser.fftSize = 2048;

            this.source = this.context.createBufferSource();
            this.destination = this.context.destination;
            this.loadTrack();

            // create and connect node for volume control
            this.gainNode = this.context.createGain();
            this.source.connect(this.gainNode);
            this.gainNode.connect(this.analyser);
            this.gainNode.connect(this.destination);

            this.initHandlers();
        } catch (e) {
            framer.setLoadingPercent(1);
        }
        framer.setLoadingPercent(1);
        scene.init();
    }

    loadTrack() {
        var that = this;
        // create XMLHttpRequest to exchange data with url without reload
        var request = new XMLHttpRequest();

        var track = this.tracks;
        document.querySelector('.song .artist').textContent = track.artist;
        document.querySelector('.song .name').textContent = track.song;

        // using XMLhttpRequest to GET, mp3 file, async
        request.open('GET', track.url, true);
        request.responseType = 'arraybuffer';

        // if request successful, decode audio data from response and apply buffer object
        request.onload = function () {
            that.context.decodeAudioData(request.response, function (buffer) {
                that.source.buffer = buffer;
            });
        };

        request.send();
    }

    play() {
        this.context.resume && this.context.resume();
        if (this.firstLaunch) {
            this.source.start();
            this.firstLaunch = false;
        }
        this.displayComment(this.tracks.comments[0])
    }

    pause() {
        this.context.suspend();
    }

    mute() {
        this.gainNode.gain.value = 0;
    }

    unmute() {
        this.gainNode.gain.value = 1;
    }

    displayComment(comments) {
        let commentContainer = document.createElement('div');

        let timeDiv = document.createElement("div");
        let timeString = document.createTextNode(comments.time);
        timeDiv.appendChild(timeString);

        let commentDiv = document.createElement("div");
        let commentString = document.createTextNode(comments.comment);
        commentDiv.appendChild(commentString);

        commentContainer.appendChild(timeDiv);
        commentContainer.appendChild(commentDiv);

        document.querySelector('.comments-container').appendChild(commentContainer);
    }

    // for react
    componentDidMount() {
        for (var i = 0; i < this.tracks.comments.length; i++) {
            if (this.context.currentTime === this.tracks.comments.time) {
                this.displayComment(this.tracks.comments[i])
            } else {
                console.log("mismatched time");
            }
        }
    }

    initHandlers() {
        var that = this;

        // assign framer's frequencyData to a 8 index object array using analyser's frequencyBitCount
        this.javascriptNode.onaudioprocess = function () {
            framer.frequencyData = new Uint8Array(that.analyser.frequencyBinCount);
            // copies current frequency data into framers's frequencyData (Uint8Array passed in)
            that.analyser.getByteFrequencyData(framer.frequencyData);
        };
    }
};

/**
 * Framer is the class that controls the visual display using WebAudio API
 * @constructor {countTicks, frequencyData, tickSize, PI, index, loadingAngle}
 * @param {none}
 */


class Framer {
    constructor() {
        this.countTicks = 360,
            this.frequencyData = [],
            this.tickSize = 10,
            this.PI = 360,
            this.index = 0,
            this.loadingAngle = 0
    }

    init(scene) {
        this.canvas = document.querySelector('canvas');
        this.scene = scene;
        this.context = scene.context;
        this.configure();
    }

    configure() {
        this.maxTickSize = this.tickSize * 9 * this.scene.scaleCoef;
        this.countTicks = 360 * scene.scaleCoef;
    }

    draw() {
        this.drawTicks();
        this.drawEdging();
    }

    drawTicks() {
        this.context.save();
        this.context.beginPath();
        this.context.lineWidth = 1;
        this.ticks = this.getTicks(this.countTicks, this.tickSize, [0, 90]);
        for (var i = 0, len = this.ticks.length; i < len; ++i) {
            var tick = this.ticks[i];
            this.drawTick(tick.x1, tick.y1, tick.x2, tick.y2);
        }
        this.context.restore();
    }

    drawTick(x1, y1, x2, y2) {
        var dx1 = parseInt(this.scene.cx + x1);
        var dy1 = parseInt(this.scene.cy + y1);

        var dx2 = parseInt(this.scene.cx + x2);
        var dy2 = parseInt(this.scene.cy + y2);

        var gradient = this.context.createLinearGradient(dx1, dy1, dx2, dy2);
        gradient.addColorStop(0, '#FE4365');
        gradient.addColorStop(0.6, '#FE4365');
        gradient.addColorStop(1, '#F5F5F5');
        this.context.beginPath();
        this.context.strokeStyle = gradient;
        this.context.lineWidth = 2;
        this.context.moveTo(this.scene.cx + x1, this.scene.cx + y1);
        this.context.lineTo(this.scene.cx + x2, this.scene.cx + y2);
        this.context.stroke();
    }

    setLoadingPercent(percent) {
        this.loadingAngle = percent * 2 * Math.PI;
    }

    drawEdging() {
        this.context.save();
        this.context.beginPath();
        this.context.strokeStyle = 'rgba(254, 67, 101, 0.5)';
        this.context.lineWidth = 1;

        var offset = tracker.lineWidth / 2;
        this.context.moveTo(this.scene.padding + 2 * this.scene.radius - tracker.innerDelta - offset, this.scene.padding + this.scene.radius);
        this.context.arc(this.scene.cx, this.scene.cy, this.scene.radius - tracker.innerDelta - offset, 0, this.loadingAngle, false);

        this.context.stroke();
        this.context.restore();
    }

    getTicks(count, size, animationParams) {
        size = 10;
        var ticks = this.getTickPoints(count);
        var x1, y1, x2, y2, m = [], tick, k;
        var lesser = 160;
        var allScales = [];
        for (var i = 0, len = ticks.length; i < len; ++i) {
            var coef = 1 - i / (len * 2.5);
            var delta = ((this.frequencyData[i] || 0) - lesser * coef) * this.scene.scaleCoef;
            if (delta < 0) {
                delta = 0;
            }
            tick = ticks[i];
            if (animationParams[0] <= tick.angle && tick.angle <= animationParams[1]) {
                k = this.scene.radius / (this.scene.radius - this.getSize(tick.angle, animationParams[0], animationParams[1]) - delta);
            } else {
                k = this.scene.radius / (this.scene.radius - (size + delta));
            }
            x1 = tick.x * (this.scene.radius - size);
            y1 = tick.y * (this.scene.radius - size);
            x2 = x1 * k;
            y2 = y1 * k;
            m.push({ x1: x1, y1: y1, x2: x2, y2: y2 });
            if (i < 20) {
                var scale = delta / 50;
                scale = scale < 1 ? 1 : scale;
                allScales.push(scale);
            }
        }
        var sum = allScales.reduce(function (pv, cv) { return pv + cv; }, 0) / allScales.length;
        this.canvas.style.transform = 'scale(' + sum + ')';
        return m;
    }

    getSize(angle, l, r) {
        var m = (r - l) / 2;
        var x = (angle - l);
        var h;

        if (x == m) {
            return this.maxTickSize;
        }
        var d = Math.abs(m - x);
        var v = 70 * Math.sqrt(1 / d);
        if (v > this.maxTickSize) {
            h = this.maxTickSize - d;
        } else {
            h = Math.max(this.tickSize, v);
        }

        if (this.index > this.count) {
            this.index = 0;
        }

        return h;
    }

    getTickPoints(count) {
        var coords = [], step = this.PI / count;
        for (var deg = 0; deg < this.PI; deg += step) {
            var rad = deg * Math.PI / (this.PI / 2);
            coords.push({ x: Math.cos(rad), y: -Math.sin(rad), angle: deg });
        }
        return coords;
    }
}

/**
 * Tracker is the tracker for the audio's progress bar
 * @constructor {innerDelta, lineWidth, prevAngle, angle, animationCount, pressButton}
 * @param {none}
 */

class Tracker {
    constructor() {
        this.innerDelta = 20,
            this.lineWidth = 7,
            this.prevAngle = 0.5,
            this.angle = 0,
            this.animationCount = 10,
            this.pressButton = false
    }

    init(scene) {
        this.scene = scene;
        this.context = scene.context;
        this.initHandlers();
    }

    initHandlers() {
        var that = this;

        this.scene.canvas.addEventListener('mousedown', function (e) {
            if (that.isInsideOfSmallCircle(e) || that.isOusideOfBigCircle(e)) {
                return;
            }
            that.prevAngle = that.angle;
            that.pressButton = true;
            that.stopAnimation();
            that.calculateAngle(e, true);
        });

        window.addEventListener('mouseup', function () {
            if (!that.pressButton) {
                return;
            }
            var id = setInterval(function () {
                if (!that.animatedInProgress) {
                    that.pressButton = false;
                    player.context.currentTime = that.angle / (2 * Math.PI) * player.source.buffer.duration;
                    clearInterval(id);
                }
            }, 100);
        });

        window.addEventListener('mousemove', function (e) {
            if (that.animatedInProgress) {
                return;
            }
            if (that.pressButton && that.scene.inProcess()) {
                that.calculateAngle(e);
            }
        });
    }

    isInsideOfSmallCircle(e) {
        var x = Math.abs(e.pageX - this.scene.cx - this.scene.coord.left);
        var y = Math.abs(e.pageY - this.scene.cy - this.scene.coord.top);
        return Math.sqrt(x * x + y * y) < this.scene.radius - 3 * this.innerDelta;
    }

    isOusideOfBigCircle(e) {
        return Math.abs(e.pageX - this.scene.cx - this.scene.coord.left) > this.scene.radius ||
            Math.abs(e.pageY - this.scene.cy - this.scene.coord.top) > this.scene.radius;
    }

    draw() {
        if (!player.source.buffer) {
            return;
        }
        if (!this.pressButton) {
            this.angle = player.context.currentTime / player.source.buffer.duration * 2 * Math.PI || 0;
        }
        this.drawArc();
    }

    drawArc() {
        this.context.save();
        this.context.strokeStyle = 'rgba(254, 67, 101, 0.8)';
        this.context.beginPath();
        this.context.lineWidth = this.lineWidth;

        this.r = this.scene.radius - (this.innerDelta + this.lineWidth / 2);
        this.context.arc(
            this.scene.radius + this.scene.padding,
            this.scene.radius + this.scene.padding,
            this.r, 0, this.angle, false
        );
        this.context.stroke();
        this.context.restore();
    }

    calculateAngle(e, animatedInProgress) {
        this.animatedInProgress = animatedInProgress;
        this.mx = e.pageX;
        this.my = e.pageY;
        this.angle = Math.atan((this.my - this.scene.cy - this.scene.coord.top) / (this.mx - this.scene.cx - this.scene.coord.left));
        if (this.mx < this.scene.cx + this.scene.coord.left) {
            this.angle = Math.PI + this.angle;
        }
        if (this.angle < 0) {
            this.angle += 2 * Math.PI;
        }
        if (animatedInProgress) {
            this.startAnimation();
        } else {
            this.prevAngle = this.angle;
        }
    }

    startAnimation() {
        var that = this;
        var angle = this.angle;
        var l = Math.abs(this.angle) - Math.abs(this.prevAngle);
        var step = l / this.animationCount, i = 0;
        var f = function () {
            that.angle += step;
            if (++i == that.animationCount) {
                that.angle = angle;
                that.prevAngle = angle;
                that.animatedInProgress = false;
            } else {
                that.animateId = setTimeout(f, 20);
            }
        };

        this.angle = this.prevAngle;
        this.animateId = setTimeout(f, 20);
    }

    stopAnimation() {
        clearTimeout(this.animateId);
        this.animatedInProgress = false;
    }
}

/**
 * Scene displays everything on screen and controls the renders the animination
 * @constructor {padding, minSize, optimiseHeight, _inProcess}
 * @param {none}
 */

class Scene {
    constructor() {
        this.padding = 120,
            this.minSize = 740,
            this.optimiseHeight = 982,
            this._inProcess = false
    }

    init() {
        this.canvasConfigure();
        this.initHandlers();

        framer.init(this);
        tracker.init(this);
        controls.init(this);

        this.startRender();
    }

    canvasConfigure() {
        this.canvas = document.querySelector('canvas');
        this.context = this.canvas.getContext('2d');
        this.context.strokeStyle = '#FE4365';
        this.calculateSize();
    }

    calculateSize() {
        this.scaleCoef = Math.max(0.5, 740 / this.optimiseHeight);

        var size = Math.max(this.minSize, 1/*document.body.clientHeight */);
        this.canvas.setAttribute('width', size);
        this.canvas.setAttribute('height', size);
        //this.canvas.style.marginTop = -size / 2 + 'px';
        //this.canvas.style.marginLeft = -size / 2 + 'px';

        this.width = size;
        this.height = size;

        this.radius = (size - this.padding * 2) / 2;
        this.cx = this.radius + this.padding;
        this.cy = this.radius + this.padding;
        this.coord = this.canvas.getBoundingClientRect();
    }

    initHandlers() {
        var that = this;
        window.onresize = function () {
            that.canvasConfigure();
            framer.configure();
            that.render();
        };
    }

    render() {
        var that = this;
        requestAnimationFrame(function () {
            that.clear();
            that.draw();
            if (that._inProcess) {
                that.render();
            }
        });
    }

    clear() {
        this.context.clearRect(0, 0, this.width, this.height);
    }

    draw() {
        framer.draw();
        tracker.draw();
        controls.draw();
    }

    startRender() {
        this._inProcess = true;
        this.render();
    }

    stopRender() {
        this._inProcess = false;
    }

    inProcess() {
        return this._inProcess;
    }
}

/**
 * Controls the controls interface
 * @constructor {playing}
 * @param {none}
 */

class Controls {
    constructor() {
        this.playing = false
    }

    init(scene) {
        this.scene = scene;
        this.context = scene.context;
        this.initHandlers();
        this.timeControl = document.querySelector('.time');
    }

    initHandlers() {
        this.initPlayButton();
        this.initPauseButton();
        this.initSoundButton();
        // this.initRewindButton();
        // this.initForwardButton();
        this.initTimeHandler();
    }

    initPlayButton() {
        var that = this;
        this.playButton = document.querySelector('.play');
        this.pauseButton = document.querySelector('.pause');
        this.playButton.addEventListener('mouseup', function () {
            that.playButton.style.display = 'none';
            that.pauseButton.style.display = 'inline-block';
            player.play();
            that.playing = true;
        });
    }

    initPauseButton() {
        var that = this;
        this.playButton = document.querySelector('.play');
        this.pauseButton = document.querySelector('.pause');
        this.pauseButton.addEventListener('mouseup', function () {
            that.pauseButton.style.display = 'none';
            that.playButton.style.display = 'inline-block';
            player.pause();
            that.playing = false;
        });
    }

    initSoundButton() {
        var that = this;
        this.soundButton = document.querySelector('.sound-controls');
        this.unmuteButton = document.querySelector('.unmute');
        this.muteButton = document.querySelector('.mute');

        this.unmuteButton.addEventListener('mouseup', () => {
            this.unmuteButton.style.display = 'none';
            this.muteButton.style.display = 'inline-block';
            player.mute();
        })

        this.muteButton.addEventListener('mouseup', () => {
            this.muteButton.style.display = 'none';
            this.unmuteButton.style.display = 'inline-block';
            player.unmute();
        })
    }

    initTimeHandler() {
        var that = this;
        setTimeout(function () {
            var rawTime = parseInt(player.context.currentTime || 0);
            var secondsInMin = 60;
            var min = parseInt(rawTime / secondsInMin);
            var seconds = rawTime - min * secondsInMin;
            if (min < 10) {
                min = '0' + min;
            }
            if (seconds < 10) {
                seconds = '0' + seconds;
            }
            var time = min + ':' + seconds;
            that.timeControl.textContent = time;
            that.initTimeHandler();
        }, 300);
    }

    draw() {
        this.drawPic();
    }

    drawPic() {
        this.context.save();
        this.context.beginPath();
        this.context.fillStyle = 'rgba(254, 67, 101, 0.85)';
        this.context.lineWidth = 1;
        var x = tracker.r / Math.sqrt(Math.pow(Math.tan(tracker.angle), 2) + 1);
        var y = Math.sqrt(tracker.r * tracker.r - x * x);
        if (this.getQuadrant() == 2) {
            x = -x;
        }
        if (this.getQuadrant() == 3) {
            x = -x;
            y = -y;
        }
        if (this.getQuadrant() == 4) {
            y = -y;
        }
        this.context.arc(this.scene.radius + this.scene.padding + x, this.scene.radius + this.scene.padding + y, 10, 0, Math.PI * 2, false);
        this.context.fill();
        this.context.restore();
    }

    getQuadrant() {
        if (0 <= tracker.angle && tracker.angle < Math.PI / 2) {
            return 1;
        }
        if (Math.PI / 2 <= tracker.angle && tracker.angle < Math.PI) {
            return 2;
        }
        if (Math.PI < tracker.angle && tracker.angle < Math.PI * 3 / 2) {
            return 3;
        }
        if (Math.PI * 3 / 2 <= tracker.angle && tracker.angle <= Math.PI * 2) {
            return 4;
        }
    }
}

var player = new Player();
var framer = new Framer();
var scene = new Scene();
var controls = new Controls();
var tracker = new Tracker();
player.init();
