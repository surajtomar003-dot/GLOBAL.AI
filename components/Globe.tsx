"use client";
import { useEffect, useRef } from "react";
export const HUBS: [string, number, number][] = [["New York",40.7,-74],["London",51.5,-0.1],["Frankfurt",50.1,8.7],["Dubai",25.2,55.3],["Mumbai",19.1,72.9],["Singapore",1.35,103.8],["Hong Kong",22.3,114.2],["Tokyo",35.7,139.7],["Sydney",-33.9,151.2],["São Paulo",-23.5,-46.6]];
const rad = Math.PI / 180;
const vec = (lat: number, lon: number): [number, number, number] =>
  [Math.cos(lat * rad) * Math.sin(lon * rad), Math.sin(lat * rad), Math.cos(lat * rad) * Math.cos(lon * rad)];

let landMaskPromise: Promise<(lat: number, lon: number) => boolean> | null = null;

async function landMask() {
  const W = 1024, H = 512;
  const c = document.createElement("canvas"); c.width = W; c.height = H;
  const g = c.getContext("2d", { willReadFrequently: true });
  if (!g) return () => false;
  try {
    const res = await fetch("/data/countries.json");
    if (!res.ok) throw new Error("Failed to load countries");
    const geo = await res.json();
    g.fillStyle = "#fff";
    const ring = (r: number[][]) => {
      r.forEach(([lo, la], i) => {
        const x = ((lo + 180) / 360) * W, y = ((90 - la) / 180) * H;
        i ? g.lineTo(x, y) : g.moveTo(x, y);
      });
      g.closePath();
    };
    for (const f of geo.features || []) {
      const gm = f.geometry;
      if (!gm) continue;
      const polys = gm.type === "Polygon" ? [gm.coordinates] : gm.type === "MultiPolygon" ? gm.coordinates : [];
      g.beginPath();
      polys.forEach((p: number[][][]) => p.forEach(ring));
      g.fill("evenodd");
    }
    const d = g.getImageData(0, 0, W, H).data;
    return (lat: number, lon: number) => {
      const px = Math.min(W - 1, Math.max(0, Math.floor(((lon + 180) / 360) * W)));
      const py = Math.min(H - 1, Math.max(0, Math.floor(((90 - lat) / 180) * H)));
      return d[(py * W + px) * 4 + 3] > 100;
    };
  } catch (err) {
    console.warn("Could not load countries.json land mask, using default globe:", err);
    return () => true;
  }
}

function getLandMask() {
  if (!landMaskPromise) {
    landMaskPromise = landMask();
  }
  return landMaskPromise;
}

export default function Globe({ onHub }: { onHub?: (n: string) => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current!, ctx = cv.getContext("2d")!;
    let raf = 0, dead = false, yaw = 0.6, vy = 0.0025, drag = false, lx = 0;
    const tilt = 0.38, pts: [number, number, number][] = [];
    let size = 0, dpr = 1;
    const fit = () => { dpr = Math.min(2, devicePixelRatio || 1); size = cv.clientWidth; cv.width = cv.height = size * dpr; };
    fit(); const ro = new ResizeObserver(fit); ro.observe(cv);
    getLandMask().then((isLand) => {
      if (dead) return;
      const N = 9000;
      for (let i = 0; i < N; i++) {
        const y = 1 - (i / (N - 1)) * 2, r = Math.sqrt(1 - y * y), t = Math.PI * (3 - Math.sqrt(5)) * i;
        const x = Math.cos(t) * r, z = Math.sin(t) * r;
        const lat = Math.asin(y) / rad, lon = Math.atan2(x, z) / rad;
        if (isLand(lat, lon)) pts.push([x, y, z]);
      }
    }).catch(() => {});
    const rot = ([x, y, z]: number[]) => {
      const x2 = x * Math.cos(yaw) + z * Math.sin(yaw), z2 = -x * Math.sin(yaw) + z * Math.cos(yaw);
      return [x2, y * Math.cos(tilt) - z2 * Math.sin(tilt), y * Math.sin(tilt) + z2 * Math.cos(tilt)];
    };
    const hv = HUBS.map(([, la, lo]) => vec(la, lo));
    const arcs = [[0,1],[1,3],[3,4],[4,5],[5,6],[6,7],[0,9],[2,4],[7,8],[0,7]];
    const frame = (time: number) => {
      if (dead) return;
      if (!drag) yaw += vy;
      const R = size * dpr * 0.42, cx = size * dpr / 2, cy = cx;
      ctx.clearRect(0, 0, cv.width, cv.height);
      const halo = ctx.createRadialGradient(cx, cy, R * 0.9, cx, cy, R * 1.35);
      halo.addColorStop(0, "rgba(245,158,11,.22)"); halo.addColorStop(1, "rgba(245,158,11,0)");
      ctx.fillStyle = halo; ctx.fillRect(0, 0, cv.width, cv.height);
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, 7); ctx.fillStyle = "#06090d"; ctx.fill();
      ctx.strokeStyle = "rgba(245,158,11,.25)"; ctx.lineWidth = dpr; ctx.stroke();
      const s = Math.max(1, dpr * 1.25);
      for (const p of pts) {
        const [x, y, z] = rot(p); if (z < 0) continue;
        ctx.fillStyle = `rgba(${230 + z * 25},${150 + z * 60},${40 + z * 40},${0.25 + z * 0.75})`;
        ctx.fillRect(cx + x * R, cy - y * R, s, s);
      }
      arcs.forEach(([a, b], k) => {
        const A = hv[a], B = hv[b], om = Math.acos(Math.min(1, A[0]*B[0]+A[1]*B[1]+A[2]*B[2])), so = Math.sin(om);
        const at = (t: number) => { const f1 = Math.sin((1 - t) * om) / so, f2 = Math.sin(t * om) / so, L = 1 + 0.22 * Math.sin(Math.PI * t) * om / Math.PI * 2;
          return rot([(A[0]*f1+B[0]*f2)*L, (A[1]*f1+B[1]*f2)*L, (A[2]*f1+B[2]*f2)*L]); };
        ctx.beginPath(); ctx.strokeStyle = "rgba(253,224,71,.38)"; ctx.lineWidth = dpr;
        let pen = false;
        for (let i = 0; i <= 40; i++) { const [x, y, z] = at(i / 40); if (z < 0) { pen = false; continue; } const X = cx + x*R, Y = cy - y*R; pen ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); pen = true; }
        ctx.stroke();
        const [x, y, z] = at(((time * 0.00025) + k * 0.13) % 1);
        if (z > 0) { ctx.beginPath(); ctx.arc(cx + x*R, cy - y*R, 2.2 * dpr, 0, 7); ctx.fillStyle = "#FFFBEB"; ctx.fill(); }
      });
      hv.forEach((h, i) => {
        const [x, y, z] = rot(h); if (z < 0) return;
        const pulse = (time * 0.002 + i) % 6.28, X = cx + x*R, Y = cy - y*R;
        ctx.beginPath(); ctx.arc(X, Y, (4 + Math.sin(pulse) * 1.5 + 3) * dpr, 0, 7); ctx.strokeStyle = "rgba(251,191,36,.5)"; ctx.stroke();
        ctx.beginPath(); ctx.arc(X, Y, 2.6 * dpr, 0, 7); ctx.fillStyle = "#FBBF24"; ctx.fill();
        if (z > 0.55) { ctx.font = `${10 * dpr}px ui-monospace,monospace`; ctx.fillStyle = "rgba(255,247,220,.85)"; ctx.fillText(HUBS[i][0].toUpperCase(), X + 8 * dpr, Y - 6 * dpr); }
      });
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    const down = (e: PointerEvent) => { drag = true; lx = e.clientX; cv.setPointerCapture(e.pointerId); };
    const move = (e: PointerEvent) => { if (drag) { yaw -= (e.clientX - lx) * 0.006; lx = e.clientX; } };
    const up = () => { drag = false; };
    cv.addEventListener("pointerdown", down); cv.addEventListener("pointermove", move); cv.addEventListener("pointerup", up);
    return () => { dead = true; cancelAnimationFrame(raf); ro.disconnect(); cv.removeEventListener("pointerdown", down); cv.removeEventListener("pointermove", move); cv.removeEventListener("pointerup", up); };
  }, [onHub]);
  return <canvas ref={ref} className="globe" />;
}
