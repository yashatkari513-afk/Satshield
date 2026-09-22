import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Line, Sparkles, Stars, useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { Radio, SatelliteDish } from 'lucide-react';
import { useTelemetry } from '../../context/TelemetryContext';

// ---------------------------------------------------------------------------
// Luminous Cyan Aerospace Atmosphere Glow Outer Shell
// ---------------------------------------------------------------------------
const atmoGlowVert = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vPosition;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vPosition = mvPosition.xyz;
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const atmoGlowFrag = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vPosition;

  void main() {
    vec3 viewDir = normalize(-vPosition);
    float rim = 1.0 - max(dot(viewDir, vNormal), 0.0);
    // Smooth atmospheric Rayleigh scattering falloff with no hard outer border
    float glow = pow(rim, 3.4);
    vec3 glowColor = vec3(0.02, 0.76, 1.0);
    gl_FragColor = vec4(glowColor, glow * 0.88);
  }
`;

// Coordinate conversion: Latitude / Longitude to 3D Cartesian coordinates on sphere
function latLonToVector3(latDeg: number, lonDeg: number, radius = 1.464) {
  const phi = (90 - latDeg) * (Math.PI / 180);
  const theta = (lonDeg + 180) * (Math.PI / 180);
  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);
  return new THREE.Vector3(x, y, z);
}

const GROUND_STATIONS = [
  { name: 'GS-MADRID', lat: 40.42, lon: -3.7, color: '#00ff9d' },
  { name: 'GS-GOLDSTONE', lat: 35.42, lon: -116.88, color: '#00eaff' },
  { name: 'GS-CANBERRA', lat: -35.30, lon: 149.12, color: '#00eaff' },
  { name: 'GS-SVALBARD', lat: 78.22, lon: 15.65, color: '#38bdf8' },
];

function RealisticEarth() {
  const earthRef = useRef<THREE.Mesh>(null);
  const cloudsRef = useRef<THREE.Mesh>(null);

  const [dayMap, normalMap, specularMap, cloudMap, nightMap] = useTexture([
    'https://cdn.jsdelivr.net/gh/mrdoob/three.js@r128/examples/textures/planets/earth_atmos_2048.jpg',
    'https://cdn.jsdelivr.net/gh/mrdoob/three.js@r128/examples/textures/planets/earth_normal_2048.jpg',
    'https://cdn.jsdelivr.net/gh/mrdoob/three.js@r128/examples/textures/planets/earth_specular_2048.jpg',
    'https://cdn.jsdelivr.net/gh/mrdoob/three.js@r128/examples/textures/planets/earth_clouds_1024.png',
    'https://cdn.jsdelivr.net/gh/mrdoob/three.js@r128/examples/textures/planets/earth_lights_2048.png',
  ]);

  const { gl } = useThree();
  useEffect(() => {
    const maxAniso = gl.capabilities.getMaxAnisotropy();
    [dayMap, normalMap, specularMap, cloudMap, nightMap].forEach((tex) => {
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.ClampToEdgeWrapping;
      tex.anisotropy = maxAniso;
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.needsUpdate = true;
    });
  }, [gl, dayMap, normalMap, specularMap, cloudMap, nightMap]);

  const glowMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: atmoGlowVert,
        fragmentShader: atmoGlowFrag,
        side: THREE.FrontSide,
        blending: THREE.AdditiveBlending,
        transparent: true,
        depthWrite: false,
      }),
    [],
  );

  useFrame((_, delta) => {
    if (earthRef.current) {
      earthRef.current.rotation.y += delta * 0.007;
    }
    if (cloudsRef.current) {
      // Gentle cloud drift over the planet surface gives authentic 3D parallax
      cloudsRef.current.rotation.y += delta * 0.010;
    }
  });

  return (
    <group>
      {/* ── 1. Photorealistic NASA PBR Earth Surface (Terrain Bump, Specular Oceans, Night Cities) ── */}
      <mesh ref={earthRef} rotation={[0.26, 4.35, -0.06]}>
        <sphereGeometry args={[1.46, 96, 96]} />
        <meshStandardMaterial
          map={dayMap}
          normalMap={normalMap}
          normalScale={new THREE.Vector2(0.85, 0.85)}
          roughnessMap={specularMap}
          roughness={0.65}
          metalness={0.08}
          emissiveMap={nightMap}
          emissive={new THREE.Color('#ffc266')}
          emissiveIntensity={0.62}
        />

        {/* Tactical Deep Space Ground Stations with Pulsing Radios */}
        {GROUND_STATIONS.map((gs) => {
          const pos = latLonToVector3(gs.lat, gs.lon, 1.464);
          return (
            <group key={gs.name} position={pos}>
              {/* Ground Station Terminal Beacon */}
              <mesh>
                <sphereGeometry args={[0.016, 12, 12]} />
                <meshBasicMaterial color={gs.color} />
              </mesh>
              {/* Radio Transmission Waves */}
              <mesh rotation={[Math.PI / 2, 0, 0]}>
                <ringGeometry args={[0.024, 0.036, 24]} />
                <meshBasicMaterial color={gs.color} transparent opacity={0.65} depthWrite={false} />
              </mesh>
            </group>
          );
        })}
      </mesh>

      {/* ── 2. Real Non-Pixelated 3D Clouds (Smooth Continuous Alpha Blending) ── */}
      <mesh ref={cloudsRef} rotation={[0.26, 4.35, -0.06]}>
        <sphereGeometry args={[1.464, 96, 96]} />
        <meshStandardMaterial
          map={cloudMap}
          transparent={true}
          opacity={0.34}
          blending={THREE.NormalBlending}
          depthWrite={false}
        />
      </mesh>

      {/* ── 3. Luminous Cyan Aerospace Atmosphere Glow ── */}
      <mesh>
        <sphereGeometry args={[1.472, 96, 96]} />
        <primitive object={glowMaterial} attach="material" />
      </mesh>
    </group>
  );
}

// ---------------------------------------------------------------------------
// High-Detail Photorealistic 3D Satellite Model
// ---------------------------------------------------------------------------
function SatelliteCraft({ name = 'SATCOM', beaconColor = '#00BFFF' }: { name?: string; beaconColor?: string }) {
  const beaconRef = useRef<THREE.PointLight>(null);
  const dishRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (beaconRef.current) {
      beaconRef.current.intensity = 0.5 + Math.sin(t * 5.0) * 0.25;
    }
    if (dishRef.current) {
      // Subtle gimbal tracking oscillation
      dishRef.current.rotation.y = 0.15 + Math.sin(t * 0.8) * 0.08;
    }
  });

  return (
    <group name={name} scale={0.16}>
      {/* ── 1. MAIN SPACECRAFT BUS (Gold Foil MLI Blanket) ── */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[0.22, 0.16, 0.28]} />
        <meshStandardMaterial
          color="#eab308"
          metalness={0.92}
          roughness={0.22}
          emissive="#713f12"
          emissiveIntensity={0.15}
        />
      </mesh>

      {/* Equipment Service Deck Plates (Top & Bottom) */}
      <mesh position={[0, 0.082, 0]}>
        <boxGeometry args={[0.20, 0.01, 0.26]} />
        <meshStandardMaterial color="#f8fafc" metalness={0.95} roughness={0.18} />
      </mesh>
      <mesh position={[0, -0.082, 0]}>
        <boxGeometry args={[0.20, 0.01, 0.26]} />
        <meshStandardMaterial color="#1e293b" metalness={0.9} roughness={0.3} />
      </mesh>

      {/* Radiator Thermal Louver Panels (Port & Starboard) */}
      <mesh position={[0.112, 0, 0]}>
        <boxGeometry args={[0.006, 0.13, 0.22]} />
        <meshStandardMaterial color="#cbd5e1" metalness={0.95} roughness={0.15} />
      </mesh>
      <mesh position={[-0.112, 0, 0]}>
        <boxGeometry args={[0.006, 0.13, 0.22]} />
        <meshStandardMaterial color="#cbd5e1" metalness={0.95} roughness={0.15} />
      </mesh>

      {/* ── 2. DUAL 3D PHOTOVOLTAIC SOLAR ARRAY WINGS ── */}
      
      {/* Left Wing (Port) */}
      <group position={[0.11, 0, 0]}>
        {/* Support Strut / Yoke */}
        <mesh position={[0.06, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.012, 0.012, 0.12, 10]} />
          <meshStandardMaterial color="#475569" metalness={0.95} roughness={0.2} />
        </mesh>
        {/* Panel 1 */}
        <group position={[0.26, 0, 0]}>
          <mesh>
            <boxGeometry args={[0.26, 0.18, 0.008]} />
            <meshStandardMaterial color="#020617" metalness={0.9} roughness={0.3} />
          </mesh>
          <mesh position={[0, 0, 0.005]}>
            <boxGeometry args={[0.25, 0.17, 0.004]} />
            <meshStandardMaterial
              color="#0f2b4c"
              metalness={0.88}
              roughness={0.12}
              emissive="#0369a1"
              emissiveIntensity={0.25}
            />
          </mesh>
        </group>
        {/* Panel 2 */}
        <group position={[0.54, 0, 0]}>
          <mesh>
            <boxGeometry args={[0.26, 0.18, 0.008]} />
            <meshStandardMaterial color="#020617" metalness={0.9} roughness={0.3} />
          </mesh>
          <mesh position={[0, 0, 0.005]}>
            <boxGeometry args={[0.25, 0.17, 0.004]} />
            <meshStandardMaterial
              color="#0f2b4c"
              metalness={0.88}
              roughness={0.12}
              emissive="#0369a1"
              emissiveIntensity={0.25}
            />
          </mesh>
        </group>
      </group>

      {/* Right Wing (Starboard) */}
      <group position={[-0.11, 0, 0]}>
        {/* Support Strut / Yoke */}
        <mesh position={[-0.06, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.012, 0.012, 0.12, 10]} />
          <meshStandardMaterial color="#475569" metalness={0.95} roughness={0.2} />
        </mesh>
        {/* Panel 1 */}
        <group position={[-0.26, 0, 0]}>
          <mesh>
            <boxGeometry args={[0.26, 0.18, 0.008]} />
            <meshStandardMaterial color="#020617" metalness={0.9} roughness={0.3} />
          </mesh>
          <mesh position={[0, 0, 0.005]}>
            <boxGeometry args={[0.25, 0.17, 0.004]} />
            <meshStandardMaterial
              color="#0f2b4c"
              metalness={0.88}
              roughness={0.12}
              emissive="#0369a1"
              emissiveIntensity={0.25}
            />
          </mesh>
        </group>
        {/* Panel 2 */}
        <group position={[-0.54, 0, 0]}>
          <mesh>
            <boxGeometry args={[0.26, 0.18, 0.008]} />
            <meshStandardMaterial color="#020617" metalness={0.9} roughness={0.3} />
          </mesh>
          <mesh position={[0, 0, 0.005]}>
            <boxGeometry args={[0.25, 0.17, 0.004]} />
            <meshStandardMaterial
              color="#0f2b4c"
              metalness={0.88}
              roughness={0.12}
              emissive="#0369a1"
              emissiveIntensity={0.25}
            />
          </mesh>
        </group>
      </group>

      {/* ── 3. HIGH-GAIN PARABOLIC DISH ANTENNA (Tracking Earth) ── */}
      <group ref={dishRef} position={[0, 0.12, 0.05]} rotation={[-0.45, 0.2, 0]}>
        <mesh>
          <cylinderGeometry args={[0.09, 0.02, 0.035, 24, 1, true]} />
          <meshStandardMaterial color="#f8fafc" metalness={0.88} roughness={0.2} side={THREE.DoubleSide} />
        </mesh>
        {/* Feed Horn Boom */}
        <mesh position={[0, 0.045, 0]}>
          <cylinderGeometry args={[0.008, 0.004, 0.035, 10]} />
          <meshStandardMaterial color="#d4af37" metalness={0.95} roughness={0.15} />
        </mesh>
      </group>

      {/* ── 4. NADIR EARTH-FACING OPTICAL PAYLOAD ── */}
      <group position={[0, -0.095, 0.06]} rotation={[Math.PI, 0, 0]}>
        <mesh>
          <cylinderGeometry args={[0.04, 0.05, 0.045, 20]} />
          <meshStandardMaterial color="#0f172a" metalness={0.95} roughness={0.15} />
        </mesh>
        {/* Optical Aperture Lens */}
        <mesh position={[0, 0.024, 0]}>
          <cylinderGeometry args={[0.036, 0.036, 0.004, 20]} />
          <meshStandardMaterial color="#00eaff" emissive="#00b4d8" emissiveIntensity={0.65} />
        </mesh>
      </group>

      {/* ── 5. MAIN APOGEE ENGINE BELL (Aft Propulsion) ── */}
      <group position={[0, 0, -0.15]} rotation={[Math.PI / 2, 0, 0]}>
        <mesh>
          <cylinderGeometry args={[0.048, 0.024, 0.06, 20, 1, true]} />
          <meshStandardMaterial color="#334155" metalness={0.95} roughness={0.2} side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[0, 0.015, 0]}>
          <cylinderGeometry args={[0.018, 0.012, 0.02, 12]} />
          <meshStandardMaterial color="#1e293b" metalness={0.9} />
        </mesh>
      </group>

      {/* ── 6. SIGNATURE TELEMETRY BEACON STROBE ── */}
      <pointLight ref={beaconRef} color={beaconColor} distance={1.2} intensity={0.65} />
      <mesh position={[0, 0.095, 0.11]}>
        <sphereGeometry args={[0.018, 14, 14]} />
        <meshBasicMaterial color={beaconColor} />
      </mesh>
      {/* Signature Color Accent Band on Spacecraft Body */}
      <mesh position={[0, 0, 0.02]}>
        <boxGeometry args={[0.224, 0.025, 0.284]} />
        <meshBasicMaterial color={beaconColor} transparent opacity={0.65} />
      </mesh>
    </group>
  );
}

// ---------------------------------------------------------------------------
// Elliptical & Inclined Orbital Trajectories matching reference image
// ---------------------------------------------------------------------------
function OrbitalTrajectory({
  a,
  b,
  speed,
  tilt,
  lineColor = '#38bdf8',
  name,
  startAngle = 0,
  isSelected = false,
  onSelect,
}: {
  a: number; // Semi-major axis
  b: number; // Semi-minor axis
  speed: number;
  tilt: [number, number, number];
  lineColor?: string;
  name?: string;
  startAngle?: number;
  isSelected?: boolean;
  onSelect?: () => void;
}) {
  const craftRef = useRef<THREE.Group>(null);
  const packetRef1 = useRef<THREE.Mesh>(null);
  const packetRef2 = useRef<THREE.Mesh>(null);
  const angleRef = useRef(startAngle);

  // Smooth ellipse curve points - seamless & unbroken
  const points = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    const segments = 240;
    for (let i = 0; i <= segments; i++) {
      const theta = (i / segments) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(theta) * a, 0, Math.sin(theta) * b));
    }
    pts.push(new THREE.Vector3(a, 0, 0)); // seamless loop closure
    return pts;
  }, [a, b]);

  useFrame((_, delta) => {
    angleRef.current += delta * speed;
    if (craftRef.current) {
      const x = Math.cos(angleRef.current) * a;
      const z = Math.sin(angleRef.current) * b;
      craftRef.current.position.set(x, 0, z);

      // Tangent vector for natural orbital orientation
      const tx = -Math.sin(angleRef.current) * a;
      const tz = Math.cos(angleRef.current) * b;
      craftRef.current.rotation.y = Math.atan2(-tz, tx);
    }

    // Telemetry photon packets traveling along orbit ahead & behind
    if (packetRef1.current) {
      const p1 = angleRef.current + 0.65;
      packetRef1.current.position.set(Math.cos(p1) * a, 0, Math.sin(p1) * b);
    }
    if (packetRef2.current) {
      const p2 = angleRef.current - 0.75;
      packetRef2.current.position.set(Math.cos(p2) * a, 0, Math.sin(p2) * b);
    }
  });

  return (
    <group rotation={tilt}>
      {/* Thin Glowing Orbital Trajectory Line - Highlights when selected */}
      <Line
        points={points}
        color={isSelected ? '#00f0ff' : lineColor}
        transparent
        opacity={isSelected ? 0.95 : 0.28}
        lineWidth={isSelected ? 2.4 : 1.15}
        depthTest={false}
        renderOrder={isSelected ? 20 : 10}
      />

      {/* Orbiting Telemetry Data Packets */}
      <mesh ref={packetRef1}>
        <sphereGeometry args={[0.014, 8, 8]} />
        <meshBasicMaterial color={lineColor} />
      </mesh>
      <mesh ref={packetRef2}>
        <sphereGeometry args={[0.01, 8, 8]} />
        <meshBasicMaterial color={lineColor} transparent opacity={0.65} />
      </mesh>
      
      {/* Spacecraft following orbital curve */}
      <group
        ref={craftRef}
        onClick={(e) => {
          e.stopPropagation();
          onSelect?.();
        }}
      >
        <group rotation={[0.2, 0.25, 0.1]}>
          <SatelliteCraft name={name} beaconColor={lineColor} />
        </group>

        {isSelected && (
          <group>
            {/* Active Target Reticle Ring */}
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <ringGeometry args={[0.035, 0.046, 32]} />
              <meshBasicMaterial color={lineColor} transparent opacity={0.9} depthTest={false} />
            </mesh>

            {/* Nadir Sensor Swath Conical Beam (Tracking Earth Surface) */}
            <mesh position={[0, -0.32, 0]} rotation={[0.2, 0, 0]}>
              <cylinderGeometry args={[0.015, 0.24, 0.64, 24, 1, true]} />
              <meshBasicMaterial
                color={lineColor}
                transparent
                opacity={0.12}
                side={THREE.DoubleSide}
                depthWrite={false}
              />
            </mesh>
            {/* Ground Swath Footprint Ring */}
            <mesh position={[0, -0.64, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <ringGeometry args={[0.22, 0.25, 32]} />
              <meshBasicMaterial color={lineColor} transparent opacity={0.45} depthWrite={false} />
            </mesh>
          </group>
        )}
      </group>
    </group>
  );
}

function SceneFallback() {
  return (
    <mesh>
      <sphereGeometry args={[1.46, 48, 48]} />
      <meshStandardMaterial color="#04101e" emissive="#020812" />
    </mesh>
  );
}

function SpaceScene({
  selectedSatelliteId,
  onSelectSatellite,
}: {
  selectedSatelliteId?: string;
  onSelectSatellite?: (id: string) => void;
}) {
  const isSat1 = !selectedSatelliteId || selectedSatelliteId === 'SAT-001' || selectedSatelliteId === 'AGIS-3';
  const isSat2 = selectedSatelliteId === 'SAT-002' || selectedSatelliteId === 'SENTINEL-9';
  const isSat3 = selectedSatelliteId === 'SAT-003' || selectedSatelliteId === 'ORBCOM-7';
  const isSat4 = selectedSatelliteId === 'SAT-004' || selectedSatelliteId === 'HELIOS-1';

  return (
    <>
      {/* Balanced Radiant Sunlight & Cosmic Space Fill */}
      <ambientLight intensity={0.58} color="#bae6fd" />
      <directionalLight position={[-3.6, 2.4, 3.8]} intensity={2.6} color="#fffcf0" />
      <directionalLight position={[3.8, -1.2, 1.5]} intensity={0.45} color="#38bdf8" />

      {/* Realistic 3D Earth Centerpiece with Night City Lights & Ground Stations */}
      <Suspense fallback={<SceneFallback />}>
        <RealisticEarth />
      </Suspense>

      {/* ── 4 DISTINCT ORBITAL PATHS WITH SATELLITES MATCHING DASHBOARD PALETTE ── */}
      
      {/* 1. AGIS-3 (SAT-001) - Electric Cyan (#00BFFF) */}
      <OrbitalTrajectory
        a={2.12}
        b={1.74}
        speed={0.16}
        tilt={[0.72, -0.48, 0.35]}
        lineColor="#00BFFF"
        name="AGIS-3"
        startAngle={2.4}
        isSelected={isSat1}
        onSelect={() => onSelectSatellite?.('SAT-001')}
      />

      {/* 2. SENTINEL-9 (SAT-002) - Crimson Red (#EF4444) */}
      <OrbitalTrajectory
        a={2.26}
        b={1.88}
        speed={0.13}
        tilt={[-0.55, 0.65, -0.2]}
        lineColor="#EF4444"
        name="SENTINEL-9"
        startAngle={-0.8}
        isSelected={isSat2}
        onSelect={() => onSelectSatellite?.('SAT-002')}
      />

      {/* 3. ORBCOM-7 (SAT-003) - Royal Violet (#8B5CF6) */}
      <OrbitalTrajectory
        a={1.98}
        b={1.78}
        speed={0.15}
        tilt={[1.18, 0.25, 0.15]}
        lineColor="#8B5CF6"
        name="ORBCOM-7"
        startAngle={-1.7}
        isSelected={isSat3}
        onSelect={() => onSelectSatellite?.('SAT-003')}
      />

      {/* 4. HELIOS-1 (SAT-004) - Solar Gold / Amber (#F59E0B) */}
      <OrbitalTrajectory
        a={2.42}
        b={2.32}
        speed={0.08}
        tilt={[0.12, 0.08, -0.25]}
        lineColor="#F59E0B"
        name="HELIOS-1"
        startAngle={0.6}
        isSelected={isSat4}
        onSelect={() => onSelectSatellite?.('SAT-004')}
      />

      {/* Deep Space Background Atmosphere & Dense Starfield */}
      <Sparkles count={85} scale={11.0} size={2.2} speed={0.22} color="#7dd3fc" opacity={0.55} />
      <Stars radius={80} depth={50} count={5500} factor={3.2} saturation={0.25} fade speed={0.35} />
      <Stars radius={130} depth={70} count={4000} factor={2.2} saturation={0.1} fade speed={0.18} />
    </>
  );
}

function formatCountdown(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}M ${String(s).padStart(2, '0')}S`;
}

const SATELLITE_CONFIGS = [
  { id: 'SAT-001', label: 'AGIS-3', color: '#00BFFF', type: 'SAR RADAR' },
  { id: 'SAT-002', label: 'SENTINEL-9', color: '#EF4444', type: 'THERMAL IR' },
  { id: 'SAT-003', label: 'ORBCOM-7', color: '#8B5CF6', type: 'OPTICAL IMAGER' },
  { id: 'SAT-004', label: 'HELIOS-1', color: '#F59E0B', type: 'SOLAR SENSOR' },
];

const SATELLITE_COLORS: Record<string, string> = {
  'SAT-001': '#00BFFF', // AGIS-3: Electric Cyan
  'SAT-002': '#EF4444', // SENTINEL-9: Crimson Red
  'SAT-003': '#8B5CF6', // ORBCOM-7: Royal Violet / Purple
  'SAT-004': '#F59E0B', // HELIOS-1: Solar Gold / Amber
};

interface HeroHUDProps {
  selectedSatelliteId?: string;
  onSelectSatellite?: (id: string) => void;
  aiEngineStatus?: {
    status: string;
    healthScore: number;
    anomalyRisk: number;
    prediction: string;
  };
}

export const HeroHUD: React.FC<HeroHUDProps> = ({
  selectedSatelliteId,
  onSelectSatellite,
  aiEngineStatus = {
    status: 'NOMINAL',
    healthScore: 96.8,
    anomalyRisk: 2.4,
    prediction: 'STABLE',
  },
}) => {
  const { satellites } = useTelemetry();
  const [internalSatId, setInternalSatId] = useState<string>(selectedSatelliteId || 'SAT-001');
  const activeSatId = selectedSatelliteId || internalSatId;
  const lead = satellites.find((s) => s.id === activeSatId) || satellites[0];
  const leadColor = SATELLITE_COLORS[lead?.id || 'SAT-001'] || '#00BFFF';
  const [secondsOffset, setSecondsOffset] = useState(0);

  const handleSelectSat = (id: string) => {
    setInternalSatId(id);
    onSelectSatellite?.(id);
  };

  useEffect(() => {
    const timer = setInterval(() => setSecondsOffset((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const rawPass = lead?.subsystems.aocs.groundStationPassCountdown ?? 252;
  const pass = Math.max(0, rawPass - secondsOffset);
  const isAnomaly = aiEngineStatus.status !== 'NOMINAL';

  // Real-time orbital coordinate tracking simulation
  const latTrack = (38.8 + Math.sin(secondsOffset * 0.1) * 14.5).toFixed(2);
  const lonTrack = (-77.0 + ((secondsOffset * 0.4) % 360) - 180).toFixed(2);

  return (
    <div className="relative w-full max-w-[600px] lg:max-w-[650px] aspect-square mx-auto select-none">
      {/* ── TOP SATELLITE TACTICAL COMMAND SWITCHER ── */}
      <div
        className="absolute -top-3 sm:-top-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 p-1 rounded-full z-30"
        style={{
          background: 'rgba(2, 6, 23, 0.92)',
          border: '1px solid rgba(56, 189, 248, 0.35)',
          backdropFilter: 'blur(16px)',
          boxShadow: '0 8px 30px rgba(0, 0, 0, 0.7), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
        }}
      >
        {SATELLITE_CONFIGS.map((sat) => {
          const isActive = activeSatId === sat.id;
          return (
            <button
              key={sat.id}
              type="button"
              onClick={() => handleSelectSat(sat.id)}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[9.5px] sm:text-[10.5px] font-mono-hud font-bold tracking-wider transition-all duration-200 cursor-pointer border-0"
              style={{
                background: isActive ? `${sat.color}25` : 'transparent',
                color: isActive ? '#ffffff' : '#94a3b8',
                border: isActive ? `1px solid ${sat.color}` : '1px solid transparent',
                boxShadow: isActive ? `0 0 14px ${sat.color}50` : 'none',
              }}
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{
                  backgroundColor: sat.color,
                  boxShadow: isActive ? `0 0 8px ${sat.color}` : 'none',
                }}
              />
              <span>{sat.label}</span>
            </button>
          );
        })}
      </div>

      {/* 3D WebGL Canvas */}
      <div className="absolute inset-0">
        <Canvas
          camera={{ position: [0, 0.05, 5.8], fov: 36 }}
          gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
          dpr={[1, 2]}
          style={{ background: 'transparent' }}
        >
          <SpaceScene
            selectedSatelliteId={activeSatId}
            onSelectSatellite={handleSelectSat}
          />
        </Canvas>
      </div>

      {/* ----------------------------------------------------------- */}
      {/* CARD 0 (Top-Left): AI HEALTH ENGINE (Glassmorphism card) */}
      {/* ----------------------------------------------------------- */}
      <div
        className="absolute top-[4%] left-[-2%] sm:left-[0%] w-[185px] sm:w-[210px] rounded-xl p-3.5 animate-float z-20"
        style={{
          background: 'rgba(0, 0, 0, 0.88)',
          border: isAnomaly ? '1px solid rgba(239, 68, 68, 0.55)' : '1px solid rgba(0, 217, 255, 0.35)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          boxShadow: isAnomaly
            ? '0 12px 35px rgba(239, 68, 68, 0.25), inset 0 0 15px rgba(239, 68, 68, 0.15)'
            : '0 12px 35px rgba(0, 0, 0, 0.7), 0 0 20px rgba(0, 217, 255, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
        }}
      >
        <div className="flex items-center justify-between pb-2 border-b border-white/10">
          <span className="font-mono-hud text-[9px] font-bold tracking-[0.2em] uppercase text-[#7dd3fc]">
            AI HEALTH ENGINE
          </span>
          <span
            className="w-2 h-2 rounded-full animate-pulse"
            style={{
              backgroundColor: isAnomaly ? '#ef4444' : '#00ff9d',
              boxShadow: isAnomaly ? '0 0 8px #ef4444' : '0 0 8px #00ff9d',
            }}
          />
        </div>

        <div className="mt-2 space-y-1.5 font-sans text-xs">
          <div className="flex items-center justify-between text-[10.5px]">
            <span className="text-slate-400">System Status</span>
            <span
              className="font-bold uppercase tracking-wider text-[9.5px] px-1.5 py-0.5 rounded"
              style={{
                color: isAnomaly ? '#ff4d4d' : '#00ff9d',
                background: isAnomaly ? 'rgba(239, 68, 68, 0.15)' : 'rgba(0, 255, 157, 0.12)',
              }}
            >
              {aiEngineStatus.status}
            </span>
          </div>

          <div className="flex items-center justify-between text-[10.5px]">
            <span className="text-slate-400">Health Score</span>
            <span className="font-bold text-white font-mono">{aiEngineStatus.healthScore}%</span>
          </div>

          <div className="flex items-center justify-between text-[10.5px]">
            <span className="text-slate-400">Anomaly Risk</span>
            <span
              className="font-bold font-mono"
              style={{ color: aiEngineStatus.anomalyRisk > 50 ? '#ef4444' : '#38bdf8' }}
            >
              {aiEngineStatus.anomalyRisk}%
            </span>
          </div>

          <div className="pt-1.5 border-t border-white/5">
            <div className="text-[8.5px] uppercase tracking-wider text-slate-400 font-semibold">PREDICTION</div>
            <div
              className="font-bold text-[10px] tracking-wide truncate mt-0.5"
              style={{ color: isAnomaly ? '#f87171' : '#00eaff' }}
            >
              {aiEngineStatus.prediction}
            </div>
          </div>
        </div>
      </div>

      {/* ----------------------------------------------------------- */}
      {/* CARD 1 (Top-Right): ORBIT TELEMETRY */}
      {/* ----------------------------------------------------------- */}
      <div
        className="absolute top-[4%] right-[-1%] sm:right-[1%] w-[184px] sm:w-[208px] rounded-lg px-4 py-3 animate-float z-20"
        style={{
          background: 'rgba(0, 0, 0, 0.88)',
          border: `1px solid ${leadColor}55`,
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          boxShadow: `0 10px 30px rgba(0, 0, 0, 0.7), 0 0 15px ${leadColor}25`,
        }}
      >
        <div className="flex items-center justify-between font-mono-hud text-[9.5px] font-semibold tracking-[0.2em] uppercase" style={{ color: leadColor }}>
          <span>{lead?.name} • ORBIT</span>
          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: leadColor, boxShadow: `0 0 8px ${leadColor}` }} />
        </div>
        <div className="mt-2 text-[11px] font-mono-hud text-white tracking-wider flex items-center gap-1.5">
          <span>ALT: <strong className="font-bold">{lead?.subsystems.aocs.altitude.toFixed(0)} KM</strong></span>
          <span className="text-slate-600">|</span>
          <span>VEL: <strong className="font-bold" style={{ color: leadColor }}>7.66 KM/S</strong></span>
        </div>
        {/* Glowing Telemetry Bar */}
        <div className="mt-2.5 h-[3.5px] rounded-full overflow-hidden bg-slate-800/80">
          <div
            className="h-full rounded-full"
            style={{
              width: `${lead?.subsystems.power.batteryCharge || 92}%`,
              background: leadColor,
              boxShadow: `0 0 10px ${leadColor}`,
            }}
          />
        </div>
      </div>

      {/* ----------------------------------------------------------- */}
      {/* CARD 2 (Middle-Right): NEXT GROUND PASS with Green Radar Icon */}
      {/* ----------------------------------------------------------- */}
      <div
        className="absolute top-[43%] right-[-3%] sm:right-[-2%] w-[196px] sm:w-[214px] rounded-lg px-3.5 py-3 animate-float flex items-center gap-3 z-20"
        style={{
          animationDelay: '1.2s',
          background: 'rgba(3, 10, 24, 0.88)',
          border: '1px solid rgba(0, 217, 255, 0.28)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.06)',
        }}
      >
        {/* Green Circular Radar/Pass Icon */}
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
          style={{
            background: 'rgba(0, 255, 157, 0.12)',
            border: '1px solid rgba(0, 255, 157, 0.5)',
            boxShadow: '0 0 12px rgba(0, 255, 157, 0.3)',
          }}
        >
          <Radio className="w-4 h-4 text-[#00ff9d]" />
        </div>
        <div>
          <div className="font-mono-hud text-[8.5px] font-semibold tracking-[0.18em] uppercase text-[#94a3b8]">
            NEXT GROUND PASS
          </div>
          <div className="mt-0.5 font-mono-hud text-[12px] font-bold text-white tracking-wide">
            GS-MADRID IN <span className="text-[#00eaff]">{formatCountdown(pass)}</span>
          </div>
        </div>
      </div>

      {/* ----------------------------------------------------------- */}
      {/* CARD 3 (Bottom-Right): ELEMENTS & GROUND TRACK COORDINATES */}
      {/* ----------------------------------------------------------- */}
      <div
        className="absolute bottom-[8%] right-[1%] sm:right-[3%] w-[196px] sm:w-[218px] rounded-lg px-3.5 py-3 animate-float flex items-center gap-3 z-20"
        style={{
          animationDelay: '2.4s',
          background: 'rgba(3, 10, 24, 0.88)',
          border: '1px solid rgba(0, 217, 255, 0.28)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.06)',
        }}
      >
        {/* Cyan Dish Icon */}
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
          style={{
            background: 'rgba(0, 217, 255, 0.12)',
            border: '1px solid rgba(0, 217, 255, 0.45)',
            boxShadow: '0 0 12px rgba(0, 217, 255, 0.25)',
          }}
        >
          <SatelliteDish className="w-4 h-4 text-[#00eaff]" />
        </div>
        <div>
          <div className="font-mono-hud text-[8.5px] font-semibold tracking-[0.18em] uppercase text-[#94a3b8]">
            ELEMENTS & TRACK
          </div>
          <div className="mt-0.5 font-mono-hud text-[10.5px] font-bold text-white tracking-wide flex items-center gap-1.5">
            <span>INC: <span className="text-[#00eaff]">51.6°</span></span>
            <span className="text-slate-600">|</span>
            <span>ECC: <span className="text-[#F59E0B]">0.0005</span></span>
          </div>
          <div className="mt-0.5 font-mono-hud text-[9px] text-[#7dd3fc] tracking-wider">
            POS: {latTrack}°N, {lonTrack}°E
          </div>
        </div>
      </div>

      {/* ── BOTTOM LIVE AVIONICS TELEMETRY RIBBON ── */}
      <div
        className="absolute -bottom-3 sm:-bottom-4 left-1/2 -translate-x-1/2 flex items-center justify-between gap-3 sm:gap-6 px-4 py-1.5 rounded-lg z-30 text-[9px] sm:text-[9.5px] font-mono-hud whitespace-nowrap"
        style={{
          background: 'rgba(2, 6, 23, 0.94)',
          border: '1px solid rgba(0, 217, 255, 0.32)',
          backdropFilter: 'blur(16px)',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.7), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
        }}
      >
        <div className="flex items-center gap-1.5 text-slate-300">
          <span className="w-1.5 h-1.5 rounded-full bg-[#00ff9d] animate-pulse" />
          <span>UPLINK: <strong className="text-white">GS-MADRID (142 Mbps)</strong></span>
        </div>
        <div className="hidden sm:flex items-center gap-2.5 text-slate-300">
          <span>BUS: <strong className="text-[#38bdf8]">28.4V</strong></span>
          <span className="text-slate-600">•</span>
          <span>SOLAR: <strong className="text-[#f59e0b]">4.28 kW</strong></span>
          <span className="text-slate-600">•</span>
          <span>AOCS: <strong className="text-[#00ff9d]">0.008° NADIR</strong></span>
        </div>
      </div>
    </div>
  );
};
