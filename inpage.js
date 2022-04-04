function log() { console.log("[%cAET%cto%cGIF%c]", "color: lime", "color: auto", "color: red", "color: auto", ...arguments) }
function addListener(name, callback) {
    document.addEventListener(name, callback);
}
function dispatch(name, detail) {
    document.dispatchEvent(new CustomEvent(name, { detail }));
}

function changeStatus(text) { dispatch('statusChanged', text) }

function getImageFromCanvas(canvas) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = e => reject(e);
        img.src = canvas.toDataURL();
    });
}

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

var workerScriptURL = '';
var selectedWidgetID = 'cg';

class RecordingThing {
    constructor(widget, fps, duration, delay, quality, startRightAway) {
        if (!widget) throw new Error('Widget was not specified!');
        this.widget = widget;
        this.fps = fps ?? 15;
        if (!duration) throw new Error('Duration was not specified!');
        this.duration = duration;
        this.delay = delay ?? 0;
        this.quality = quality ?? 30;

        this._frameCount = Math.floor((duration / (1 / fps)));
        this._currentFrame;
        this._gif;
        this.prepare();
        if (startRightAway) this.record();
    }

    setFPS(newFPS) {
        this.fps = newFPS;
        this._frameCount = Math.floor((this.duration / (1 / this.fps)));
    }

    setDuration(newDuration) {
        this.duration = newDuration;
        this._frameCount = Math.floor((this.duration / (1 / this.fps)));
    }

    setDelay(newDelay) { this.delay = newDelay }

    setQuality(newQuality) { this.quality = newQuality }

    _reset() {
        this._currentFrame = 0;
        this._gif = new GIF({
            workers: 10,
            quality: this.quality,
            workerScript: workerScriptURL
        });
        log("[RecordingThing] Reset", this._gif);
    }

    prepare() {
        this.widget.pause();
        this.widget.load();
        log("[RecordingThing] Prepared");
        changeStatus('Prepared.');
    }

    _advance(delta) {
        this.widget.state.update(delta);
        this.widget.render();
    }

    record() {
        this._reset();
        log("[RecordingThing] Advancing will be done with delta of " + `${Math.round(1 / this.fps * 10000) / 10}ms` + ". Delay is", this.delay);
        (async () => {
            for (var i = 0; i < this._frameCount; i++) {
                log("[RecordingThing] Frame", i + 1, "/", this._frameCount);
                changeStatus(`Recording Frame: ${i + 1} / ${this._frameCount}`);

                if (i > 0) this._advance(1 / this.fps);
                else this._advance(this.delay);
                const img = await getImageFromCanvas(this.widget.canvas);
                this._gif.addFrame(img, { delay: 1 / this.fps * 1000 });

                await wait(100);
            }
            this.render();
        })();
    }

    render() {
        log("[RecordingThing] Exporting...");
        changeStatus('Exporting...');
        this._gif.on('finished', blob => {
            let url = URL.createObjectURL(blob);
            log("[RecordingThing] Exported to", url);
            changeStatus('Exported to a new tab.')
            window.open(url);
        });
        this._gif.on('progress', prog => {
            const percentage = (Math.round(prog * 100 * 100) / 100) + '%';
            log("[RecordingThing] Render Progress:", percentage);
            changeStatus('Rendering: ' + percentage);
        })
        this._gif.render();
    }
}
var recordingThing;

function getWidgetByID(id) {
    if (id === 'cg') return spinewidgetcg;
    if (id === 'chibi') return spinewidget;
}

addListener('prepareATG', e => {
    const widget = getWidgetByID(selectedWidgetID);
    if (!widget) {
        alert('Open a Spine Widget (CG widget or Chibi widget) first!');
        return;
    }
    // New animations
    const newArray = widget.state.tracks.map(val => 
        ({
            name: val.animation.name,
            duration: val.animation.duration
        })
    );
    dispatch('animationsChanged', JSON.stringify(newArray));

    recordingThing = new RecordingThing(widget, 15, widget.state.tracks[0].animation.duration);
});

addListener('record', e => {
    if (!recordingThing) {
        alert('Prepare the Spine Widget first!');
        return;
    }
    const params = JSON.parse(e.detail);
    recordingThing.setDuration(params.duration);
    recordingThing.setFPS(params.fps);
    recordingThing.setDelay(params.delay);
    recordingThing.setQuality(params.quality);
    recordingThing.record();
});

addListener('workerLoaded', e => {
    var workerText = e.detail;
    let blob = new Blob([workerText], { type: 'text/javascript' });
    workerScriptURL = URL.createObjectURL(blob);
    // workerScriptURL = "data:text/javascript," + e.detail;
    log("GIF.js Worker Script is loaded! Worker Script Data URL:", workerScriptURL);
});

addListener('widgetChange', e => {
    const wID = e.detail;
    selectedWidgetID = wID;
    if (wID === 'cg') {
        log('Changed Spine Widget to CG');
        changeStatus('Changed Spine Widget to CG.');
    }
    else if (wID === 'chibi') {
        log('Changed Spine Widget to Chibi');
        changeStatus('Changed Spine Widget to Chibi.');
    }
    else {
        selectedWidgetID = 'cg';
        throw new Error('Spine Widget ID is invalid! Changing to CG Spine Widget');
    }
});

document.querySelectorAll('#Chibi-Next, #Chibi-Prev').forEach(el => {
    el.addEventListener('click', () => {
        if (selectedWidgetID === 'chibi') {
            const newArray = spinewidget.state.tracks.map(val => 
                ({
                    name: val.animation.name,
                    duration: val.animation.duration
                })
            );
            dispatch('animationsChanged', JSON.stringify(newArray));
        }
    })
})

dispatch("inpageReady");