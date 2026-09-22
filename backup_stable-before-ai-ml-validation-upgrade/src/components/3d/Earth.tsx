import React, { useRef, useMemo, useEffect, Suspense } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useTexture } from '@react-three/drei';

// ---------------------------------------------------------------------------
// Custom GLSL Atmosphere Shader — Rayleigh-scattering blue rim
// ---------------------------------------------------------------------------
const atmosphereVert = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vPosition;
  void main() {
    vNormal   = normalize(normalMatrix * normal);
    vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const atmosphereFrag = /* glsl */ `
  uniform vec3  sunDirection;
  uniform vec3  glowColor;
  uniform float intensity;
  varying vec3  vNormal;
  varying vec3  vPosition;

  void main() {
    vec3  viewDir    = normalize(-vPosition);
    float rim        = 1.0 - max(dot(viewDir, vNormal), 0.0);
    rim              = pow(rim, 3.2);
    float sunFacing  = max(dot(normalize(sunDirection), vNormal), 0.0);
    float glow       = rim * intensity * (0.55 + 0.45 * sunFacing);
    gl_FragColor     = vec4(glowColor * glow, glow * 0.85);
  }
`;

// ---------------------------------------------------------------------------
// Day/Night terminator shader for Earth surface
// ---------------------------------------------------------------------------
const earthVert = /* glsl */ `
  varying vec3 vNormal;
  varying vec2 vUv;
  varying vec3 vPosition;

  void main() {
    vNormal     = normalize(normalMatrix * normal);
    vUv         = uv;
    vPosition   = (modelViewMatrix * vec4(position, 1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const earthFrag = /* glsl */ `
  uniform sampler2D dayMap;
  uniform sampler2D nightMap;
  uniform vec3      sunDirection;
  varying vec3      vNormal;
  varying vec2      vUv;

  void main() {
    float cosAngle    = dot(normalize(vNormal), normalize(sunDirection));
    float blendFactor = smoothstep(-0.15, 0.25, cosAngle);

    vec4 dayColor   = texture2D(dayMap,   vUv);
    vec4 nightColor = texture2D(nightMap, vUv) * 0.85;

    gl_FragColor = mix(nightColor, dayColor, blendFactor);
  }
`;

// ---------------------------------------------------------------------------
// Inner Earth component — requires texture loading (wrapped in Suspense)
// ---------------------------------------------------------------------------
const EarthInner: React.FC = () => {
  const earthRef  = useRef<THREE.Mesh>(null);
  const cloudsRef = useRef<THREE.Mesh>(null);

  // Sun direction — matches directional light in SpaceScene
  const sunDir = useMemo(() => new THREE.Vector3(10, 8, 5).normalize(), []);

  // Real NASA / three.js repository textures (CDN-hosted, no local files needed)
  const [dayMap, nightMap, cloudMap, bumpMap] = useTexture([
    'https://cdn.jsdelivr.net/gh/mrdoob/three.js@r128/examples/textures/planets/earth_atmos_2048.jpg',
    'https://cdn.jsdelivr.net/gh/mrdoob/three.js@r128/examples/textures/planets/earth_lights_2048.png',
    'https://cdn.jsdelivr.net/gh/mrdoob/three.js@r128/examples/textures/planets/earth_clouds_1024.png',
    'https://cdn.jsdelivr.net/gh/mrdoob/three.js@r128/examples/textures/planets/earth_normal_2048.jpg',
  ]);

  // Enable anisotropic filtering for sharper detail at oblique angles
  const { gl } = useThree();
  useEffect(() => {
    const maxAniso = gl.capabilities.getMaxAnisotropy();
    [dayMap, nightMap, cloudMap, bumpMap].forEach((tex) => {
      tex.anisotropy = maxAniso;
      tex.needsUpdate = true;
    });
  }, [gl, dayMap, nightMap, cloudMap, bumpMap]);

  // Day/Night custom shader material
  const earthMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          dayMap:       { value: dayMap },
          nightMap:     { value: nightMap },
          sunDirection: { value: sunDir },
        },
        vertexShader:   earthVert,
        fragmentShader: earthFrag,
      }),
    [dayMap, nightMap, sunDir]
  );

  // Atmosphere rim shader material
  const atmosphereMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          sunDirection: { value: sunDir },
          glowColor:    { value: new THREE.Color(0x4499ff) },
          intensity:    { value: 1.35 },
        },
        vertexShader:   atmosphereVert,
        fragmentShader: atmosphereFrag,
        side:           THREE.BackSide,
        blending:       THREE.AdditiveBlending,
        transparent:    true,
        depthWrite:     false,
      }),
    [sunDir]
  );

  useFrame((_, delta) => {
    if (earthRef.current)  earthRef.current.rotation.y  += delta * 0.04;
    if (cloudsRef.current) cloudsRef.current.rotation.y += delta * 0.055;
  });

  return (
    <group>
      {/* Earth surface — day/night shader */}
      <mesh ref={earthRef} receiveShadow castShadow>
        <sphereGeometry args={[2.5, 128, 128]} />
        <primitive object={earthMaterial} attach="material" />
      </mesh>

      {/* Rotating cloud layer */}
      <mesh ref={cloudsRef}>
        <sphereGeometry args={[2.535, 128, 128]} />
        <meshStandardMaterial
          map={cloudMap}
          alphaMap={cloudMap}
          transparent
          opacity={0.5}
          depthWrite={false}
          blending={THREE.NormalBlending}
          roughness={1}
          metalness={0}
        />
      </mesh>

      {/* Rayleigh-scattering atmosphere glow */}
      <mesh>
        <sphereGeometry args={[2.72, 64, 64]} />
        <primitive object={atmosphereMaterial} attach="material" />
      </mesh>

      {/* Soft inner atmosphere haze */}
      <mesh>
        <sphereGeometry args={[2.62, 48, 48]} />
        <meshBasicMaterial
          color={new THREE.Color(0x1a6fff)}
          transparent
          opacity={0.04}
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
};

// ---------------------------------------------------------------------------
// Fallback Earth rendered while textures are loading
// ---------------------------------------------------------------------------
const EarthFallback: React.FC = () => {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * 0.04;
  });
  return (
    <mesh ref={ref}>
      <sphereGeometry args={[2.5, 64, 64]} />
      <meshStandardMaterial color="#0d3a6e" roughness={0.8} metalness={0.1} />
    </mesh>
  );
};

// ---------------------------------------------------------------------------
// Public export — wraps inner component in Suspense
// ---------------------------------------------------------------------------
export const Earth: React.FC = () => (
  <Suspense fallback={<EarthFallback />}>
    <EarthInner />
  </Suspense>
);
