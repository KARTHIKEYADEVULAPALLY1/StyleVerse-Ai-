import { useRef, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Float, Environment, ContactShadows, Sparkles } from '@react-three/drei'
import * as THREE from 'three'

function MannequinBody() {
  const group = useRef()

  useFrame((state) => {
    if (group.current) {
      group.current.rotation.y = state.clock.elapsedTime * 0.3
    }
  })

  const material = useMemo(() => (
    new THREE.MeshPhysicalMaterial({
      color: '#FF2E88',
      metalness: 0.8,
      roughness: 0.2,
      transparent: true,
      opacity: 0.6,
      wireframe: false,
      emissive: '#FF2E88',
      emissiveIntensity: 0.2
    })
  ), [])

  const wireMaterial = useMemo(() => (
    new THREE.MeshBasicMaterial({
      color: '#8B5CF6',
      wireframe: true,
      transparent: true,
      opacity: 0.3
    })
  ), [])

  return (
    <group ref={group}>
      {/* Head */}
      <mesh position={[0, 2.2, 0]} material={material}>
        <sphereGeometry args={[0.35, 32, 32]} />
      </mesh>
      <mesh position={[0, 2.2, 0]} material={wireMaterial}>
        <sphereGeometry args={[0.36, 16, 16]} />
      </mesh>

      {/* Neck */}
      <mesh position={[0, 1.8, 0]} material={material}>
        <cylinderGeometry args={[0.12, 0.15, 0.4, 16]} />
      </mesh>

      {/* Torso */}
      <mesh position={[0, 1.1, 0]} material={material}>
        <capsuleGeometry args={[0.4, 0.8, 8, 16]} />
      </mesh>
      <mesh position={[0, 1.1, 0]} material={wireMaterial}>
        <capsuleGeometry args={[0.42, 0.82, 4, 8]} />
      </mesh>

      {/* Left Arm */}
      <mesh position={[-0.55, 1.3, 0]} rotation={[0, 0, 0.2]} material={material}>
        <capsuleGeometry args={[0.12, 0.7, 8, 16]} />
      </mesh>

      {/* Right Arm */}
      <mesh position={[0.55, 1.3, 0]} rotation={[0, 0, -0.2]} material={material}>
        <capsuleGeometry args={[0.12, 0.7, 8, 16]} />
      </mesh>

      {/* Left Leg */}
      <mesh position={[-0.2, 0.1, 0]} material={material}>
        <capsuleGeometry args={[0.15, 0.8, 8, 16]} />
      </mesh>

      {/* Right Leg */}
      <mesh position={[0.2, 0.1, 0]} material={material}>
        <capsuleGeometry args={[0.15, 0.8, 8, 16]} />
      </mesh>

      {/* Floating rings */}
      <mesh position={[0, 1.2, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.8, 0.01, 8, 64]} />
        <meshBasicMaterial color="#FF2E88" transparent opacity={0.5} />
      </mesh>
      <mesh position={[0, 1.2, 0]} rotation={[Math.PI / 2, 0, Math.PI / 4]}>
        <torusGeometry args={[1, 0.01, 8, 64]} />
        <meshBasicMaterial color="#00E5FF" transparent opacity={0.3} />
      </mesh>
    </group>
  )
}

function FloatingFashionItem({ position, children, speed = 1 }) {
  return (
    <Float speed={speed} rotationIntensity={0.5} floatIntensity={1.5}>
      <group position={position}>
        {children}
      </group>
    </Float>
  )
}

export default function HolographicMannequin() {
  return (
    <div className="w-full h-[500px] md:h-[600px]">
      <Canvas camera={{ position: [0, 1.5, 5], fov: 45 }} dpr={[1, 2]}>
        <ambientLight intensity={0.5} />
        <pointLight position={[5, 5, 5]} intensity={1} color="#FF2E88" />
        <pointLight position={[-5, 3, -5]} intensity={0.5} color="#8B5CF6" />
        <pointLight position={[0, 5, 0]} intensity={0.8} color="#00E5FF" />

        <MannequinBody />

        {/* Floating fashion elements */}
        <FloatingFashionItem position={[1.8, 2.5, 0]}>
          <mesh>
            <boxGeometry args={[0.4, 0.5, 0.1]} />
            <meshPhysicalMaterial color="#FF2E88" metalness={0.5} roughness={0.3} transparent opacity={0.7} />
          </mesh>
        </FloatingFashionItem>

        <FloatingFashionItem position={[-1.8, 2.8, 0.5]}>
          <mesh>
            <torusGeometry args={[0.25, 0.08, 16, 32]} />
            <meshPhysicalMaterial color="#8B5CF6" metalness={0.7} roughness={0.2} transparent opacity={0.7} />
          </mesh>
        </FloatingFashionItem>

        <FloatingFashionItem position={[1.5, 0.5, 1]}>
          <mesh>
            <sphereGeometry args={[0.2, 16, 16]} />
            <meshPhysicalMaterial color="#00E5FF" metalness={0.9} roughness={0.1} transparent opacity={0.6} />
          </mesh>
        </FloatingFashionItem>

        <FloatingFashionItem position={[-1.5, 0.8, -0.5]}>
          <mesh>
            <coneGeometry args={[0.2, 0.4, 16]} />
            <meshPhysicalMaterial color="#FFB020" metalness={0.6} roughness={0.3} transparent opacity={0.7} />
          </mesh>
        </FloatingFashionItem>

        <Sparkles count={50} scale={[4, 4, 4]} size={2} speed={0.5} color="#FF2E88" />
        <ContactShadows position={[0, -0.5, 0]} opacity={0.4} scale={5} blur={2.5} />
        <Environment preset="city" />
      </Canvas>
    </div>
  )
}