precision highp float;

uniform vec2 u_resolution;
uniform float u_time;

// tuning — edit these directly instead of relying on extra uniforms
uniform float u_zoom;
uniform float u_interval;
uniform float u_speed;
uniform int   u_palette;
uniform bool  u_hillshade;



vec3 permute(vec3 x){ return mod(((x*34.0)+1.0)*x, 289.0); }

float snoise(vec2 v){
  const vec4 C = vec4(0.211324865405187, 0.366025403784439,
           -0.577350269189626, 0.024390243902439);
  vec2 i  = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod(i, 289.0);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
  m = m*m; m = m*m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
  vec3 g;
  g.x = a0.x * x0.x + h.x * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

float fbm(vec2 p){
  float sum = 0.0;
  float amp = 0.55;
  float freq = 1.0;
  for(int i = 0; i < 5; i++){
    sum += amp * snoise(p * freq);
    freq *= 2.02;
    amp *= 0.52;
  }
  return sum;
}

vec3 hypsometric(float h, int pal) {
  // Use u_palette / pal
  if(pal == 1) {
    return vec3(0.93, 0.91, 0.84);
  }
  if(pal == 2) {
    return vec3(0.07059, 0.09020, 0.16078);
  }
  if(pal == 3) {
    vec3 deep = vec3(0.02, 0.05, 0.18);
    vec3 mid  = vec3(0.05, 0.25, 0.45);
    vec3 shelf= vec3(0.35, 0.65, 0.75);
    if(h < 0.5) return mix(deep, mid, h/0.5);
    return mix(mid, shelf, (h-0.5)/0.5);
  }
  vec3 water   = vec3(0.09, 0.28, 0.42);
  vec3 sand    = vec3(0.78, 0.72, 0.52);
  vec3 grass   = vec3(0.24, 0.45, 0.24);
  vec3 forest  = vec3(0.15, 0.32, 0.16);
  vec3 rock    = vec3(0.42, 0.36, 0.30);
  vec3 snow    = vec3(0.96, 0.97, 0.98);
  
  if(h < 0.32) return mix(water, sand, smoothstep(0.20, 0.32, h));
  if(h < 0.40) return mix(sand, grass, smoothstep(0.32, 0.40, h));
  if(h < 0.62) return mix(grass, forest, smoothstep(0.40, 0.62, h));
  if(h < 0.80) return mix(forest, rock, smoothstep(0.62, 0.80, h));
  return mix(rock, snow, smoothstep(0.80, 1.0, h));
}

void main() {
  vec2 st = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / min(u_resolution.x, u_resolution.y);
  st *= u_zoom; // Use uniform
  vec2 drift = vec2(u_time * u_speed, u_time * u_speed * 0.6); // Use uniform

  float n = fbm(st + drift);
  float h = clamp(n * 0.5 + 0.5, 0.0, 1.0);

  vec3 base = hypsometric(h, u_palette); // Use uniform

  if(u_hillshade) { // Use uniform
    float eps = 0.6;
    float hx = fbm(st + drift + vec2(eps, 0.0)) * 0.5 + 0.5;
    float hy = fbm(st + drift + vec2(0.0, eps)) * 0.5 + 0.5;
    vec3 normal = normalize(vec3(-(hx - h), -(hy - h), 0.6));
    vec3 lightDir = normalize(vec3(-0.5, 0.6, 0.7));
    float diff = dot(normal, lightDir) * 0.5 + 0.5;
    base *= mix(0.72, 1.18, diff);
  }

  float steps = h / u_interval; // Use uniform
  float frac = fract(steps);
  float dist = min(frac, 1.0 - frac);
  float aa = 0.04;
  float line = 1.0 - smoothstep(0.0, aa, dist);

  float ring = floor(steps);
  bool isMajor = mod(ring, 5.0) < 0.5;
  float thickness = isMajor ? aa * 1.8 : aa;
  float majorLine = 1.0 - smoothstep(0.0, thickness, dist);

  vec3 lineColor = mix(vec3(0.08,0.08,0.06), vec3(0.02,0.02,0.02), isMajor ? 1.0 : 0.0);
  if(u_palette == 2) lineColor = vec3(1.0, 1.0, 1.0);
  float lineMix = isMajor ? majorLine : line;

  vec3 finalColor = mix(base, base * 0.35 + lineColor * 0.65, lineMix);

  gl_FragColor = vec4(finalColor, 1.0);
}