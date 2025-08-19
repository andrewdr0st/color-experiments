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

const rgbToLms = mat3x3f(
    0.4122214708, 0.2119034982, 0.0883024619,
    0.5363325363, 0.6806995451, 0.2817188376,
    0.0514459929, 0.1073969566, 0.6299787005
);

const lmsToOKLab = mat3x3f(
    0.2104542553, 1.9779984951, 0.0259040371,
    0.7936177850, -2.4285922050, 0.7827717662,
    -0.0040720468, 0.4505937099, -0.8086757660
);

@group(0) @binding(0) var<uniform> scene: sceneInfo;
@group(0) @binding(1) var<uniform> pallete: array<vec3f, 32>;
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
    for (var i = 0; i < 32; i++) {
        let v = fsIn.color - pow(pallete[i], vec3f(2.2));
        let d = v.x * v.x + v.y * v.y + v.z * v.z;
        if (d < dist) {
            dist = d;
            p = i;
        }
    }
    return vec4f(pallete[p], 1.0);
}

fn rgbToOKLab(rgb: vec3f) -> vec3f {
    let lms = rgbToLms * rgb;
    let lms_ = pow(lms, vec3f(0.33333));
    return lmsToOKLab * lms_;
}

fn rgbToOKLCH(rgb: vec3f) -> vec3f {
    let oklab = rgbToOKLab(rgb);
    let c = sqrt(oklab.y * oklab.y + oklab.z * oklab.z);
    let h = atan2(oklab.z, oklab.y);
    return vec3f(oklab.x, c, h);
}