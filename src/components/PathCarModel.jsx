import { Suspense, useMemo, useEffect } from 'react'
import { Canvas, useLoader, useThree } from '@react-three/fiber'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import * as THREE from 'three'

/*
 * PathCarModel — the 3D low-poly car that rides SectionPath's route.
 * Lazy-loaded (own chunk) so three.js stays off the initial bundle, same as
 * PixelModels. Rendered in a tiny transparent canvas with a top-down camera;
 * SectionPath's rig moves/rotates the whole canvas along the path, so here we
 * only normalise the model (centre + unit scale) and face it +X (screen east).
 */

const CAR_URL = '/car.glb'

// Orientation tuning: rotate the model so its nose points +X (screen east) and
// it sits flat in the top-down view. [x, y, z] radians. Adjusted after a look.
const MODEL_ROTATION = [0, Math.PI / 2, 0]

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
        s.scale.setScalar(2.0 / maxDim)
        return s
    }, [gltf])
    return <primitive object={obj} rotation={MODEL_ROTATION} />
}

// Straight top-down ORTHOGRAPHIC view. Orthographic removes perspective
// foreshortening, so the car keeps a constant apparent size no matter which way
// it points; top-down means the rig's 2D rotation reads as natural steering (a
// map/racing-game view) rather than a tilted sprite pinwheeling. Screen "up" is
// -Z so +X stays to the right, matching the rig's east-facing convention.
function TopCamera() {
    const { camera } = useThree()
    useEffect(() => {
        camera.position.set(0, 5, 0)
        camera.up.set(0, 0, -1)
        camera.zoom = 24
        camera.lookAt(0, 0, 0)
        camera.updateProjectionMatrix()
    }, [camera])
    return null
}

export default function PathCarModel() {
    return (
        <div style={{ width: 64, height: 64 }}>
            <Canvas
                orthographic
                dpr={0.75}
                gl={{ antialias: false, alpha: true }}
                camera={{ zoom: 24, position: [0, 5, 0], near: 0.1, far: 100 }}
                style={{ imageRendering: 'pixelated', overflow: 'visible' }}
            >
                <TopCamera />
                <ambientLight intensity={0.95} />
                <directionalLight position={[2, 5, 1]} intensity={1.5} />
                <directionalLight position={[-3, 3, -2]} intensity={0.5} color="#8fd3ff" />
                <Suspense fallback={null}>
                    <CarModel />
                </Suspense>
            </Canvas>
        </div>
    )
}
