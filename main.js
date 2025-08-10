let adapter;
let device;
let presentationFormat;

async function loadWGSLShader(f) {
    let response = await fetch("shaders/" + f);
    return await response.text();
}

async function loadHexPallete(f) {
    let response = await fetch("palletes/" + f);
    let hex = (await response.text()).split("\n");
    let size = hex.length - 1;
    const a = new Float32Array(size * 4);
    for (let i = 0; i < size; i++) {
        let c = hex[i].split("");
        let cList = [];
        for (let j = 0; j < 6; j += 2) {
            let v = parseInt(c[j] + c[j + 1], 16);
            cList.push(v / 255);
        }
        a.set(cList, i * 4);
    }
    return a;
}

async function setupGPU() {
    adapter = await navigator.gpu?.requestAdapter();
    if (!adapter) {
        alert("GPU does not support WebGPU");
        return false;
    }
    device = await adapter?.requestDevice();
    if (!device) {
        alert("Browser does not support WebGPU");
        return false;
    }
    presentationFormat = navigator.gpu.getPreferredCanvasFormat();
    return true;
}

async function init() {
    let p = await loadHexPallete("ufo-50.hex");
    console.log(p);
}

init();