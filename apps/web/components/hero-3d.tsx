"use client";

import { useEffect, useRef } from "react";

export default function Hero3D() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let animationId: number;
    let destroyed = false;

    async function init() {
      const THREE = await import("three");
      if (destroyed) return;

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(60, canvas!.clientWidth / canvas!.clientHeight, 0.1, 1000);
      camera.position.z = 5;

      const renderer = new THREE.WebGLRenderer({
        canvas: canvas!,
        alpha: true,
        antialias: true,
      });
      renderer.setSize(canvas!.clientWidth, canvas!.clientHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

      // Central glowing orb
      const orbGeometry = new THREE.SphereGeometry(0.8, 64, 64);
      const orbMaterial = new THREE.MeshStandardMaterial({
        color: 0x10b981,
        emissive: 0x059669,
        emissiveIntensity: 0.4,
        metalness: 0.8,
        roughness: 0.2,
      });
      const orb = new THREE.Mesh(orbGeometry, orbMaterial);
      scene.add(orb);

      // Ring 1
      const ring1Geo = new THREE.TorusGeometry(1.4, 0.03, 16, 100);
      const ring1Mat = new THREE.MeshStandardMaterial({
        color: 0x10b981,
        emissive: 0x10b981,
        emissiveIntensity: 0.6,
        transparent: true,
        opacity: 0.6,
      });
      const ring1 = new THREE.Mesh(ring1Geo, ring1Mat);
      ring1.rotation.x = Math.PI / 3;
      scene.add(ring1);

      // Ring 2
      const ring2Geo = new THREE.TorusGeometry(1.8, 0.02, 16, 100);
      const ring2Mat = new THREE.MeshStandardMaterial({
        color: 0x06b6d4,
        emissive: 0x06b6d4,
        emissiveIntensity: 0.5,
        transparent: true,
        opacity: 0.4,
      });
      const ring2 = new THREE.Mesh(ring2Geo, ring2Mat);
      ring2.rotation.x = -Math.PI / 4;
      ring2.rotation.y = Math.PI / 6;
      scene.add(ring2);

      // Ring 3
      const ring3Geo = new THREE.TorusGeometry(2.2, 0.015, 16, 100);
      const ring3Mat = new THREE.MeshStandardMaterial({
        color: 0x8b5cf6,
        emissive: 0x8b5cf6,
        emissiveIntensity: 0.4,
        transparent: true,
        opacity: 0.3,
      });
      const ring3 = new THREE.Mesh(ring3Geo, ring3Mat);
      ring3.rotation.x = Math.PI / 6;
      ring3.rotation.z = Math.PI / 5;
      scene.add(ring3);

      // Particles
      const particlesCount = 200;
      const particlesGeo = new THREE.BufferGeometry();
      const positions = new Float32Array(particlesCount * 3);
      for (let i = 0; i < particlesCount * 3; i++) {
        positions[i] = (Math.random() - 0.5) * 10;
      }
      particlesGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      const particlesMat = new THREE.PointsMaterial({
        color: 0x10b981,
        size: 0.02,
        transparent: true,
        opacity: 0.6,
      });
      const particles = new THREE.Points(particlesGeo, particlesMat);
      scene.add(particles);

      // Lights
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
      scene.add(ambientLight);

      const pointLight1 = new THREE.PointLight(0x10b981, 2, 10);
      pointLight1.position.set(3, 3, 3);
      scene.add(pointLight1);

      const pointLight2 = new THREE.PointLight(0x06b6d4, 1.5, 10);
      pointLight2.position.set(-3, -2, 2);
      scene.add(pointLight2);

      const pointLight3 = new THREE.PointLight(0x8b5cf6, 1, 10);
      pointLight3.position.set(0, 3, -2);
      scene.add(pointLight3);

      // Mouse tracking
      let mouseX = 0;
      let mouseY = 0;
      function onMouseMove(e: MouseEvent) {
        mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
        mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
      }
      window.addEventListener("mousemove", onMouseMove);

      // Handle resize
      function onResize() {
        if (!canvas) return;
        camera.aspect = canvas.clientWidth / canvas.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(canvas.clientWidth, canvas.clientHeight);
      }
      window.addEventListener("resize", onResize);

      // Animate
      const clock = new THREE.Clock();
      function animate() {
        if (destroyed) return;
        animationId = requestAnimationFrame(animate);
        const elapsed = clock.getElapsedTime();

        orb.rotation.y = elapsed * 0.3;
        orb.rotation.x = elapsed * 0.1;

        ring1.rotation.z = elapsed * 0.4;
        ring2.rotation.z = -elapsed * 0.3;
        ring3.rotation.y = elapsed * 0.2;

        particles.rotation.y = elapsed * 0.05;
        particles.rotation.x = elapsed * 0.02;

        // Subtle mouse follow
        orb.position.x += (mouseX * 0.2 - orb.position.x) * 0.02;
        orb.position.y += (-mouseY * 0.2 - orb.position.y) * 0.02;

        // Pulse effect
        const pulse = 1 + Math.sin(elapsed * 2) * 0.05;
        orb.scale.setScalar(pulse);

        renderer.render(scene, camera);
      }
      animate();

      return () => {
        window.removeEventListener("mousemove", onMouseMove);
        window.removeEventListener("resize", onResize);
      };
    }

    init();

    return () => {
      destroyed = true;
      if (animationId) cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
      style={{ zIndex: 0 }}
    />
  );
}