export const MOSS_VERT = /* glsl */ `
varying vec3 vColor;
varying float vFog;
varying float vH;

uniform float uTime;
uniform vec3 uPointer;
uniform float uReduce;

void main() {
  vColor = instanceColor;
  vH = position.y;
  vec4 origin = modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
  vec3 pos = position;
  float h = max(position.y, 0.0);
  vec2 away = origin.xz - uPointer.xz;
  float dist = length(away);
  vec2 dir = dist > 0.001 ? away / dist : vec2(0.0, 0.0);
  float part = smoothstep(1.9, 0.1, dist) * (1.0 - uReduce);
  float gust = (1.0 - uReduce) * sin(uTime * 1.5 + origin.x * 1.7 + origin.z * 0.65);
  pos.x += dir.x * part * h * 1.55;
  pos.z += dir.y * part * h * 1.55;
  pos.x += gust * h * 0.12;
  pos.z += cos(uTime * 1.08 + origin.z * 1.2) * h * 0.07 * (1.0 - uReduce);
  vec4 world = modelMatrix * instanceMatrix * vec4(pos, 1.0);
  vFog = smoothstep(8.5, 22.0, length(world.xyz));
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

export const MOSS_FRAG = /* glsl */ `
varying vec3 vColor;
varying float vFog;
varying float vH;
uniform vec3 uFogColor;

void main() {
  float tip = smoothstep(0.04, 0.42, vH);
  vec3 col = mix(vColor * 0.42, vColor * 1.08, tip);
  col = mix(col, uFogColor, vFog);
  gl_FragColor = vec4(col, 1.0);
}
`;
