import { useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { useTexture, Plane, useCursor } from '@react-three/drei'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import * as THREE from 'three'

interface WaterRipple3DCoverProps {
  src: string
  className?: string
  playBeat?: boolean
  blurEnabled?: boolean
}

export default function WaterRipple3DCover({
  src,
  className = '',
  playBeat = false,
  blurEnabled = false,
}: WaterRipple3DCoverProps) {
  const [loading, setLoading] = useState(true)

  return (
    // 父容器：相对定位 + 宽高100%
    <div
      className={`relative ${className}`}
      style={{ width: '100%', height: '100%' }}
    >
      {/* 加载状态 */}
      {loading && (
        <div className='absolute inset-0 z-10 animate-pulse bg-black/20' />
      )}
      {/* ✅ 核心修复：Canvas 强制绝对定位铺满全屏 */}
      <Canvas
        camera={{ position: [0, 0, 2.2], fov: 35 }}
        gl={{ antialias: true, alpha: true }}
        // 强制样式，无视所有className冲突
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
        }}
      >
        <ambientLight intensity={2.0} />
        {/* 模糊效果开关（核心） */}
        {blurEnabled && (
          <EffectComposer enableNormalPass>
            <Bloom
              intensity={1.2} // 模糊强度
              luminanceThreshold={0.0} // 让整张图都模糊
              luminanceSmoothing={0.9}
            />
          </EffectComposer>
        )}
        <WaterSurface
          url={src}
          playBeat={playBeat}
          onLoad={() => setLoading(false)}
        />
      </Canvas>
    </div>
  )
}

// 水面核心组件
function WaterSurface({ url, playBeat, onLoad }) {
  const meshRef = useRef(null)
  const texture = useTexture(url)
  useCursor(true)

  const clickPos = useRef(new THREE.Vector2(0, 0))
  const beatTime = useRef(0)

  texture.anisotropy = 16
  texture.onUpdate = () => onLoad()

  useFrame(state => {
    if (!meshRef.current) return
    const geo = meshRef.current.geometry
    const pos = geo.attributes.position
    const time = state.clock.elapsedTime

    // 音乐节拍
    if (playBeat) beatTime.current += 0.016
    const beatIntensity = playBeat ? Math.sin(beatTime.current * 12) * 0.04 : 0

    // 波动算法
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i)
      const y = pos.getY(i)

      let z =
        Math.sin(x * 3 + time * 2) * 0.04 + Math.cos(y * 3 + time * 2) * 0.04

      // 点击波纹
      const dx = x - clickPos.current.x
      const dy = y - clickPos.current.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      z += Math.sin(dist * 8 - time * 5) * 0.04 * Math.exp(-dist * 1.5)

      z += beatIntensity
      pos.setZ(i, z)
    }

    pos.needsUpdate = true
    geo.computeVertexNormals()
  })

  // 点击生成波纹
  const handlePointerDown = e => {
    clickPos.current.set((e.point.x / 2) * 1, (e.point.y / 2) * -1)
  }

  return (
    // ✅ 固定正方形平面，无需缩放
    <Plane
      ref={meshRef}
      args={[2, 2, 64, 64]}
      onPointerDown={handlePointerDown}
    >
      <meshStandardMaterial
        map={texture}
        metalness={0}
        roughness={0.5}
        side={THREE.DoubleSide}
      />
    </Plane>
  )
}
