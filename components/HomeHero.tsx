"use client";

import { useEffect, useRef } from "react";
import Script from "next/script";
import { useTranslations } from "next-intl";

/* eslint-disable @typescript-eslint/no-explicit-any */
// THREE is loaded from a CDN at runtime, so it has no typings here.

declare global {
  interface Window {
    THREE?: any;
  }
}

const VS = `varying vec2 vUv;
void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`;

const FS = `
uniform float uTime;
uniform vec2  uResolution;
uniform vec3  uC1,uC2,uC3,uC4,uC5,uC6;
uniform float uSpeed,uIntensity,uGrain,uGSize;
uniform sampler2D uTouch;
uniform vec3  uBase;
varying vec2 vUv;

float noise(vec2 uv,float t){
  vec2 g=uv*uResolution*.5;
  return fract(sin(dot(g+t,vec2(12.9898,78.233)))*43758.5453)*2.-1.;
}

vec3 grad(vec2 uv,float t){
  float r=uGSize;
  vec2 c1=vec2(.5+sin(t*uSpeed*.40)*.42,.5+cos(t*uSpeed*.50)*.42);
  vec2 c2=vec2(.5+cos(t*uSpeed*.60)*.48,.5+sin(t*uSpeed*.45)*.48);
  vec2 c3=vec2(.5+sin(t*uSpeed*.35)*.44,.5+cos(t*uSpeed*.55)*.44);
  vec2 c4=vec2(.5+cos(t*uSpeed*.50)*.40,.5+sin(t*uSpeed*.40)*.40);
  vec2 c5=vec2(.5+sin(t*uSpeed*.70)*.36,.5+cos(t*uSpeed*.60)*.36);
  vec2 c6=vec2(.5+cos(t*uSpeed*.45)*.50,.5+sin(t*uSpeed*.65)*.50);
  vec2 c7=vec2(.5+sin(t*uSpeed*.55)*.38,.5+cos(t*uSpeed*.48)*.42);
  vec2 c8=vec2(.5+cos(t*uSpeed*.65)*.36,.5+sin(t*uSpeed*.52)*.44);

  float i1=1.-smoothstep(0.,r,length(uv-c1));
  float i2=1.-smoothstep(0.,r,length(uv-c2));
  float i3=1.-smoothstep(0.,r,length(uv-c3));
  float i4=1.-smoothstep(0.,r,length(uv-c4));
  float i5=1.-smoothstep(0.,r,length(uv-c5));
  float i6=1.-smoothstep(0.,r,length(uv-c6));
  float i7=1.-smoothstep(0.,r,length(uv-c7));
  float i8=1.-smoothstep(0.,r,length(uv-c8));

  vec3 col=vec3(0.);
  col+=uC1*i1*(0.55+0.45*sin(t*uSpeed));
  col+=uC2*i2*(0.55+0.45*cos(t*uSpeed*1.2));
  col+=uC3*i3*(0.55+0.45*sin(t*uSpeed*.8));
  col+=uC4*i4*(0.55+0.45*cos(t*uSpeed*1.3));
  col+=uC5*i5*(0.55+0.45*sin(t*uSpeed*1.1));
  col+=uC6*i6*(0.55+0.45*cos(t*uSpeed*.9));
  col+=uC1*i7*(0.55+0.45*sin(t*uSpeed*1.4));
  col+=uC2*i8*(0.55+0.45*cos(t*uSpeed*1.5));

  col=clamp(col,0.,1.)*uIntensity;
  float lum=dot(col,vec3(0.299,0.587,0.114));
  col=mix(vec3(lum),col,1.3);
  col=pow(col,vec3(0.94));
  col=mix(uBase,col,max(length(col)*1.2,0.18));
  float b=length(col); if(b>1.)col/=b;
  return col;
}

void main(){
  vec2 uv=vUv;

  vec4 tt=texture2D(uTouch,uv);
  float vx=-(tt.r*2.-1.), vy=-(tt.g*2.-1.), ti=tt.b;
  uv.x+=vx*0.55*ti; uv.y+=vy*0.55*ti;
  float d=length(uv-vec2(.5));
  uv+=vec2(sin(d*18.-uTime*3.)*.03*ti);

  vec3 col=grad(uv,uTime);

  col+=noise(uv,uTime)*uGrain;

  float ts=uTime*.5;
  col.r+=sin(ts)*.012; col.g+=cos(ts*1.4)*.012; col.b+=sin(ts*1.2)*.012;

  col=mix(uBase,col,max(length(col)*1.2,0.18));
  col=clamp(col,0.,1.);
  float mb=length(col); if(mb>1.)col/=mb;
  gl_FragColor=vec4(col,1.);
}`;

function initHeroWebGL(canvas: HTMLCanvasElement, THREE: any): () => void {
  class TouchTexture {
    size = 64;
    maxAge = 64;
    radius = 0.22 * 64;
    trail: Array<{ x: number; y: number; age: number; force: number; vx: number; vy: number }> = [];
    last: { x: number; y: number } | null = null;
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    texture: any;

    constructor() {
      this.canvas = document.createElement("canvas");
      this.canvas.width = this.canvas.height = this.size;
      const ctx = this.canvas.getContext("2d");
      if (!ctx) throw new Error("2d context unavailable");
      this.ctx = ctx;
      this.ctx.fillStyle = "black";
      this.ctx.fillRect(0, 0, this.size, this.size);
      this.texture = new THREE.Texture(this.canvas);
    }

    addTouch(pt: { x: number; y: number }) {
      let vx = 0,
        vy = 0,
        force = 0;
      if (this.last) {
        const dx = pt.x - this.last.x;
        const dy = pt.y - this.last.y;
        if (dx === 0 && dy === 0) return;
        const d = Math.sqrt(dx * dx + dy * dy);
        vx = dx / d;
        vy = dy / d;
        force = Math.min(d * d * 20000, 2.0);
      }
      this.last = { x: pt.x, y: pt.y };
      this.trail.push({ x: pt.x, y: pt.y, age: 0, force, vx, vy });
    }

    update() {
      const ctx = this.ctx,
        s = this.size;
      ctx.fillStyle = "black";
      ctx.fillRect(0, 0, s, s);

      for (let i = this.trail.length - 1; i >= 0; i--) {
        const p = this.trail[i];
        const f = p.force * (1 / this.maxAge) * (1 - p.age / this.maxAge);
        p.x += p.vx * f;
        p.y += p.vy * f;
        p.age++;
        if (p.age > this.maxAge) {
          this.trail.splice(i, 1);
          continue;
        }

        let intensity =
          p.age < this.maxAge * 0.3
            ? Math.sin((p.age / (this.maxAge * 0.3)) * (Math.PI / 2))
            : ((t: number) => -t * (t - 2))(1 - (p.age - this.maxAge * 0.3) / (this.maxAge * 0.7));
        intensity *= p.force;

        const px = p.x * s,
          py = (1 - p.y) * s;
        const off = s * 5,
          r = this.radius;
        const col = `${((p.vx + 1) / 2) * 255},${((p.vy + 1) / 2) * 255},${intensity * 255}`;
        ctx.shadowOffsetX = off;
        ctx.shadowOffsetY = off;
        ctx.shadowBlur = r;
        ctx.shadowColor = `rgba(${col},${0.2 * intensity})`;
        ctx.beginPath();
        ctx.fillStyle = "rgba(255,0,0,1)";
        ctx.arc(px - off, py - off, r, 0, Math.PI * 2);
        ctx.fill();
      }
      this.texture.needsUpdate = true;
    }
  }

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 10000);
  camera.position.z = 50;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x313646);

  const brand = new THREE.Vector3(0.447, 0.702, 0.753);
  const dark = new THREE.Vector3(0.192, 0.212, 0.275);
  const base = new THREE.Vector3(0.14, 0.155, 0.21);

  const uniforms = {
    uTime: { value: 0 },
    uResolution: { value: new THREE.Vector2() },
    uC1: { value: brand.clone() },
    uC2: { value: dark.clone() },
    uC3: { value: brand.clone() },
    uC4: { value: dark.clone() },
    uC5: { value: brand.clone() },
    uC6: { value: dark.clone() },
    uSpeed: { value: 1.2 },
    uIntensity: { value: 1.6 },
    uGrain: { value: 0.045 },
    uGSize: { value: 0.5 },
    uTouch: { value: null as any },
    uBase: { value: base },
  };

  function viewSize() {
    const fov = (camera.fov * Math.PI) / 180;
    const h = Math.abs(camera.position.z * Math.tan(fov / 2) * 2);
    return { w: h * camera.aspect, h };
  }

  function buildMesh() {
    const vs = viewSize();
    return new THREE.Mesh(
      new THREE.PlaneGeometry(vs.w, vs.h, 1, 1),
      new THREE.ShaderMaterial({ uniforms, vertexShader: VS, fragmentShader: FS }),
    );
  }

  let mesh = buildMesh();
  scene.add(mesh);

  const touch = new TouchTexture();
  uniforms.uTouch.value = touch.texture;

  function onResize() {
    const w = canvas.offsetWidth,
      h = canvas.offsetHeight;
    if (w === 0 || h === 0) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    uniforms.uResolution.value.set(w, h);
    scene.remove(mesh);
    mesh.geometry.dispose();
    mesh = buildMesh();
    uniforms.uTouch.value = touch.texture;
    scene.add(mesh);
  }
  onResize();

  function onMouseMove(e: MouseEvent) {
    touch.addTouch({ x: e.clientX / window.innerWidth, y: 1 - e.clientY / window.innerHeight });
  }
  function onTouchMove(e: TouchEvent) {
    const t = e.touches[0];
    if (!t) return;
    touch.addTouch({ x: t.clientX / window.innerWidth, y: 1 - t.clientY / window.innerHeight });
  }

  let active = !document.hidden;
  function onVisibility() {
    active = !document.hidden;
  }

  window.addEventListener("resize", onResize);
  window.addEventListener("mousemove", onMouseMove, { passive: true });
  window.addEventListener("touchmove", onTouchMove, { passive: true });
  document.addEventListener("visibilitychange", onVisibility);

  const clock = new THREE.Clock();
  let rafId = 0;

  function tick() {
    rafId = requestAnimationFrame(tick);
    if (!active) return;
    uniforms.uTime.value += Math.min(clock.getDelta(), 0.05);
    touch.update();
    renderer.render(scene, camera);
  }
  tick();

  return () => {
    cancelAnimationFrame(rafId);
    window.removeEventListener("resize", onResize);
    window.removeEventListener("mousemove", onMouseMove);
    window.removeEventListener("touchmove", onTouchMove);
    document.removeEventListener("visibilitychange", onVisibility);
    scene.remove(mesh);
    mesh.geometry.dispose();
    (mesh.material as any).dispose();
    touch.texture.dispose();
    renderer.dispose();
  };
}

export default function HomeHero() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const startedRef = useRef(false);
  const t = useTranslations("home.hero");

  useEffect(() => {
    let pollId = 0;

    function start() {
      if (startedRef.current) return;
      const canvas = canvasRef.current;
      const THREE = window.THREE;
      if (!canvas || !THREE) return;
      startedRef.current = true;
      cleanupRef.current = initHeroWebGL(canvas, THREE);
    }

    if (window.THREE) {
      start();
    } else {
      pollId = window.setInterval(start, 50);
    }

    return () => {
      if (pollId) window.clearInterval(pollId);
      cleanupRef.current?.();
      cleanupRef.current = null;
      startedRef.current = false;
    };
  }, []);

  return (
    <>
      <Script
        src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"
        crossOrigin="anonymous"
        strategy="afterInteractive"
      />
      <div className="hero">
        <canvas ref={canvasRef} id="heroCanvas" />
        <div className="hero-content fade-up-target">
          <p className="hero-eyebrow">{t("eyebrow")}</p>
          <h1 className="hero-title">{t("title")}</h1>
          <p className="hero-desc">
            {t("descLine1")}
            <br />
            {t("descLine2")}
          </p>
        </div>
        <div className="hero-scroll-hint">
          <span>{t("scrollHint")}</span>
          <div className="scroll-arrow"></div>
        </div>
      </div>
    </>
  );
}
