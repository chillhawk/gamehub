"use client";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, MeshDistortMaterial, Environment } from "@react-three/drei";
import { useRef, Suspense } from "react";
import * as THREE from "three";

function GlowSphere() {
  const meshRef = useRef<THREE.Mesh>(null!);
  useFrame((state) => {
    meshRef.current.rotation.x = state.clock.elapsedTime * 0.18;
    meshRef.current.rotation.y = state.clock.elapsedTime * 0.22;
  });
  return (
    <Float speed={1.8} rotationIntensity={0.6} floatIntensity={1.2}>
      <mesh ref={meshRef} scale={1.8}>
        <icosahedronGeometry args={[1, 4]} />
        <MeshDistortMaterial
          color="#6C5CE7"
          distort={0.38}
          speed={2.5}
          roughness={0}
          metalness={0.8}
          envMapIntensity={2}
        />
      </mesh>
    </Float>
  );
}

function InnerCore() {
  const ref = useRef<THREE.Mesh>(null!);
  useFrame((state) => {
    ref.current.rotation.y = -state.clock.elapsedTime * 0.4;
    ref.current.rotation.z = state.clock.elapsedTime * 0.15;
  });
  return (
    <mesh ref={ref} scale={0.65}>
      <octahedronGeometry args={[1, 0]} />
      <meshStandardMaterial
        color="#C6BFFF"
        emissive="#6C5CE7"
        emissiveIntensity={1.2}
        wireframe
        transparent
        opacity={0.55}
      />
    </mesh>
  );
}

export default function HeroCanvas() {
  return (
    <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 1 }}>
      <Canvas
        camera={{ position: [0, 0, 5], fov: 45 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: "transparent" }}
      >
        <Suspense fallback={null}>
          <ambientLight intensity={0.3} />
          <pointLight position={[3, 3, 3]} intensity={4} color="#6C5CE7" />
          <pointLight position={[-3, -2, 2]} intensity={2} color="#C6BFFF" />
          <Environment preset="city" />
          <GlowSphere />
          <InnerCore />
        </Suspense>
      </Canvas>
    </div>
  );
}
