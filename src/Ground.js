import * as THREE from "three";
import { useTexture } from "@react-three/drei";
import { CuboidCollider, RigidBody } from "@react-three/rapier";
import grass from "./assets/grass.jpg";
import Terrain from "./geometry/ScatterHexagonMesh";
import Trees from "./geometry/Trees";
import Grass from "./geometry/Grass";
import Clouds from "./geometry/Clouds";
import useHexagonScatter from "./hooks/useHexagonScatter";
import { useRef, useEffect, memo } from "react";
import appState from "./state/appState";

const TreesMemoized = memo(Trees);
const GrassMemoized = memo(Grass);
const CloudsMemoized = memo(Clouds);

export function Ground({ setTerrainRef, radius, ...props }) {
    const points = useHexagonScatter(radius);
    const general =  appState((s) => s.general);

    const texture = useTexture(grass);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;

    const terrainRef = useRef();

    useEffect(() => {
        if (terrainRef) {
            setTerrainRef(terrainRef);
        }
    }, [setTerrainRef]);

    return (
        <RigidBody {...props} type="fixed" colliders={false}>
            <group rotation-x={-Math.PI / 2}>
                {general.Trees && <TreesMemoized points={points} />}
                {general.Grass && <GrassMemoized points={points} />}
                {general.Clouds && <CloudsMemoized />}
                <Terrain ref={terrainRef} points={points} />
            </group>
            <CuboidCollider args={[1000, 2, 1000]} position={[0, -2, 0]} />
        </RigidBody>
    );
}
