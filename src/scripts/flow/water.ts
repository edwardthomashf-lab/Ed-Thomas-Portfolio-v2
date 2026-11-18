/**
 * The water: a small WebGL2 layer that redraws each project thumbnail as a
 * liquid surface. The DOM cards stay in charge of layout, focus and clicks;
 * every frame this reads their rectangles and draws a textured, subdivided
 * plane in the same place.
 *
 * - The surface always moves a little (layered sine swell).
 * - Fast scrolling or dragging bows the plane against its direction of travel
 *   and splits the colour channels, like a sheet pulled through water.
 * - The cursor is a light hanging just above the surface. Its reflection
 *   (a specular highlight off the rippled normals) and a soft pool of light
 *   fall across every nearby card; the hovered card also ripples outward from
 *   the cursor.
 */

const VERT = /* glsl */ `#version 300 es
in vec2 aPos;
uniform vec4 uRect;     // x, y, w, h in CSS px, canvas space, y down
uniform vec2 uView;     // canvas size in CSS px
uniform float uVel;     // -1..1, normalised travel speed
uniform float uTime;
uniform float uSeed;
out vec2 vUv;

void main() {
  vec2 p = aPos;
  vec2 px = uRect.xy + p * uRect.zw;
  // Bow against the direction of travel: the middle lags the edges.
  float bow = sin(p.y * 3.14159);
  px.x += uVel * bow * uRect.z * 0.0225;
  // A slow swell across the surface.
  px.y += sin(p.x * 3.2 + uTime * 0.9 + uSeed) * uRect.w * 0.003;
  vUv = vec2(p.x, 1.0 - p.y);
  vec2 clip = px / uView * 2.0 - 1.0;
  gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);
}`;

const FRAG = /* glsl */ `#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uTex;
uniform vec2 uSize;     // card size in CSS px
uniform vec2 uMouse;    // cursor in this card's space, 0..1, y down (may be outside)
uniform float uLight;   // 0..1: the cursor is over the row
uniform float uHover;   // 0..1: the cursor is over this card
uniform float uVel;
uniform float uTime;
uniform float uSeed;
uniform float uRadius;  // corner radius, CSS px
uniform float uDark;    // 1 on dark page backgrounds
out vec4 outColor;

float aspect;

// The idle swell: three slow, crossing sine waves.
float swell(vec2 p) {
  float t = uTime;
  float h = sin(p.x * 6.0 + t * 1.05 + uSeed) * 0.5;
  h += sin(p.y * 8.5 - t * 1.35 + p.x * 2.7) * 0.42;
  h += sin((p.x - p.y) * 15.0 + t * 2.1 + uSeed * 2.0) * 0.16;
  return h;
}

// Rings spreading out from the cursor.
float ripple(vec2 p, vec2 m) {
  float d = distance(p, m);
  return sin(d * 34.0 - uTime * 5.2) * exp(-d * 5.0) * 0.12;
}

vec2 gradient(vec2 p, vec2 m, out vec2 rip) {
  float e = 0.0025;
  vec2 dx = vec2(e, 0.0);
  vec2 dy = vec2(0.0, e);
  vec2 g = vec2(swell(p + dx) - swell(p - dx), swell(p + dy) - swell(p - dy)) / (2.0 * e);
  rip = vec2(ripple(p + dx, m) - ripple(p - dx, m), ripple(p + dy, m) - ripple(p - dy, m)) / (2.0 * e);
  return g;
}

float roundedBox(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

void main() {
  aspect = uSize.x / uSize.y;
  vec2 suv = vec2(vUv.x, 1.0 - vUv.y);            // y down, like the page
  vec2 p = vec2(suv.x * aspect, suv.y);
  vec2 m = vec2(uMouse.x * aspect, uMouse.y);

  vec2 rip;
  vec2 g = gradient(p, m, rip);
  float speed = abs(uVel);

  // Refraction: a gentle swell at rest, stronger when moving or touched.
  vec2 off = g * (0.00011 + speed * 0.00055) + rip * 0.0017 * uHover;
  off.y = -off.y;                                   // back to texture space

  vec2 split = vec2(uVel * 0.0025, 0.0);
  vec2 uv = vUv + off;
  vec3 col;
  col.r = texture(uTex, uv + split).r;
  col.g = texture(uTex, uv).g;
  col.b = texture(uTex, uv - split).b;

  // The surface normal from the waves (ripples only where the cursor is).
  vec3 n = normalize(vec3(-(g * 0.011 + rip * 0.045 * uHover), 1.0));
  vec3 warm = vec3(1.0, 0.975, 0.93);

  // Ambient sky light from the top left: soft glints riding the swell.
  vec3 sky = normalize(vec3(-0.55, -0.7, 0.9));
  float sheen = pow(max(reflect(-sky, n).z, 0.0), 26.0);
  col += warm * sheen * 0.025;

  // The cursor is a lamp just above the water.
  float d = distance(p, m);
  vec3 toLight = normalize(vec3(m - p, 0.38));
  float spec = pow(max(reflect(-toLight, n).z, 0.0), 48.0);
  float pool = exp(-d * d * 7.0);
  float reach = uLight * (0.3 + 0.7 * uHover) * exp(-d * 1.1);
  col += warm * spec * 0.42 * reach;
  col += warm * pool * 0.13 * reach;
  // The far side falls slightly into shadow so the light reads as directional.
  col *= 1.0 - (1.0 - pool) * 0.04 * reach * (1.0 + uDark);

  // Rounded corners, antialiased in pixel space.
  vec2 px = (suv - 0.5) * uSize;
  float sd = roundedBox(px, uSize * 0.5, uRadius);
  float alpha = clamp(0.5 - sd, 0.0, 1.0);
  outColor = vec4(col * alpha, alpha);
}`;

export interface WaterItem {
  /** The DOM thumbnail this plane mirrors. */
  el: HTMLElement;
  /** Index into the texture list (the project). */
  tex: number;
  /** 0..1, eased hover amount for this card. */
  hover: number;
  seed: number;
}

export interface WaterFrame {
  time: number;
  velocity: number;
  /** Cursor in canvas CSS px, or null when the cursor is elsewhere. */
  pointer: { x: number; y: number } | null;
  light: number;
  dark: boolean;
}

function compile(gl: WebGL2RenderingContext, type: number, src: string): WebGLShader {
  const shader = gl.createShader(type)!;
  gl.shaderSource(shader, src);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(shader) ?? 'shader error');
  }
  return shader;
}

export class Water {
  readonly gl: WebGL2RenderingContext;
  private program: WebGLProgram;
  private vao: WebGLVertexArrayObject;
  private count: number;
  private textures: (WebGLTexture | null)[] = [];
  private u: Record<string, WebGLUniformLocation | null> = {};
  private width = 0;
  private height = 0;
  private dpr = 1;
  lost = false;

  constructor(private canvas: HTMLCanvasElement, textureCount: number) {
    const gl = canvas.getContext('webgl2', { premultipliedAlpha: true, antialias: true, alpha: true });
    if (!gl) throw new Error('WebGL2 unavailable');
    this.gl = gl;

    const program = gl.createProgram()!;
    gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, VERT));
    gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(gl.getProgramInfoLog(program) ?? 'link error');
    }
    this.program = program;
    for (const name of ['uRect', 'uView', 'uVel', 'uTime', 'uSeed', 'uTex', 'uSize', 'uMouse', 'uLight', 'uHover', 'uRadius', 'uDark']) {
      this.u[name] = gl.getUniformLocation(program, name);
    }

    // A subdivided unit plane so the vertex shader can bend it.
    const cols = 28;
    const rows = 18;
    const verts: number[] = [];
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const x0 = x / cols, x1 = (x + 1) / cols, y0 = y / rows, y1 = (y + 1) / rows;
        verts.push(x0, y0, x1, y0, x0, y1, x0, y1, x1, y0, x1, y1);
      }
    }
    this.count = verts.length / 2;
    this.vao = gl.createVertexArray()!;
    gl.bindVertexArray(this.vao);
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(verts), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(program, 'aPos');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    this.textures = new Array(textureCount).fill(null);

    canvas.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      this.lost = true;
    });
  }

  hasTexture(i: number): boolean {
    return Boolean(this.textures[i]);
  }

  setTexture(i: number, image: TexImageSource): void {
    const gl = this.gl;
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    this.textures[i] = tex;
  }

  resize(): void {
    const rect = this.canvas.getBoundingClientRect();
    this.dpr = Math.min(devicePixelRatio || 1, 2);
    this.width = rect.width;
    this.height = rect.height;
    this.canvas.width = Math.round(rect.width * this.dpr);
    this.canvas.height = Math.round(rect.height * this.dpr);
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
  }

  clear(): void {
    this.gl.clearColor(0, 0, 0, 0);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);
  }

  render(items: WaterItem[], frame: WaterFrame): void {
    if (this.lost) return;
    const gl = this.gl;
    const origin = this.canvas.getBoundingClientRect();
    this.clear();
    gl.useProgram(this.program);
    gl.bindVertexArray(this.vao);
    gl.uniform2f(this.u.uView, this.width, this.height);
    gl.uniform1f(this.u.uTime, frame.time / 1000);
    gl.uniform1f(this.u.uVel, frame.velocity);
    gl.uniform1f(this.u.uLight, frame.light);
    gl.uniform1f(this.u.uDark, frame.dark ? 1 : 0);
    gl.uniform1f(this.u.uRadius, 8);
    gl.uniform1i(this.u.uTex, 0);
    gl.activeTexture(gl.TEXTURE0);

    for (const item of items) {
      const tex = this.textures[item.tex];
      if (!tex) continue;
      const r = item.el.getBoundingClientRect();
      const x = r.left - origin.left;
      const y = r.top - origin.top;
      // Cull planes that are fully off the canvas (with room for the bow).
      if (x + r.width < -80 || x > this.width + 80) continue;

      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.uniform4f(this.u.uRect, x, y, r.width, r.height);
      gl.uniform2f(this.u.uSize, r.width, r.height);
      gl.uniform1f(this.u.uSeed, item.seed);
      gl.uniform1f(this.u.uHover, item.hover);
      const p = frame.pointer;
      gl.uniform2f(this.u.uMouse, p ? (p.x - x) / r.width : -4, p ? (p.y - y) / r.height : -4);
      gl.drawArrays(gl.TRIANGLES, 0, this.count);
    }
  }
}
