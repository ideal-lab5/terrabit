import React, { useCallback, useEffect, useRef, forwardRef, useImperativeHandle, useMemo } from "react";
import * as THREE from "three";
import { FrontSide } from "three";
import useColor from "../hooks/useColor";
import useFBM from "../hooks/useFBM";
import appState from "../state/appState";
import BeveledHexagonGeometry from "./BeveledHexagonGeometry";
import { useSpring } from "@react-spring/three";
import { RigidBody, CylinderCollider } from "@react-three/rapier"; // Import Rapier components

const tempV4 = new THREE.Object3D();

const Terrain = forwardRef(({ points, onClickHandler }, ref) => {
  const colors = appState((s) => s.colors);
  const generation = appState((s) => s.generation);

  const noise = useFBM(colors.Water.value);
  const color = useColor(colors.Water.value);
  const meshRef = useRef();
  const heights = useRef(new Map());

  // Generate terrain
  const generate = useCallback(
    (scale) => {
      if (meshRef.current) {
        const mesh = meshRef.current;
        points.forEach((point, i) => {
          tempV4.position.copy(point);
          tempV4.scale.setScalar(0.01);

          if (scale) {
            tempV4.scale.multiplyScalar(scale);
          }

          const p = tempV4.position.clone().multiplyScalar(generation.Scale);
          let n = noise(p) * generation.Height;
          const c = color(n);

          if (n <= colors.Water.value) n = colors.Water.value;

          tempV4.scale.z *= 40 * n;
          tempV4.updateMatrix();
          mesh.setMatrixAt(i, tempV4.matrix);
          mesh.setColorAt(i, c);

          // Store height for point
          heights.current.set(point.toArray().join(','), n);
        });
        mesh.instanceMatrix.needsUpdate = true;
        mesh.instanceColor.needsUpdate = true;
      }
    },
    [points, noise, color, colors, generation]
  );

  const findNearestHexCenter = (x, z) => {
    // ... (unchanged)
  };

  useImperativeHandle(ref, () => ({
    // ... (unchanged)
  }));

  const { scale } = useSpring({
    scale: 1,
    onChange: ({ value: { scale } }) => {
      generate(scale);
    },
  });

  useEffect(() => {
    scale.start({ from: 0, to: 1 });
  }, []);

  useEffect(() => {
    generate();
  }, [generate]);

  // NEW: Generate colliders based on hex positions and heights
  const colliders = useMemo(() => {
    const generatedColliders = [];
    points.forEach((point) => {
      const hexHeight = heights.current.get(point.toArray().join(',')) * 40; // Get the height we calculated
      if (hexHeight > 0) {
        generatedColliders.push(
          <CylinderCollider
            key={point.toArray().join(',')}
            args={[hexHeight / 2, 1.0]} // [half-height, radius]
            position={[point.x, hexHeight / 2, point.z]}
          />
        );
      }
    });
    return generatedColliders;
  }, [points]);

  return (
    <group>
      {/* The physics representation of the terrain */}
      <RigidBody
        type="fixed"
        colliders={false}
        name="terrain-collider" // Give it a name to check in Player.js
      >
        {colliders}
      </RigidBody>

      {/* The visual representation of the terrain */}
      <instancedMesh
        castShadow
        receiveShadow
        ref={meshRef}
        args={[null, null, points.length]}
      >
        <BeveledHexagonGeometry />
        <meshPhongMaterial
          shadowSide={FrontSide}
          side={FrontSide}
        />
      </instancedMesh>
    </group>
  );
});

export default Terrain;