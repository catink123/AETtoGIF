function log() { console.log("[%cAET%cto%cGIF%c]", "color: lime", "color: auto", "color: red", "color: auto", ...arguments) }
function dispatch(name, detail) {
    document.dispatchEvent(new CustomEvent(name, { detail }));
}
function toInt(str) {
    return new Promise((resolve, reject) => {
        const number = parseInt(str);
        if (!isNaN(number)) resolve(number);
        else reject('Number is NaN!');
    });
}
function addListener(name, callback) {
    document.addEventListener(name, callback);
}
function loadScriptInPage(url) {
    const s = document.createElement('script');
    s.onload = function () {
        this.remove();
    };
    s.src = chrome.runtime.getURL(url);
    (document.head || document.documentElement).appendChild(s);
}
function loadWorkerScriptInPage(url) {
    let req = new XMLHttpRequest();
    req.open("GET", chrome.runtime.getURL(url));
    req.onload = () => {
        dispatch("workerLoaded", req.response);
    };
    req.send();
}

// Add inpage.js
addListener('inpageReady', () => {
    log("In-Page script is loaded!");
    loadWorkerScriptInPage('lib/gif.worker.js');
});
loadScriptInPage('inpage.js');
// Add gif.js
loadScriptInPage('lib/gif.js');

// Log that the extension is loaded into the page
log("Loaded!");
// Variables
var fps = 15;
var quality = 30;
// Toolbar
const tbCont = document.createElement("div");
tbCont.className = "toolbar";

const title = document.createElement("p"); title.innerText = 'AETtoGIF';
title.className = 'title';
tbCont.appendChild(title);

const buttons = [
    {
        label: 'Prepare',
        click() { dispatch('prepareATG') }
    },
    {
        label: 'Record',
        click() {
            const { duration } = getAnimation(animSelect.value);
            const delay = getAnimationDelay(animSelect.value);
            dispatch('record', JSON.stringify({ fps, duration, delay, quality }));
        }
    }
];

// Utils for DOM
function addButton(label, onclickListener, id) {
    const buttonEl = document.createElement("button");
    buttonEl.innerText = label;
    buttonEl.onclick = onclickListener;
    if (id) buttonEl.id = id;
    tbCont.appendChild(buttonEl);
    return buttonEl;
}

function addTextInput(labelText, width) {
    var label = document.createElement("label");
    var input = document.createElement("input");
    if (width) input.style.width = width;
    label.innerText = labelText;
    label.appendChild(input);
    tbCont.appendChild(label);
    return input;
}

function addSelect(labelText, options) {
    var label = document.createElement("label");
    var select = document.createElement("select");
    for (const option of options) {
        addOptionToSelect(select, option);
    }
    label.innerText = labelText;
    label.appendChild(select);
    tbCont.appendChild(label);
    return select;
}
function addOptionToSelect(selectEl, option) {
    const optEl = document.createElement("option");
    optEl.innerText = option.label;
    optEl.value = option.value;
    selectEl.appendChild(optEl);
}

function addDivider() {
    const div = document.createElement("span");
    div.className = 'divider';
    tbCont.appendChild(div);
}

const helpText =
    `Choose a Spine Widget to capture and click on 'Prepare' to prepare the widget for recording.
Then, choose your settings and click on 'Record' to start recording.
Recording requires a pretty beefy computer to render the GIF fast.
Every time you want to re-record any of the animations, prepare the widget first.

Made by Catink123 (@catink123 on any platform).
GIF.js library by jnordberg on GitHub.`;
addButton('Help', () => alert(helpText), 'help')

addDivider();

const widgetSelect = addSelect('Spine Widget: ', [
    { label: 'CG', value: 'cg' },
    { label: 'Chibi', value: 'chibi' }
]);
widgetSelect.addEventListener("change", e => {
    dispatch('widgetChange', e.target.value);
})

addButton(buttons[0].label, buttons[0].click, 'prepare');

addDivider();

const fpsInput = addTextInput('FPS: ', '30px');
fpsInput.value = fps;
fpsInput.addEventListener("change", e => {
    toInt(e.target.value).then(val => {
        fps = val;
        log('Quality changed to', val);
    }).catch(reason => {
        fps = 15;
        e.target.value = '15';
        throw new Error('FPS value is invalid! Reason:', reason, 'Defaulting to 15');
    });
});

var animations = [];
const getAnimation = name => animations.find(val => val.name === name);
const getAnimationDelay = name => {
    let delay = 0;
    const index = animations.findIndex(val => val.name === name);
    animations.slice(0, index).forEach(val => delay += val.duration);
    return delay;
};
const animSelect = addSelect('Animation: ', []);
addListener('animationsChanged', e => {
    animations = JSON.parse(e.detail);
    animSelect.replaceChildren('');
    animations.forEach(val => addOptionToSelect(animSelect, { label: val.name, value: val.name }));
});
animSelect.addEventListener('change', e => {
    log('Selected Animation:', getAnimation(e.target.value));
});

const qualityInput = addTextInput('Quality: ', '40px');
qualityInput.value = quality.toString();
qualityInput.addEventListener('change', e => {
    toInt(e.target.value).then(val => {
        quality = val;
        log('Quality changed to', val);
    }).catch(reason => {
        quality = 30;
        e.target.value = '30';
        throw new Error('Quality value is invalid! Reason:', reason, 'Defaulting to 30');
    });
})

addButton(buttons[1].label, buttons[1].click, 'record');

addDivider();

const statusEl = document.createElement("p");
statusEl.innerText = "Status: Idle.";
tbCont.appendChild(statusEl);
addListener('statusChanged', e => {
    statusEl.innerText = "Status: " + e.detail;
});

document.body.appendChild(tbCont);