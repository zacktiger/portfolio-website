import { Suspense, useMemo, useEffect, useRef } from 'react'
import { Canvas, useLoader, useThree, useFrame } from '@react-three/fiber'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import * as THREE from 'three'

/*
 * PathCarModel — the 3D low-poly car that rides SectionPath's route.
 * Lazy-loaded (own chunk) so three.js stays off the initial bundle, same as
 * PixelModels. Rendered in a tiny transparent canvas.
 *
 * The car's steering happens IN the 3D scene, not by spinning the flat canvas:
 * a slightly tilted (3/4) camera keeps the model's volume visible, and the rig
 * yaws the car around world-up while banking it into bends — so the 3D form
 * actually turns and leans, instead of reading as a rotating 2D sprite.
 * SectionPath feeds target yaw/bank each frame through the `drive` ref.
 */

const CAR_URL = '/car.glb'

// Face the model +X (screen east) at rest; the rig yaws it from there.
const MODEL_ROTATION = [0, Math.PI / 2, 0]

// Frame-rate-independent ease toward a target (higher lambda = snappier).
const approach = (cur, target, lambda, dt) => cur + (target - cur) * (1 - Math.exp(-lambda * dt))

function CarModel() {
    const gltf = useLoader(GLTFLoader, CAR_URL)
    const obj = useMemo(() => {
        const s = gltf.scene.clone(true)
        // centre at origin and scale so the largest dimension fits the view
        const box = new THREE.Box3().setFromObject(s)
        const size = new THREE.Vector3()
        const center = new THREE.Vector3()
        box.getSize(size)
        box.getCenter(center)
        s.position.set(-center.x, -center.y, -center.z)
        const maxDim = Math.max(size.x, size.y, size.z) || 1
        s.scale.setScalar(1.75 / maxDim)
        return s
    }, [gltf])
    return <primitive object={obj} rotation={MODEL_ROTATION} />
}

/*
 * CarRig — nested groups so the two motions stay on clean axes:
 *   yaw group  → rotation.y  = steering (around world up)
 *   tilt group → rotation.x  = bank/roll (lean around the car's forward axis)
 *                rotation.z  = pitch (nose up/down; reserved, usually ~0)
 * Everything is eased here in useFrame from the shared `drive` targets, so
 * scrolling only writes plain numbers and never touches three.
 */
function CarRig({ drive }) {
    const yawRef = useRef()
    const tiltRef = useRef()
    useFrame((_, delta) => {
        const yaw = yawRef.current
        const tilt = tiltRef.current
        const d = drive && drive.current
        if (!yaw || !tilt || !d) return
        const dt = Math.min(delta, 0.05)
        // steer toward target yaw along the shortest arc
        const cur = yaw.rotation.y
        const err = ((d.yaw - cur + Math.PI * 3) % (Math.PI * 2)) - Math.PI
        yaw.rotation.y = cur + err * (1 - Math.exp(-9 * dt))
        // lean into the bend + settle pitch
        tilt.rotation.x = approach(tilt.rotation.x, d.bank, 7, dt)
        tilt.rotation.z = approach(tilt.rotation.z, d.pitch || 0, 7, dt)
    })
    return (
        <group ref={yawRef}>
            <group ref={tiltRef}>
                <Suspense fallback={null}>
                    <CarModel />
                </Suspense>
            </group>
        </group>
    )
}

// Tilted ORTHOGRAPHIC 3/4 view. Orthographic keeps a constant apparent size no
// matter which way the car points; the tilt (camera lifted toward +Z, looking
// down at the origin) reveals the roof + a front/side face, so yaw and bank read
// as real 3D motion. Default up (+Y) keeps world +X to screen-right, matching
// the rig's east-facing convention.
function RigCamera() {
    const { camera } = useThree()
    useEffect(() => {
        camera.position.set(0, 4.9, 2.35)
        camera.up.set(0, 1, 0)
        camera.zoom = 21
        camera.lookAt(0, 0, 0)
        camera.updateProjectionMatrix()
    }, [camera])
    return null
}

export default function PathCarModel({ drive }) {
    return (
        <div style={{ width: 66, height: 66 }}>
            <Canvas
                orthographic
                dpr={0.85}
                gl={{ antialias: false, alpha: true }}
                camera={{ zoom: 21, position: [0, 4.9, 2.35], near: 0.1, far: 100 }}
                style={{ imageRendering: 'pixelated', overflow: 'visible' }}
            >
                <RigCamera />
                <ambientLight intensity={1.15} />
                <directionalLight position={[2, 5, 1]} intensity={2.1} />
                {/* fill from the camera side so the tilted front/near face isn't muddy */}
                <directionalLight position={[0, 3, 5]} intensity={0.9} />
                <directionalLight position={[-3, 3, -2]} intensity={0.6} color="#8fd3ff" />
                <CarRig drive={drive} />
            </Canvas>
        </div>
    )
}
