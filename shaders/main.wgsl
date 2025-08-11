struct vertex {
    @location(0) pos: vec4f,
    @location(1) tc: vec2f,
    @location(2) normal: vec3f
};

struct sceneInfo {
    view: mat4x4f,
    world: mat4x4f,
    maxh: f32
}

struct vsOutput {
    @builtin(position) position: vec4f,
    @location(0) color: vec3f
};

@group(0) @binding(0) var<uniform> scene: sceneInfo;
@group(0) @binding(1) var<uniform> pallete: array<vec3f, 64>;
@vertex fn vs(vert: vertex) -> vsOutput {
    var vsOut: vsOutput;
    let pos = vec4f(vert.pos.x, min(vert.pos.y, scene.maxh), vert.pos.z, vert.pos.w);
    vsOut.position = scene.view * scene.world * pos;
    vsOut.color = pos.xyz * 0.5 + 0.5;
    return vsOut;
}

@fragment fn fs(fsIn: vsOutput) -> @location(0) vec4f {
    var dist = 10000.0;
    var p = 0;
    for (var i = 0; i < 64; i++) {
        let v = fsIn.color - pallete[i];
        let d = v.x * v.x + v.y * v.y + v.z * v.z;
        if (d < dist) {
            dist = d;
            p = i;
        }
    }
    return vec4f(pallete[p], 1.0);
}