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

// Hero-ish view from above and slightly in front, so the low-poly car reads as
// a car (not just its roof). Screen +X stays to the right for the rig.
function TopCamera() {
    const { camera } = useThree()
    useEffect(() => {
        camera.position.set(0, 2.6, 1.7)
        camera.up.set(0, 1, 0)
        camera.lookAt(0, 0, 0)
        camera.updateProjectionMatrix()
    }, [camera])
    return null
}

export default function PathCarModel() {
    return (
        <div style={{ width: 64, height: 64 }}>
            <Canvas
                dpr={0.75}
                gl={{ antialias: false, alpha: true }}
                camera={{ fov: 32, position: [0, 2.6, 1.7] }}
                style={{ imageRendering: 'pixelated', overflow: 'visible' }}
            >
                <TopCamera />
                <ambientLight intensity={0.9} />
                <directionalLight position={[2, 5, 3]} intensity={1.6} />
                <directionalLight position={[-3, 2, -2]} intensity={0.5} color="#8fd3ff" />
                <Suspense fallback={null}>
                    <CarModel />
                </Suspense>
            </Canvas>
        </div>
    )
}
