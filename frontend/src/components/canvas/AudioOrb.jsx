import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const AudioOrb = ({ analyser }) => {
  const pointsRef = useRef();
  
  // Higher count for a denser sphere
  const count = 800; 

  // 1. Generate Base Fibonacci Sphere Positions
  // We calculate this once to establish the "perfect" sphere shape
  const basePositions = useMemo(() => {
    const temp = [];
    const phi = Math.PI * (3 - Math.sqrt(5)); // Golden Angle

    for (let i = 0; i < count; i++) {
      const y = 1 - (i / (count - 1)) * 2; // y goes from 1 to -1
      const radiusAtY = Math.sqrt(1 - y * y);
      const theta = phi * i;

      const x = Math.cos(theta) * radiusAtY;
      const z = Math.sin(theta) * radiusAtY;

      // Store normalized (radius=1) coordinates
      temp.push(x, y, z);
    }
    return temp; // Array of [x, y, z, x, y, z...]
  }, [count]);

  useFrame((state) => {
    if (!pointsRef.current || !analyser) return;

    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(dataArray);

    const positions = pointsRef.current.geometry.attributes.position.array;
    const colors = pointsRef.current.geometry.attributes.color.array;

    // 2. Animate each particle
    for (let i = 0; i < count; i++) {
      // Map particle to frequency bin
      // Use modulus to wrap if we have more particles than data bins
      const binIndex = i % (dataArray.length);
      const value = dataArray[binIndex];
      
      // Normalize (0.0 to 1.0)
      const freqFactor = value / 255;

      // Base Radius + Pulse
      // We add a 'perlin-noise' style movement using sine waves and time
      const baseRadius = 2.2;
      const pulse = freqFactor * 1.5; 
      const currentRadius = baseRadius + pulse;

      // Retrieve base normalized position
      const bx = basePositions[i * 3];
      const by = basePositions[i * 3 + 1];
      const bz = basePositions[i * 3 + 2];

      // Apply new radius
      positions[i * 3] = bx * currentRadius;
      positions[i * 3 + 1] = by * currentRadius;
      positions[i * 3 + 2] = bz * currentRadius;

      // Dynamic Color: 
      // Quiet = Deep Blue/Cyan
      // Loud = Bright Neon Purple/Pink
      const color = new THREE.Color();
      color.setHSL(0.6 - (freqFactor * 0.4), 1, 0.4 + (freqFactor * 0.4));
      
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }

    pointsRef.current.geometry.attributes.position.needsUpdate = true;
    pointsRef.current.geometry.attributes.color.needsUpdate = true;
    
    // Slow rotation
    pointsRef.current.rotation.y += 0.003;
    pointsRef.current.rotation.z += 0.001;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute 
          attach="attributes-position" 
          count={count} 
          array={new Float32Array(count * 3)} 
          itemSize={3} 
        />
        <bufferAttribute 
          attach="attributes-color" 
          count={count} 
          array={new Float32Array(count * 3)} 
          itemSize={3} 
        />
      </bufferGeometry>
      <pointsMaterial 
        size={0.12} 
        vertexColors 
        transparent 
        opacity={0.9} 
        sizeAttenuation={true} 
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
};

export default AudioOrb;