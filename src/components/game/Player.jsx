import * as THREE from "three";
import * as RAPIER from "@dimforge/rapier3d-compat";
import { useEffect, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { useKeyboardControls } from "@react-three/drei";
import { CapsuleCollider, RigidBody, useRapier } from "@react-three/rapier";
import Axe from "../../Axe";

const SPEED = 2;
const DAMPING = 0.5;
const HEIGHT_CHANGE_AMOUNT = 0.1; // Amount to change height per key press
const direction = new THREE.Vector3();
const frontVector = new THREE.Vector3();
const sideVector = new THREE.Vector3();

export function Player({ lerp = THREE.MathUtils.lerp, terrainRef, onPositionChange }) {
  const axe = useRef();
  const ref = useRef();
  const rapier = useRapier();
  const [, get] = useKeyboardControls();

  const [prevPosition, setPrevPosition] = useState(new THREE.Vector3());
  const [smoothedY, setSmoothedY] = useState(0);
  const [isMovingUp, setIsMovingUp] = useState(false);
  const [isMovingDown, setIsMovingDown] = useState(false);

  useFrame((state) => {
    const { forward, backward, left, right, jump } = get();
    const velocity = ref.current.linvel();

    // Update camera position
    state.camera.position.set(...ref.current.translation());

    // Movement
    frontVector.set(0, 0, backward - forward);
    sideVector.set(left - right, 0, 0);

    direction.subVectors(frontVector, sideVector)
      .normalize()
      .multiplyScalar(SPEED)
      .applyEuler(state.camera.rotation);

    // Smooth velocity changes for horizontal movement
    const targetVelocity = new THREE.Vector3(
      direction.x * DAMPING, 
      // velocity.y, 
      0,
      direction.z * DAMPING);
    ref.current.setLinvel(targetVelocity);

    // Height adjustment based on key states
    const playerPosition = ref.current.translation();
    let newY = playerPosition.y;

    if (isMovingUp) {
      newY += HEIGHT_CHANGE_AMOUNT;
    }
    if (isMovingDown) {
      newY -= HEIGHT_CHANGE_AMOUNT;
    }

    const smoothedY = lerp(playerPosition.y, newY, 0.5);
    ref.current.setTranslation(new THREE.Vector3(playerPosition.x, smoothedY, playerPosition.z));

    // Update previous position
    if (Math.abs(prevPosition.x - playerPosition.x) > 0.02 || Math.abs(prevPosition.z - playerPosition.z) > 0.02) {
      setPrevPosition(new THREE.Vector3(playerPosition.x, playerPosition.y, playerPosition.z));
      onPositionChange(playerPosition); // Call the callback to update position
    }

    // Grounded check and jumping
    const world = rapier.world.raw();
    const rayOrigin = ref.current.translation().clone();
    rayOrigin.y += 1; // Start the ray slightly above the player
    const ray = world.castRay(new RAPIER.Ray(rayOrigin, { x: 0, y: -1, z: 0 }));
    const grounded = ray && ray.collider && ray.toi <= 1.0;

    if (jump && grounded) {
      ref.current.setLinvel({ x: direction.x * DAMPING, y: 5, z: direction.z * DAMPING });
    }
  });

  // Adjust height based on key inputs
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Shift') {
        setIsMovingDown(true);
      } else if (event.key === ' ') {
        setIsMovingUp(true);
      }
    };

    const handleKeyUp = (event) => {
      if (event.key === 'Shift') {
        setIsMovingDown(false);
      } else if (event.key === ' ') {
        setIsMovingUp(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  return (
    <>
      <RigidBody
        ref={ref}
        colliders={true}
        mass={1}
        type="dynamic"
        position={[0, 10, 0]} // Ensure this is above the initial terrain height
        enabledRotations={[false, false, false]}
      >
        <CapsuleCollider args={[0.5, 0.5]} />
      </RigidBody>
      <group
        ref={axe}
        onPointerMissed={() => (axe.current.children[0].rotation.x = -0.5)}
      >
        <Axe position={[0.15, -0.1, 0.65]} />
      </group>
    </>
  );
}
