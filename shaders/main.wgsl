struct vertex {
    @location(0) pos: vec4f,
    @location(1) tc: vec2f,
    @location(2) normal: vec3f
};

struct sceneInfo {
    view: mat4x4f
}

struct vsOutput {
    @builtin(position) position: vec4f
};

@group(0) @binding(0) var<uniform> scene: sceneInfo;
@group(0) @binding(1) var<uniform> pallete: array<vec3f, 32>;
@vertex fn vs(vert: vertex) -> vsOutput {
    var vsOut: vsOutput;
    vsOut.position = scene.view * vert.pos;
    return vsOut;
}

@fragment fn fs(fsIn: vsOutput) -> @location(0) vec4f {
    return vec4f(1.0);
}