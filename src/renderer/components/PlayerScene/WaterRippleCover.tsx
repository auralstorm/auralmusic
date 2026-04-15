import { useRef, useState } from 'react'
import { Canvas, useFrame, type ThreeEvent } from '@react-three/fiber'
import { Plane, useCursor, useTexture } from '@react-three/drei'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import { DoubleSide, Mesh, PlaneGeometry, Texture, Vector2 } from 'three'

interface WaterRipple3DCoverProps {
  src: string
  className?: string
  playBeat?: boolean
  blurEnabled?: boolean
}

interface WaterSurfaceProps {
  url: string
  playBeat: boolean
  onLoad: () => void
}

export default function WaterRipple3DCover({
  src,
  className = '',
  playBeat = false,
  blurEnabled = false,
}: WaterRipple3DCoverProps) {
  const [loading, setLoading] = useState(true)

  return (
    <div
      className={`relative ${className}`}
      style={{ width: '100%', height: '100%' }}
    >
      {loading ? (
        <div className='absolute inset-0 z-10 animate-pulse bg-black/20' />
      ) : null}

      <Canvas
        camera={{ position: [0, 0, 2.2], fov: 35 }}
        gl={{ antialias: true, alpha: true }}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
        }}
      >
        <ambientLight intensity={2.0} />

        {blurEnabled ? (
          <EffectComposer enableNormalPass>
            <Bloom
              intensity={1.2}
              luminanceThreshold={0.0}
              luminanceSmoothing={0.9}
            />
          </EffectComposer>
        ) : null}

        <WaterSurface
          url={src}
          playBeat={playBeat}
          onLoad={() => setLoading(false)}
        />
      </Canvas>
    </div>
  )
}

function WaterSurface({ url, playBeat, onLoad }: WaterSurfaceProps) {
  const meshRef = useRef<Mesh<PlaneGeometry> | null>(null)
  const texture = useTexture(url) as Texture
  useCursor(true)

  const clickPos = useRef(new Vector2(0, 0))
  const beatTime = useRef(0)

  texture.anisotropy = 16
  texture.onUpdate = () => onLoad()

  useFrame(state => {
    const geometry = meshRef.current?.geometry
    if (!geometry) {
      return
    }

    const positions = geometry.attributes.position
    const time = state.clock.elapsedTime

    if (playBeat) {
      beatTime.current += 0.016
    }

    const beatIntensity = playBeat ? Math.sin(beatTime.current * 12) * 0.04 : 0

    for (let index = 0; index < positions.count; index += 1) {
      const x = positions.getX(index)
      const y = positions.getY(index)

      let z =
        Math.sin(x * 3 + time * 2) * 0.04 + Math.cos(y * 3 + time * 2) * 0.04

      const dx = x - clickPos.current.x
      const dy = y - clickPos.current.y
      const distance = Math.sqrt(dx * dx + dy * dy)
      z += Math.sin(distance * 8 - time * 5) * 0.04 * Math.exp(-distance * 1.5)

      z += beatIntensity
      positions.setZ(index, z)
    }

    positions.needsUpdate = true
    geometry.computeVertexNormals()
  })

  const handlePointerDown = (event: ThreeEvent<PointerEvent>) => {
    clickPos.current.set(event.point.x / 2, (event.point.y / 2) * -1)
  }

  return (
    <Plane
      ref={meshRef}
      args={[2, 2, 64, 64]}
      onPointerDown={handlePointerDown}
    >
      <meshStandardMaterial
        map={texture}
        metalness={0}
        roughness={0.5}
        side={DoubleSide}
      />
    </Plane>
  )
}
