const img_placeholder = document.querySelector('.img-section');
const imageInput = document.getElementById('imageInput');
const preImage = document.querySelectorAll('.pre-state');
const postImage = document.querySelector('.post-state');
const preCanvas = document.querySelector('#previewCanvas');
const jumble = document.querySelector('#jumble');
const reset = document.querySelector('#reset');
const nextBtn = document.querySelector('#next');
const prevBtn = document.querySelector('#prev');
const newImgBtn = document.getElementById('new_image');
const tip = document.querySelector('.tip');
let original_url = null;
let optimalSteps = null;
let userSteps = 0;
const renderInfo = document.querySelectorAll('.render-section');
const renderL = document.querySelector('#render-l');
const renderR = document.querySelector('#render-r');
const org_img = document.querySelector('.original-state');
const curr_img = document.querySelector('.curr-state');

let solved = false;
let autoMode = false;

import { solve, reconstructPath } from "./a_star.js";

let originalTiles = null;
let intial_state = null;
const goal_state = [1,2,3,4,5,6,7,8,0];
const log_states = false;
let path = [];
let currState = 0;

img_placeholder.addEventListener('click', () => imageInput.click());

newImgBtn.addEventListener('click', () => {
    imageInput.value = "";
    imageInput.click();
});

imageInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    postImage.classList.add("hidden");
    postImage.classList.remove("grid");
    preCanvas.classList.add("hidden");
    preImage.forEach(x => x.classList.remove('hidden'));

    jumble.classList.add('disabled');
    // solve_button.classList.add('disabled');
    nextBtn.classList.add('disabled');
    prevBtn.classList.add('disabled');

    newImgBtn.classList.remove('hidden');

    currState = 0;
    path = [];
    originalTiles = null;

    const url = URL.createObjectURL(file);
    const imgEl = new Image();
    imgEl.src = url;
    original_url = url;

    imgEl.onload = () => {
        const show = () => {
            if (typeof cv === 'undefined') {
                setTimeout(show, 100);
                return;
            }
            const srcMat = cv.imread(imgEl);
            const TARGET = 399;
            const dsize = new cv.Size(TARGET, TARGET);
            const dstMat = new cv.Mat();
            cv.resize(srcMat, dstMat, dsize, 0, 0, cv.INTER_AREA);

            preImage.forEach(x => x.classList.add('hidden'));
            preCanvas.classList.remove('hidden');

            preCanvas.width = TARGET;
            preCanvas.height = TARGET;
            cv.imshow('previewCanvas', dstMat);

            srcMat.delete();
            dstMat.delete();
        };

        jumble.classList.remove('disabled');
        tip.classList.add('pre-jumble');
        tip.textContent = 'Once jumbled, you can use arrow keys to try and solve the puzzle :)';
        show();
    };
});

function inversionCount(arr) {
    let inv = 0;
    for (let i = 0; i < 9; i++) {
        for (let j = i + 1; j < 9; j++) {
            if (arr[i] !== 0 && arr[j] !== 0 && arr[i] > arr[j]) inv++;
        }
    }
    return inv;
}

function isSolvable(arr) {
    return inversionCount(arr) % 2 === 0;
}

function splitImageIntoTiles() {
    const src = cv.imread(preCanvas);
    
    // cv.imshow(org_img, src);
    org_img.setAttribute('src', original_url)
    
    const TILE = 3;
    const tileW = preCanvas.width / TILE;
    const tileH = preCanvas.height / TILE;
    const tileCanvases = Array.from(document.querySelectorAll(".post-state canvas"));

    if (!originalTiles) {
        originalTiles = [];
        for (let r = 0; r < TILE; r++) {
            for (let c = 0; c < TILE; c++) {
                const rect = new cv.Rect(c * tileW, r * tileH, tileW, tileH);
                let roi = src.roi(rect);
                cv.putText(roi, `${r * TILE + c + 1}`, new cv.Point(20, 20), cv.FONT_HERSHEY_SIMPLEX, 0.5, new cv.Scalar(0,255,0,255), 1);
                const tile = src.roi(rect).clone();
                originalTiles.push(tile);
            }
        }
    }

    originalTiles.splice(8,1);
    let blank = new cv.Mat(tileH, tileW, cv.CV_8UC3, new cv.Scalar(255,255,255,255));
    originalTiles.push(blank);

    let shuffle = null;
    while (true) {
        const candidate = [0,1,2,3,4,5,6,7,8].sort(() => Math.random() - 0.5);
        const mapped = candidate.map(x => x + 1 === 9 ? 0 : x + 1);
        if (isSolvable(mapped)) {
            shuffle = candidate;
            break;
        }
    }

    let temp_intial_state = [];
    const temp_tiles = originalTiles.slice();

    tileCanvases.forEach((canvas, i) => {
        canvas.width = tileW;
        canvas.height = tileH;
        cv.imshow(canvas, temp_tiles[shuffle[i]]);
        temp_intial_state.push(shuffle[i]);
    });

    const snapshotCanvas = document.createElement('canvas');
    snapshotCanvas.width = TILE * tileW;
    snapshotCanvas.height = TILE * tileH;

    const sctx = snapshotCanvas.getContext('2d');

    tileCanvases.forEach((tileCanvas, i) => {
        const x = (i % TILE) * tileW;
        const y = Math.floor(i / TILE) * tileH;
        sctx.drawImage(tileCanvas, x, y);
    });

    curr_img.src = snapshotCanvas.toDataURL('image/png');

    intial_state = [];
    for (let i = 0; i < 9; i++) {
        let s = temp_intial_state[i] + 1;
        s = s == 9 ? 0 : s;
        intial_state.push(s);
    }

    // cv.imshow(curr_img, src);
    renderInfo.forEach((e) => {
        e.classList.remove('hidden');
    })

    src.delete();
}

function renderState(state) {
    const tileCanvases = Array.from(document.querySelectorAll(".post-state canvas"));
    for (let i = 0; i < 9; i++) {
        const canvas = tileCanvases[i];
        const val = state[i];
        const tileIndex = val === 0 ? 8 : val - 1;
        cv.imshow(canvas, originalTiles[tileIndex]);
    }
}

function highlightChange(prevState, nextState) {
    const tileCanvases = Array.from(document.querySelectorAll(".post-state canvas"));
    for (let i = 0; i < 9; i++) tileCanvases[i].classList.remove("highlight");

    let movedIndex = -1;
    for (let i = 0; i < 9; i++) {
        if (prevState[i] !== nextState[i]) {
            movedIndex = i;
            break;
        }
    }

    if (movedIndex !== -1) {
        const el = tileCanvases[movedIndex];
        el.classList.add("highlight");
        setTimeout(() => el.classList.remove("highlight"), 180);
    }
}

function syncNavButtons() {
    prevBtn.classList.toggle("disabled", currState === 0);
    nextBtn.classList.toggle("disabled", currState === path.length - 1);
}

function goTo(index) {
    const prev = path[currState];
    currState = Math.max(0, Math.min(index, path.length - 1));
    const next = path[currState];
    renderState(next);
    highlightChange(prev, next);
    syncNavButtons();
}

function displayLogs() {
    const oldLog = renderL.querySelector('.log');
    if (oldLog) oldLog.remove();

    const log_algo = document.createElement('div');
    log_algo.className = 'log';
    log_algo.textContent = `This puzzle can be solved in ${optimalSteps - 1} steps`;
    renderL.appendChild(log_algo);
}

function displayLogs_user() {
    const oldLog_user = renderR.querySelector('.log_user');
    if (oldLog_user) oldLog_user.remove();

    const log_user = document.createElement('div');
    log_user.className = 'log_user';
    log_user.textContent = `No of steps taken by user: ${userSteps}`;
    renderR.appendChild(log_user); 
}


jumble.addEventListener("click", () => {
    if (jumble.classList.contains('disabled')) return;
    preCanvas.classList.add("hidden");
    postImage.classList.remove("hidden");
    postImage.classList.add("grid");
    document.querySelector('.img-section').classList.add("grid-active");
    void postImage.offsetHeight;
    // freeze original
    // original = 
    splitImageIntoTiles();
    
    // solve as soon as jumble is clicked
    const finalState = solve(intial_state, goal_state, log_states);
    path = reconstructPath(finalState);
    optimalSteps = path.length;
    currState = 0;
    goTo(0);

    displayLogs();

    nextBtn.classList.remove('disabled');
    
    // solve_button.classList.remove('disabled');

    tip.classList.remove('pre-jumble');
    tip.textContent = 'try solving the puzzle using arrow keys\n& if you get stuck, just reset and solve using next :)';
    
    // else{
    //     tip.textContent = 'Once jumbled, you can use arrow keys to try and solve the puzzle :)'
    // }
    solved = false;
    autoMode = false;
});

// solve_button.addEventListener("click", () => {
//     if (solve_button.classList.contains('disabled')) return;
//     jumble.classList.add('disabled');
    
// });

reset.addEventListener("click", () => {
    if (reset.classList.contains('disabled')) return;
    nextBtn.classList.remove('disabled');
    userSteps = 0;
    const oldLog_user = renderR.querySelector('.log_user');
    if (oldLog_user) oldLog_user.remove();
    goTo(0);
    solved = false;
    autoMode = false;
})

nextBtn.addEventListener("click", () => {
    if (nextBtn.classList.contains("disabled")) return;
    autoMode = true;
    goTo(currState + 1);
});

prevBtn.addEventListener("click", () => {
    if (prevBtn.classList.contains("disabled")) return;
    autoMode = true;
    goTo(currState - 1);
});

function onOpenCvReady() {
    console.log('cv loaded');
}

// wasd
document.addEventListener("keydown", (e) => {
    if (solved || autoMode) return;
    if (!intial_state) return;

    const keyMap = {
        ArrowUp: "ArrowUp",
        ArrowDown: "ArrowDown",
        ArrowLeft: "ArrowLeft",
        ArrowRight: "ArrowRight",

        w: "ArrowUp",
        W: "ArrowUp",
        s: "ArrowDown",
        S: "ArrowDown",
        a: "ArrowLeft",
        A: "ArrowLeft",
        d: "ArrowRight",
        D: "ArrowRight",
    };

    const mappedKey = keyMap[e.key];
    if (!mappedKey) return;

    moveBlank(mappedKey);
});

function isGoalState(state) {
    return state.every((val, i) => val === goal_state[i]);
}

function computeScore(userSteps, optimalSteps) {
    return userSteps <= optimalSteps ? 100 : Math.round(100 * optimalSteps / userSteps);
}


function moveBlank(key) {
    if(solved || autoMode) return;
    reset.classList.remove('disabled');
    nextBtn.classList.add('disabled');
    let state = [...intial_state];

    const idx = state.indexOf(0);
    const r = Math.floor(idx / 3);
    const c = idx % 3;

    let swapWith = -1;

    if (key === "ArrowUp" && r < 2) swapWith = idx + 3; 
    if (key === "ArrowDown" && r > 0) swapWith = idx - 3; 
    if (key === "ArrowLeft" && c < 2) swapWith = idx + 1; 
    if (key === "ArrowRight" && c > 0) swapWith = idx - 1; 

    if (swapWith === -1) return;
    
    userSteps += 1;
    displayLogs_user(userSteps);

    [state[idx], state[swapWith]] = [state[swapWith], state[idx]];

    intial_state = state;
    renderState(state);

    if(isGoalState(intial_state)){
        const oldLog_user = renderR.querySelector('.log_user');
        if (oldLog_user) oldLog_user.remove();

        const log_user = document.createElement('div');
        log_user.className = 'log_user';
        const userScore = computeScore(userSteps, optimalSteps);
        log_user.textContent = `Congrats!!\nYou completed puzzle in ${userSteps} steps.\nYour Score is ${userScore}`;
        renderR.appendChild(log_user);
        tip.textContent = 'Reset and navigate optimal solution';
        solved = true;
    }
}
