import React, { Suspense, useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Line, Sparkles, Stars, useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { useSimulation } from '../../context/SimulationContext';

// ---------------------------------------------------------------------------
// Realistic Earth Surface Shader (Optimized for Dashboard Constellation)
// ---------------------------------------------------------------------------
const earthVert = /* glsl */ `
  varying vec3 vNormal;
  varying vec2 vUv;
  varying vec3 vWorldNormal;
  varying vec3 vWorldPosition;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPos.xyz;
    vUv = uv;
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

const earthFrag = /* glsl */ `
  uniform sampler2D dayMap;
  uniform sampler2D nightMap;
  uniform sampler2D cloudMap;
  uniform vec3 sunDirection;

  varying vec3 vNormal;
  varying vec2 vUv;
  varying vec3 vWorldNormal;
  varying vec3 vWorldPosition;

  void main() {
    vec3 n = normalize(vWorldNormal);
    vec3 sun = normalize(sunDirection);
    vec3 viewDir = normalize(cameraPosition - vWorldPosition);
    float ndl = dot(n, sun);
    
    // Left-edge crescent terminator
    float dayMask = smoothstep(-0.12, 0.22, ndl);

    vec3 dayTex = texture2D(dayMap, vUv).rgb;
    vec3 lightsTex = texture2D(nightMap, vUv).rgb;
    float clouds = texture2D(cloudMap, vUv).r;

    // Glowing golden city lights
    vec3 goldenCityLights = pow(lightsTex, vec3(0.72)) * vec3(2.5, 1.9, 1.1) * 2.0;
    vec3 nightOcean = vec3(0.003, 0.008, 0.024);
    
    vec3 nightColor = nightOcean + goldenCityLights;
    nightColor = mix(nightColor, vec3(0.035, 0.075, 0.15), clouds * 0.4);

    vec3 dayColor = mix(dayTex * 0.88, vec3(0.96, 0.98, 1.0), clouds * 0.82);
    vec3 surface = mix(nightColor, dayColor, dayMask);

    // Rayleigh scattering along left sun-facing horizon
    float fresnel = pow(1.0 - max(dot(n, viewDir), 0.0), 2.5);
    float sunFacing = max(dot(n, sun), -0.2) + 0.2;
    vec3 atmoRayleigh = vec3(0.05, 0.72, 1.0) * fresnel * (0.6 + 2.0 * sunFacing);

    gl_FragColor = vec4(surface + atmoRayleigh, 1.0);
  }
`;

function SmallSatellite({ name = 'SAT', beaconColor = '#00BFFF' }: { name?: string; beaconColor?: string }) {
  return (
    <group name={name} scale={0.32}>
      {/* Gold MLI chassis */}
      <mesh>
        <boxGeometry args={[0.15, 0.12, 0.2]} />
        <meshStandardMaterial color="#d4af37" metalness={0.92} roughness={0.25} emissive="#2a2002" emissiveIntensity={0.2} />
      </mesh>
      {/* Left solar array */}
      <group position={[0.26, 0, 0]}>
        <mesh>
          <boxGeometry args={[0.34, 0.12, 0.006]} />
          <meshStandardMaterial color="#072348" metalness={0.85} roughness={0.12} emissive="#00558f" emissiveIntensity={0.3} />
        </mesh>
      </group>
      {/* Right solar array */}
      <group position={[-0.26, 0, 0]}>
        <mesh>
          <boxGeometry args={[0.34, 0.12, 0.006]} />
          <meshStandardMaterial color="#072348" metalness={0.85} roughness={0.12} emissive="#00558f" emissiveIntensity={0.3} />
        </mesh>
      </group>
      {/* Glowing colored beacon dot */}
      <mesh position={[0, 0.075, 0.09]}>
        <sphereGeometry args={[0.022, 10, 10]} />
        <meshBasicMaterial color={beaconColor} />
      </mesh>
    </group>
  );
}

function OrbitLineAndCraft({
  a,
  b,
  speed,
  tilt,
  lineColor = '#00BFFF',
  name,
  startAngle = 0,
}: {
  a: number;
  b: number;
  speed: number;
  tilt: [number, number, number];
  lineColor?: string;
  name?: string;
  startAngle?: number;
}) {
  const craftRef = useRef<THREE.Group>(null);
  const angleRef = useRef(startAngle);

  const points = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    const segments = 180;
    for (let i = 0; i <= segments; i++) {
      const theta = (i / segments) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(theta) * a, 0, Math.sin(theta) * b));
    }
    pts.push(new THREE.Vector3(a, 0, 0));
    return pts;
  }, [a, b]);

  useFrame((_, delta) => {
    angleRef.current += delta * speed;
    if (craftRef.current) {
      const x = Math.cos(angleRef.current) * a;
      const z = Math.sin(angleRef.current) * b;
      craftRef.current.position.set(x, 0, z);

      const tx = -Math.sin(angleRef.current) * a;
      const tz = Math.cos(angleRef.current) * b;
      craftRef.current.rotation.y = Math.atan2(-tz, tx);
    }
  });

  return (
    <group rotation={tilt}>
      <Line
        points={points}
        color={lineColor}
        transparent
        opacity={0.55}
        lineWidth={1.4}
        depthTest={false}
        renderOrder={10}
      />
      <group ref={craftRef}>
        <group rotation={[0.2, 0.25, 0.1]}>
          <SmallSatellite name={name} beaconColor={lineColor} />
        </group>
      </group>
    </group>
  );
}

function DashboardEarth() {
  const earthRef = useRef<THREE.Mesh>(null);
  const sunDir = useMemo(() => new THREE.Vector3(-4.2, 0.3, -1.6).normalize(), []);

  const [dayMap, nightMap, cloudMap] = useTexture([
    'https://cdn.jsdelivr.net/gh/mrdoob/three.js@r128/examples/textures/planets/earth_atmos_2048.jpg',
    'https://cdn.jsdelivr.net/gh/mrdoob/three.js@r128/examples/textures/planets/earth_lights_2048.png',
    'https://cdn.jsdelivr.net/gh/mrdoob/three.js@r128/examples/textures/planets/earth_clouds_1024.png',
  ]);

  const { gl } = useThree();
  useEffect(() => {
    const maxAniso = gl.capabilities.getMaxAnisotropy();
    [dayMap, nightMap, cloudMap].forEach((tex) => {
      tex.anisotropy = maxAniso;
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.needsUpdate = true;
    });
  }, [gl, dayMap, nightMap, cloudMap]);

  const earthMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          dayMap: { value: dayMap },
          nightMap: { value: nightMap },
          cloudMap: { value: cloudMap },
          sunDirection: { value: sunDir },
        },
        vertexShader: earthVert,
        fragmentShader: earthFrag,
      }),
    [dayMap, nightMap, cloudMap, sunDir],
  );

  useFrame((_, delta) => {
    if (earthRef.current) {
      earthRef.current.rotation.y += delta * 0.01;
    }
  });

  return (
    <mesh ref={earthRef} rotation={[0.38, 4.45, -0.12]}>
      <sphereGeometry args={[1.38, 80, 80]} />
      <primitive object={earthMaterial} attach="material" />
    </mesh>
  );
}

function DashboardFallback() {
  return (
    <mesh>
      <sphereGeometry args={[1.38, 36, 36]} />
      <meshStandardMaterial color="#04101e" emissive="#020812" />
    </mesh>
  );
}

export const DashboardGlobe3D: React.FC = () => {
  const { satellitesData } = useSimulation();

  // Dynamically generate orbit parameters for all satellites in the fleet
  const dynamicOrbits = useMemo(() => {
    const defaultConfigs: Record<string, { a: number; b: number; speed: number; tilt: [number, number, number]; startAngle: number; color: string }> = {
      'SAT-001': { a: 1.98, b: 1.62, speed: 0.16, tilt: [0.72, -0.48, 0.35], startAngle: 2.4, color: '#00BFFF' },
      'SAT-002': { a: 2.12, b: 1.75, speed: 0.14, tilt: [-0.55, 0.65, -0.2], startAngle: -0.8, color: '#EF4444' },
      'SAT-003': { a: 2.28, b: 1.88, speed: 0.11, tilt: [1.18, 0.25, 0.15], startAngle: -1.7, color: '#8B5CF6' },
      'SAT-004': { a: 1.88, b: 1.55, speed: 0.18, tilt: [-0.8, -0.3, 0.6], startAngle: 0.5, color: '#F59E0B' },
    };

    const satList = Object.values(satellitesData);
    return satList.map((sat, idx) => {
      if (defaultConfigs[sat.id]) {
        return {
          id: sat.id,
          name: sat.name,
          ...defaultConfigs[sat.id],
          color: sat.color || defaultConfigs[sat.id].color,
        };
      }
      
      // Compute orbital line for custom added satellite
      const isGeo = (sat.orbitType || '').toUpperCase() === 'GEO';
      const baseRadius = isGeo ? 2.45 : 1.9 + (idx % 4) * 0.12;
      const speed = isGeo ? 0.09 : 0.15 - (idx * 0.01);
      const tiltX = (idx * 0.6) % 1.4;
      const tiltY = ((idx * 0.4) % 1.2) - 0.5;
      const tiltZ = ((idx * 0.3) % 0.8);

      return {
        id: sat.id,
        name: sat.name,
        a: baseRadius,
        b: baseRadius * 0.85,
        speed: Math.max(0.08, speed),
        tilt: [tiltX, tiltY, tiltZ] as [number, number, number],
        startAngle: (idx * 1.5) % (Math.PI * 2),
        color: sat.color || '#10B981',
      };
    });
  }, [satellitesData]);

  return (
    <div className="w-full h-full min-h-[280px] relative select-none">
      <Canvas
        camera={{ position: [0, 0.05, 5.0], fov: 36 }}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        dpr={[1, 2]}
        style={{ background: 'transparent' }}
      >
        <ambientLight intensity={0.25} />
        <directionalLight position={[-4.5, 1.2, -2.2]} intensity={1.5} color="#dbeafe" />
        <pointLight position={[3, -1, 3]} intensity={0.5} color="#00eaff" />

        <Suspense fallback={<DashboardFallback />}>
          <DashboardEarth />
        </Suspense>

        {/* Dynamic 3D Orbits for ALL registered satellites */}
        {dynamicOrbits.map((orb) => (
          <OrbitLineAndCraft
            key={orb.id}
            a={orb.a}
            b={orb.b}
            speed={orb.speed}
            tilt={orb.tilt}
            lineColor={orb.color}
            name={orb.name}
            startAngle={orb.startAngle}
          />
        ))}

        <Sparkles count={30} scale={6.0} size={1.6} speed={0.15} color="#7dd3fc" opacity={0.35} />
        <Stars radius={60} depth={40} count={1400} factor={2.4} saturation={0} fade speed={0.2} />
      </Canvas>
    </div>
  );
};
