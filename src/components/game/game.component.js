import { Canvas } from "@react-three/fiber";
import { Sky, PointerLockControls, KeyboardControls, Text } from "@react-three/drei";
import { Physics } from "@react-three/rapier";
import { Ground } from "../../Ground";
import { Player } from "./Player";
import { useState, useEffect, useContext, useCallback, useMemo } from "react";
import create from "zustand";
import { subscribeWithSelector } from 'zustand/middleware';
import { Avatar } from "../../Avatar";
import appState from "../../state/appState";
import { IdnContext } from "../../IdnContext";

// Improved Zustand store with better state management
export const useCubeStore = create(
    subscribeWithSelector((set, get) => ({
        cubes: new Map(), // Use Map for better performance
        addCube: (id, x, y, z) => set((state) => {
            const newCubes = new Map(state.cubes);
            newCubes.set(id, { id, x: parseFloat(x), y: parseFloat(y), z: parseFloat(z) });
            return { cubes: newCubes };
        }),
        removeCube: (id) => set((state) => {
            const newCubes = new Map(state.cubes);
            newCubes.delete(id);
            return { cubes: newCubes };
        }),
        getCubesArray: () => Array.from(get().cubes.values()),
    }))
);

// Optimized Players component
export const Players = () => {
    const cubesMap = useCubeStore((state) => state.cubes);

    const avatars = useMemo(() => {
        return Array.from(cubesMap.values()).map((cube) => (
            <Avatar
                key={cube.id}
                position={[cube.x, cube.y, cube.z]}
            />
        ));
    }, [cubesMap]);

    return <>{avatars}</>;
};

export default function Game(props) {
    const [terrainRef, setTerrainRef] = useState(null);
    const [playerPosition, setPlayerPosition] = useState({ x: 0, y: 0, z: 0 });
    const [isFlying, setIsFlying] = useState(false);

    const addCube = useCubeStore((s) => s.addCube);
    const removeCube = useCubeStore((s) => s.removeCube);
    const seed = appState((s) => s.generation.Seed);

    const { signer, libp2p } = useContext(IdnContext);

    // Throttled position update to reduce network traffic
    const updatePlayerPosition = useCallback((position) => {
        const x = parseFloat(position.x.toFixed(2));
        const y = parseFloat(position.y.toFixed(2));
        const z = parseFloat(position.z.toFixed(2));

        // Only publish if there are subscribers
        if (libp2p?.services?.pubsub) {
            const peerList = libp2p.services.pubsub.getSubscribers(seed.toString());
            if (peerList.length > 0) {
                libp2p.services.pubsub.publish(
                    seed.toString(),
                    new TextEncoder().encode(
                        JSON.stringify({ x, y, z, timestamp: Date.now() })
                    )
                ).catch(console.error);
            }
        }

        setPlayerPosition({ x, y, z });
    }, [libp2p, seed]);

    useEffect(() => {
        if (!libp2p?.services?.pubsub) return;

        const setup = async () => {
            try {
                console.log('Subscribing to topic:', seed);
                await libp2p.services.pubsub.subscribe(seed.toString());

                const handleMessage = (event) => {
                    try {
                        const topic = event.detail.topic;
                        if (topic === seed.toString()) {
                            const playerLocalId = event.detail.from.toString();
                            const decoded = new TextDecoder().decode(event.detail.data);
                            const newPos = JSON.parse(decoded);

                            // Add timestamp validation to prevent old messages
                            if (newPos.timestamp && Date.now() - newPos.timestamp > 5000) {
                                return; // Ignore messages older than 5 seconds
                            }

                            addCube(playerLocalId, newPos.x, newPos.y, newPos.z);
                        }
                    } catch (error) {
                        console.error('Error handling pubsub message:', error);
                    }
                };

                libp2p.services.pubsub.addEventListener('message', handleMessage);

                // Cleanup function
                return () => {
                    libp2p.services.pubsub.removeEventListener('message', handleMessage);
                };
            } catch (error) {
                console.error('Error setting up pubsub:', error);
            }
        };

        const cleanup = setup();

        return async () => {
            const cleanupFn = await cleanup;
            if (cleanupFn) cleanupFn();
        };
    }, [libp2p, seed, addCube]);

    // Cleanup disconnected peers
    useEffect(() => {
        const interval = setInterval(() => {
            if (libp2p?.services?.pubsub) {
                const currentPeers = new Set(
                    libp2p.services.pubsub.getSubscribers(seed.toString()).map(peer => peer.toString())
                );

                // Remove cubes for peers that are no longer connected
                useCubeStore.getState().cubes.forEach((cube, id) => {
                    if (!currentPeers.has(id)) {
                        removeCube(id);
                    }
                });
            }
        }, 10000); // Check every 10 seconds

        return () => clearInterval(interval);
    }, [libp2p, seed, removeCube]);

    const handleOnExit = useCallback(() => {
        props.onExit?.();
    }, [props.onExit]);

    return (
        <>
            <KeyboardControls
                map={[
                    { name: "forward", keys: ["ArrowUp", "w", "W"] },
                    { name: "backward", keys: ["ArrowDown", "s", "S"] },
                    { name: "left", keys: ["ArrowLeft", "a", "A"] },
                    { name: "right", keys: ["ArrowRight", "d", "D"] },
                    { name: "jump", keys: ["Space"] },
                ]}
            >
                <Canvas
                    shadows
                    camera={{ fov: 45 }}
                    performance={{ min: 0.5 }} // Allow FPS to drop for better performance
                >
                    <Sky sunPosition={[100, 20, 100]} />
                    <ambientLight intensity={0.3} />
                    <pointLight castShadow intensity={0.8} position={[100, 100, 100]} />

                    <Physics
                        gravity={[0, -9.81, 0]} // Proper gravity
                        timeStep={1 / 60} // Fixed timestep for consistent physics
                    >
                        <Ground setTerrainRef={setTerrainRef} radius={10} />
                        <Player
                            terrainRef={terrainRef}
                            onPositionChange={updatePlayerPosition}
                        />
                        <Players />
                    </Physics>
                    <PointerLockControls />
                </Canvas>
            </KeyboardControls>

            <div style={{
                position: "absolute",
                top: 10,
                left: 10,
                color: "black",
                fontFamily: "Arial, sans-serif",
                fontSize: "14px",
                zIndex: 1000,
                backgroundColor: "rgba(255,255,255,0.8)",
                padding: "10px",
                borderRadius: "5px"
            }}>
                <button
                    onClick={handleOnExit}
                    style={{ marginBottom: "10px", padding: "10px 20px", cursor: "pointer" }}
                >
                    Exit
                </button>
                <div>Press ESC to control pointer</div>
                <div style={{ color: isFlying ? "green" : "blue" }}>
                    Press F to toggle flight mode {isFlying ? "(Flying)" : "(Ground)"}
                </div>

                <h3>Controls:</h3>
                <ul style={{ margin: 0, paddingLeft: "20px" }}>
                    <li><strong>WASD</strong> - Move</li>
                    <li><strong>Space</strong> - Jump/Ascend</li>
                    <li><strong>F</strong> - Toggle Flight Mode</li>
                </ul>

                <h3>Position:</h3>
                <div>x: {playerPosition.x}</div>
                <div>y: {playerPosition.y}</div>
                <div>z: {playerPosition.z}</div>
            </div>
        </>
    );
}