const renderCanvas = document.getElementById("renderCanvas");
renderCanvas.width = window.innerWidth;
renderCanvas.height = window.innerHeight;
const ctx = renderCanvas.getContext("webgpu");
let canvasTexture;

let adapter;
let device;
let presentationFormat;

let renderModule;
let renderPipeline;
let renderPassDescriptor;

let vertexBuffer;
let indexBuffer;
let sceneBuffer;
let palleteBuffer;
let bindGroup;
let bindGroupLayout;

let cube;
let pallete;

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
    ctx.configure({
        device,
        format: presentationFormat
    });
    canvasTexture = ctx.getCurrentTexture();
    return true;
}

async function init() {
    await setupGPU();
    pallete = await loadHexPallete("ufo-50.hex");
    let loader = new MeshLoader();
    await loader.parseObjFile("cube.obj");
    cube = loader.getMesh();

    createBuffers();

    let shader = await loadWGSLShader("main.wgsl");
    createRenderPipeline(shader);

    requestAnimationFrame(draw);
}

function draw(currentTime) {
    const r = mat4.rotation([0, 1, 0], utils.degToRad(currentTime) * 0.05);
    device.queue.writeBuffer(sceneBuffer, 64, r);

    renderPassDescriptor.colorAttachments[0].view = ctx.getCurrentTexture().createView();
    const encoder = device.createCommandEncoder({ label: "encoder" });

    const renderPass = encoder.beginRenderPass(renderPassDescriptor);
    renderPass.setPipeline(renderPipeline);
    renderPass.setVertexBuffer(0, vertexBuffer);
    renderPass.setIndexBuffer(indexBuffer, "uint32");
    renderPass.setBindGroup(0, bindGroup);
    renderPass.drawIndexed(cube.indexCount);
    renderPass.end();

    commandBuffer = encoder.finish();
    device.queue.submit([commandBuffer]);

    requestAnimationFrame(draw);
}

function createBuffers() {
    vertexBuffer = device.createBuffer({
        size: cube.vertices.byteLength,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
    });
    device.queue.writeBuffer(vertexBuffer, 0, cube.vertices);
    indexBuffer = device.createBuffer({
        size: cube.indices.byteLength,
        usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST
    });
    device.queue.writeBuffer(indexBuffer, 0, cube.indices);

    const camera = new Camera(canvasTexture.width / canvasTexture.height);
    camera.position = [0, 2, 5];
    camera.lookTo = [0, -1, -2];
    camera.updateLookAt();
    sceneBuffer = device.createBuffer({
        size: 128,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    });
    device.queue.writeBuffer(sceneBuffer, 0, camera.viewProjectionMatrix);

    palleteBuffer = device.createBuffer({
        size: pallete.byteLength,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    });
    device.queue.writeBuffer(palleteBuffer, 0, pallete);

    bindGroupLayout = device.createBindGroupLayout({
        entries: [{
            binding: 0,
            visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
            buffer: { type: "uniform" }
        }, {
            binding: 1,
            visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
            buffer: { type: "uniform" }
        }]
    });

    bindGroup = device.createBindGroup({
        layout: bindGroupLayout,
        entries: [
            { binding: 0, resource: { buffer: sceneBuffer } },
            { binding: 1, resource: { buffer: palleteBuffer} }
        ]
    });
}

function createRenderPipeline(shader) {
    renderModule = device.createShaderModule({
        code: shader
    });

    const renderPipelineLayout = device.createPipelineLayout({
        bindGroupLayouts: [
            bindGroupLayout
        ]
    });

    const depthTexture = device.createTexture({
        size: [canvasTexture.width, canvasTexture.height],
        format: "depth24plus",
        usage: GPUTextureUsage.RENDER_ATTACHMENT,
    });

    renderPipeline = device.createRenderPipeline({
        label: "render pipeline",
        layout: renderPipelineLayout,
        vertex: {
            entryPoint: "vs",
            buffers: [{
                arrayStride: 32,
                attributes: [
                    { shaderLocation: 0, offset: 0, format: "float32x3" },
                    { shaderLocation: 1, offset: 12, format: "float32x2" },
                    { shaderLocation: 2, offset: 20, format: "float32x3" }
                ]
            }],
            module: renderModule
        },
        fragment: {
            entryPoint: "fs",
            module: renderModule,
            targets: [{ format: presentationFormat }]
        },
        primitive: {
            cullMode: "back"
        },
        depthStencil: {
            depthWriteEnabled: true,
            depthCompare: 'less',
            format: 'depth24plus'
        }
    });

    renderPassDescriptor = {
        label: "render pass",
        colorAttachments: [{
            view: canvasTexture.createView(),
            clearValue: [0.1, 0.1, 0.1, 1],
            loadOp: "clear",
            storeOp: "store"
        }],
        depthStencilAttachment: {
            view: depthTexture.createView(),
            depthClearValue: 1.0,
            depthLoadOp: 'clear',
            depthStoreOp: 'store'
        }
    }
}

init();