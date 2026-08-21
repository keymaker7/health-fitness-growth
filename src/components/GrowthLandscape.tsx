"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { MOSS_FRAG, MOSS_VERT } from "@/lib/mossShaders";

type Props = {
  level?: number;
};

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function hash2(x: number, z: number) {
  const n = Math.sin(x * 127.1 + z * 311.7) * 43758.5453;
  return n - Math.floor(n);
}

function noise(x: number, z: number) {
  const xi = Math.floor(x);
  const zi = Math.floor(z);
  const xf = x - xi;
  const zf = z - zi;
  const u = xf * xf * (3 - 2 * xf);
  const v = zf * zf * (3 - 2 * zf);
  return (
    hash2(xi, zi) * (1 - u) * (1 - v) +
    hash2(xi + 1, zi) * u * (1 - v) +
    hash2(xi, zi + 1) * (1 - u) * v +
    hash2(xi + 1, zi + 1) * u * v
  );
}

function fbm(x: number, z: number) {
  return noise(x, z) * 0.55 + noise(x * 2.03, z * 2.03) * 0.28 + noise(x * 4.1, z * 4.1) * 0.17;
}

function heightAt(x: number, z: number) {
  const mound = Math.exp(-(x * x + (z + 0.4) * (z + 0.4)) / 16);
  return fbm(x * 0.22, z * 0.22) * 0.62 + mound * 1.55;
}

export function GrowthLandscape({ level = 5 }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = rootRef.current;
    if (!host) return;
    const mount = host;
    const rand = rng(20260818);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const isMobile = window.innerWidth < 768;
    const g = Math.min(1, Math.max(0, (level - 1) / 9));
    const bladeCount = reduce ? 900 : isMobile ? 7000 : 28000;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: !isMobile, alpha: false, powerPreference: "high-performance" });
    } catch {
      return;
    }

    // Windows 11 Bloom 팔레트 — 파랑 기조에 보라·연두 포인트 (keymaker님 레퍼런스 이미지 기준)
    const fogColor = 0xd7e6f7;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.4 : 1.75));
    renderer.setSize(Math.max(1, mount.clientWidth), Math.max(1, mount.clientHeight));
    renderer.setClearColor(fogColor, 1);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.NoToneMapping;
    renderer.domElement.style.display = "block";
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.touchAction = "pan-y";
    mount.style.touchAction = "pan-y";
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(fogColor, 9, 24);

    const camera = new THREE.PerspectiveCamera(36, Math.max(1, mount.clientWidth) / Math.max(1, mount.clientHeight), 0.08, 80);
    camera.position.set(0.55, 2.05, 6.4);
    camera.lookAt(0.1, 0.85, -0.2);

    scene.add(new THREE.HemisphereLight(0xe6f2fd, 0x27407a, 1.05));
    const sun = new THREE.DirectionalLight(0xfdfbf2, 1.2);
    sun.position.set(5.5, 8.5, 3.2);
    scene.add(sun);
    const rim = new THREE.DirectionalLight(0xb9d7f7, 0.35);
    rim.position.set(-4, 3, -6);
    scene.add(rim);

    const geos: THREE.BufferGeometry[] = [];
    const mats: THREE.Material[] = [];

    const skyGeo = new THREE.SphereGeometry(42, 24, 16);
    skyGeo.scale(-1, 1, 1);
    const skyCol = new Float32Array(skyGeo.attributes.position.count * 3);
    for (let i = 0; i < skyGeo.attributes.position.count; i++) {
      const y = skyGeo.attributes.position.getY(i);
      const t = THREE.MathUtils.clamp((y + 4) / 28, 0, 1);
      skyCol[i * 3] = 0.93 - t * 0.31;
      skyCol[i * 3 + 1] = 0.96 - t * 0.14;
      skyCol[i * 3 + 2] = 0.99 - t * 0.01;
    }
    skyGeo.setAttribute("color", new THREE.BufferAttribute(skyCol, 3));
    const skyMat = new THREE.MeshBasicMaterial({ vertexColors: true, fog: false, depthWrite: false });
    scene.add(new THREE.Mesh(skyGeo, skyMat));
    geos.push(skyGeo);
    mats.push(skyMat);

    const terrainGeo = new THREE.PlaneGeometry(28, 28, 72, 72);
    terrainGeo.rotateX(-Math.PI / 2);
    const pos = terrainGeo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      pos.setY(i, heightAt(pos.getX(i), pos.getZ(i)));
    }
    terrainGeo.computeVertexNormals();
    const terrainMat = new THREE.MeshLambertMaterial({ color: 0x3a5ea8 });
    const terrain = new THREE.Mesh(terrainGeo, terrainMat);
    scene.add(terrain);
    geos.push(terrainGeo);
    mats.push(terrainMat);

    const soil = new THREE.Mesh(
      new THREE.CircleGeometry(8.5, 40),
      new THREE.MeshLambertMaterial({ color: 0x243a6e }),
    );
    soil.rotation.x = -Math.PI / 2;
    soil.position.y = 0.02;
    scene.add(soil);
    geos.push(soil.geometry);
    mats.push(soil.material);

    function tube(points: THREE.Vector3[], radius: number, color: number) {
      const curve = new THREE.CatmullRomCurve3(points);
      const geo = new THREE.TubeGeometry(curve, 56, radius, 8, false);
      const mat = new THREE.MeshLambertMaterial({ color, flatShading: true });
      const mesh = new THREE.Mesh(geo, mat);
      scene.add(mesh);
      geos.push(geo);
      mats.push(mat);
    }

    const lift = (x: number, z: number, extra = 0.08) => new THREE.Vector3(x, heightAt(x, z) + extra, z);
    tube(
      [lift(-3.8, 3.4, 0.04), lift(-2.2, 1.6, 0.1), lift(-0.6, 0.4, 0.22), lift(0.5, -0.8, 0.38), lift(1.3, -2.2, 0.2)],
      0.09 + g * 0.05,
      0x31488c,
    );
    tube(
      [lift(0.2, 0.3, 0.2), lift(1.4, 0.1, 0.28), lift(2.6, -0.6, 0.16), lift(3.4, -1.8, 0.08)],
      0.05 + g * 0.03,
      0x3f57a0,
    );
    tube(
      [lift(-0.4, 0.2, 0.18), lift(-1.8, -0.4, 0.24), lift(-2.8, -1.5, 0.12)],
      0.045,
      0x283c78,
    );
    if (g > 0.35) {
      tube([lift(0.6, -0.4, 0.3), lift(0.2, -1.4, 0.34), lift(-0.8, -2.2, 0.18)], 0.04, 0x35508f);
    }

    const bladeGeo = new THREE.PlaneGeometry(0.046, 0.52, 1, 6);
    bladeGeo.translate(0, 0.26, 0);
    const uTime = { value: 0 };
    const uPointer = { value: new THREE.Vector3(0, 0, 0) };
    const mossMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime,
        uPointer,
        uReduce: { value: reduce ? 1 : 0 },
        uFogColor: { value: new THREE.Color(fogColor) },
      },
      vertexShader: MOSS_VERT,
      fragmentShader: MOSS_FRAG,
      side: THREE.DoubleSide,
      defines: { USE_INSTANCING: "", USE_INSTANCING_COLOR: "" },
    });
    const grass = new THREE.InstancedMesh(bladeGeo, mossMat, bladeCount);
    grass.frustumCulled = false;
    const dummy = new THREE.Object3D();
    const tint = new THREE.Color();
    for (let i = 0; i < bladeCount; i++) {
      const a = rand() * Math.PI * 2;
      const r = Math.sqrt(rand()) * (5.8 + g * 1.4);
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r - 0.5;
      const y = heightAt(x, z);
      const h = (0.55 + rand() * 0.9) * (0.72 + g * 0.55);
      dummy.position.set(x, y, z);
      dummy.rotation.set(0, rand() * Math.PI, (rand() - 0.5) * 0.18);
      dummy.scale.set(0.65 + rand() * 0.7, h, 1);
      dummy.updateMatrix();
      grass.setMatrixAt(i, dummy.matrix);
      // Bloom 배색: 파랑이 주(62%), 보라(25%), 연두 포인트(13%)
      const w = rand();
      if (w < 0.62) tint.setHSL(0.575 + rand() * 0.055, 0.48 + rand() * 0.18, 0.5 + rand() * 0.18);
      else if (w < 0.87) tint.setHSL(0.70 + rand() * 0.06, 0.42 + rand() * 0.16, 0.56 + rand() * 0.14);
      else tint.setHSL(0.28 + rand() * 0.06, 0.48 + rand() * 0.16, 0.58 + rand() * 0.12);
      grass.setColorAt(i, tint);
    }
    if (grass.instanceColor) grass.instanceColor.needsUpdate = true;
    grass.instanceMatrix.needsUpdate = true;
    scene.add(grass);
    geos.push(bladeGeo);
    mats.push(mossMat);

    const fernGeo = new THREE.PlaneGeometry(0.28, 0.42, 1, 3);
    fernGeo.translate(0, 0.2, 0);
    const fernMat = new THREE.MeshLambertMaterial({ color: 0x5a6fd6, side: THREE.DoubleSide, flatShading: true });
    const fernCount = reduce ? 20 : isMobile ? 70 : 140;
    const ferns = new THREE.InstancedMesh(fernGeo, fernMat, fernCount);
    for (let i = 0; i < fernCount; i++) {
      const a = rand() * Math.PI * 2;
      const r = 1.2 + rand() * 5.2;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r - 0.4;
      dummy.position.set(x, heightAt(x, z), z);
      dummy.rotation.set(-0.35, rand() * Math.PI, 0.15);
      dummy.scale.setScalar(0.55 + rand() * 0.7 + g * 0.2);
      dummy.updateMatrix();
      ferns.setMatrixAt(i, dummy.matrix);
    }
    scene.add(ferns);
    geos.push(fernGeo);
    mats.push(fernMat);

    const bloomGeo = new THREE.SphereGeometry(0.07, 7, 5);
    const bloomMat = new THREE.MeshLambertMaterial({ color: 0xe8f0fc, flatShading: true });
    const bloomCount = Math.round(8 + g * 28);
    const blooms = new THREE.InstancedMesh(bloomGeo, bloomMat, bloomCount);
    for (let i = 0; i < bloomCount; i++) {
      const a = rand() * Math.PI * 2;
      const r = 0.8 + rand() * 4.6;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r - 0.3;
      dummy.position.set(x, heightAt(x, z) + 0.22 + rand() * 0.1, z);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.setScalar(0.7 + rand() * 0.8);
      dummy.updateMatrix();
      blooms.setMatrixAt(i, dummy.matrix);
      blooms.setColorAt(i, tint.setHSL(i % 3 === 0 ? 0.55 : i % 3 === 1 ? 0.74 : 0.3, 0.5, 0.78));
    }
    if (blooms.instanceColor) blooms.instanceColor.needsUpdate = true;
    scene.add(blooms);
    geos.push(bloomGeo);
    mats.push(bloomMat);

    if (level >= 3) {
      const canopy = new THREE.Group();
      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08 + g * 0.06, 0.14 + g * 0.08, 0.9 + g * 1.2, 7),
        new THREE.MeshLambertMaterial({ color: 0x51629e, flatShading: true }),
      );
      trunk.position.set(0.15, heightAt(0.15, -1.05) + 0.45 + g * 0.55, -1.05);
      canopy.add(trunk);
      geos.push(trunk.geometry);
      mats.push(trunk.material);
      const layers = 3 + Math.floor(g * 3);
      for (let i = 0; i < layers; i++) {
        const ball = new THREE.Mesh(
          new THREE.IcosahedronGeometry(0.42 + g * 0.28 - i * 0.05, 0),
          new THREE.MeshLambertMaterial({ color: i % 2 ? 0x5b9bf0 : 0x82b6f7, flatShading: true }),
        );
        ball.position.set(
          0.15 + (rand() - 0.5) * 0.35,
          heightAt(0.15, -1.05) + 1.05 + g * 0.9 + i * 0.18,
          -1.05 + (rand() - 0.5) * 0.3,
        );
        canopy.add(ball);
        geos.push(ball.geometry);
        mats.push(ball.material);
      }
      scene.add(canopy);
    }

    const pollenCount = reduce ? 18 : 90;
    const pollenGeo = new THREE.BufferGeometry();
    const pollenPos = new Float32Array(pollenCount * 3);
    for (let i = 0; i < pollenCount; i++) {
      pollenPos[i * 3] = (rand() - 0.5) * 9;
      pollenPos[i * 3 + 1] = 0.5 + rand() * 2.4;
      pollenPos[i * 3 + 2] = (rand() - 0.5) * 8;
    }
    pollenGeo.setAttribute("position", new THREE.BufferAttribute(pollenPos, 3));
    const pollen = new THREE.Points(
      pollenGeo,
      new THREE.PointsMaterial({ color: 0xeaf5ff, size: 0.055, transparent: true, opacity: 0.82, depthWrite: false }),
    );
    scene.add(pollen);
    geos.push(pollenGeo);
    mats.push(pollen.material);

    const trailCount = reduce ? 0 : 48;
    const trailGeo = new THREE.BufferGeometry();
    const trailPos = new Float32Array(Math.max(trailCount, 1) * 3);
    trailGeo.setAttribute("position", new THREE.BufferAttribute(trailPos, 3));
    const trail = new THREE.Points(
      trailGeo,
      new THREE.PointsMaterial({ color: 0xffffff, size: 0.08, transparent: true, opacity: 0.65, depthWrite: false }),
    );
    scene.add(trail);
    geos.push(trailGeo);
    mats.push(trail.material);
    let trailHead = 0;

    const pointer = new THREE.Vector3();
    const target = new THREE.Vector3();
    const raycaster = new THREE.Raycaster();
    const ndc = new THREE.Vector2(0, -0.15);
    const camBase = camera.position.clone();

    function onPointer(e: PointerEvent) {
      const rect = mount.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      ndc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      ndc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(ndc, camera);
      const hit = raycaster.intersectObject(terrain)[0];
      if (!hit) return;
      target.copy(hit.point);
      if (!trailCount) return;
      trailPos[trailHead * 3] = hit.point.x;
      trailPos[trailHead * 3 + 1] = hit.point.y + 0.12;
      trailPos[trailHead * 3 + 2] = hit.point.z;
      trailHead = (trailHead + 1) % trailCount;
      (trail.geometry.getAttribute("position") as THREE.BufferAttribute).needsUpdate = true;
    }
    mount.addEventListener("pointermove", onPointer, { passive: true });

    let raf = 0;
    const clock = new THREE.Clock();
    function tick() {
      raf = requestAnimationFrame(tick);
      const t = clock.getElapsedTime();
      pointer.lerp(target, 0.1);
      uPointer.value.copy(pointer);
      uTime.value = t;
      if (!reduce) {
        camera.position.x = camBase.x + ndc.x * 0.42;
        camera.position.y = camBase.y + ndc.y * 0.16;
        camera.lookAt(0.1, 0.85, -0.2);
        const arr = pollenPos;
        for (let i = 0; i < pollenCount; i++) {
          arr[i * 3 + 1] += 0.004 + (i % 5) * 0.0004;
          if (arr[i * 3 + 1] > 3.6) arr[i * 3 + 1] = 0.35;
          arr[i * 3] += Math.sin(t * 0.6 + i) * 0.0018;
        }
        (pollen.geometry.getAttribute("position") as THREE.BufferAttribute).needsUpdate = true;
        if (trailCount) {
          for (let i = 0; i < trailCount; i++) trailPos[i * 3 + 1] += 0.008;
          (trail.geometry.getAttribute("position") as THREE.BufferAttribute).needsUpdate = true;
        }
      }
      renderer.render(scene, camera);
    }
    tick();

    function onResize() {
      const w = Math.max(1, mount.clientWidth);
      const h = Math.max(1, mount.clientHeight);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    }
    const ro = new ResizeObserver(onResize);
    ro.observe(mount);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      mount.removeEventListener("pointermove", onPointer);
      grass.dispose();
      ferns.dispose();
      blooms.dispose();
      for (const geo of geos) geo.dispose();
      for (const mat of mats) mat.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
    };
  }, [level]);

  return <div ref={rootRef} className="absolute inset-0" aria-hidden />;
}
