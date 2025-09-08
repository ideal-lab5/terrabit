import { Canvas, useFrame } from "@react-three/fiber";
import { Sky, PointerLockControls, KeyboardControls, Text } from "@react-three/drei";
import { Physics } from "@react-three/rapier";
import { Ground } from "../Ground";
import { Player } from "../Player";
import { useState, useEffect, useContext } from "react";
import appState from "../state/appState";
import { IdnContext } from "../IdnContext";
import { presetsObj } from "@react-three/drei/helpers/environment-assets";
import { Cube } from "../Cube";
import create from "zustand";
import { Avatar } from "../Avatar";

// Create Zustand store for managing cube positions
export const useCubeStore = create((set) => ({
    cubes: [],
    addCube: (id, x, y, z) => set((state) => {
        // get all cubes that don't belong to the player
        const updatedCubes = state.cubes.filter((cube) => JSON.stringify(cube.id) !== JSON.stringify(id));
        // update player cube
        return { cubes: [...updatedCubes, { id, x, y, z }] };
    }),
}));



export const Players = () => {
    const cubes = useCubeStore((state) => state.cubes); // Get cubes from Zustand store

    const [render, setRender] = useState([]);

    useFrame(state => {
        // console.log('jhkladfjhlkadsfjhlkadsfjhlk')
        // console.log(cubes)
        let newRender = []
        cubes.forEach(({ id, x, y, z }) => {
            console.log('pushing new render')
            console.log(JSON.stringify(cubes))
            newRender.push(<Avatar key={id} position={[x, y, z]} />)
            // newRender.push({ id, x, y, z })
            setRender(newRender)
            // console.log('newRender')
            // console.log(JSON.stringify(newRender))
        })
    })

    // render.forEach(r => (
        
    // ));
    // return cubes.map((cube, index) => (
    //     <Avatar key={index} position={[cube.x, cube.y, cube.z]} />
    // ));

    // return render.map((cube, index) => (
    //     <Avatar key={index} position={[cube.x, cube.y, cube.z]} />
    // ));
    return render;
};

// export const Players = () => {
//     const cubes = useCubeStore((state) => state.cubes); // Get cubes from Zustand store

    
//     return cubes.map((cube, index) => (
//         <Avatar key={index} position={[cube.x, cube.y, cube.z]} />
//     ));
// };


export default function Game(props) {
    
    const [terrainRef, setTerrainRef] = useState(null);
    const [playerPosition, setPlayerPosition] = useState({ x: 0, y: 0, z: 0 });

    const addCube = useCubeStore((s) => s.addCube)
    const [peerPositions, setPeerPositions] = useState([]);

    const seed = appState((s) => s.generation.Seed);

    const { signer, libp2p } = useContext(IdnContext);


    useEffect(() => {

        const setup = async () => {
            // Subscribe to pubsub topic (seed)
            console.log('subscribing to ' + seed);
            libp2p.services.pubsub.subscribe(seed.toString());

            libp2p.services.pubsub.addEventListener('message', (event) => {
                const topic = event.detail.topic;
                if (topic === seed.toString()) {
                    let playerLocalId = event.detail.from;
                    let location = event.detail.data;
                    let decoded = new TextDecoder().decode(location);
                    let new_pos = JSON.parse(decoded);
                    // peerPositions
                    // Update cube position in the Zustand store
                    addCube(playerLocalId, new_pos.x, new_pos.y, new_pos.z);
                }
            });
        };


        if (libp2p) {
            setup()
        }

        // console.log(ctx);
    }, [libp2p]);


    // Function to update player position
    const updatePlayerPosition = (position) => {
        const x = position.x.toFixed(2);
        const y = position.y.toFixed(2);
        const z = position.z.toFixed(2);

        // gossip (x,y,z) to topic
        console.log('publishing to pubsub topic')

        const peerList = libp2p.services.pubsub.getSubscribers(seed.toString());
        if (peerList.length > 0) {
            libp2p.services.pubsub.publish(
                seed.toString(),
                new TextEncoder().encode(
                    // (x, y, z)
                    JSON.stringify({ "x": x, "y": y, "z": z })
                )
            )
        }

        setPlayerPosition({
            x: position.x.toFixed(2),
            y: position.y.toFixed(2),
            z: position.z.toFixed(2),
        });
    };

    const handleOnExit = () => {
        props.onExit()
    }

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
                <Canvas shadows camera={{ fov: 45 }}>
                    <Sky sunPosition={[100, 20, 100]} />
                    <ambientLight intensity={0.3} />
                    <pointLight castShadow intensity={0.8} position={[100, 100, 100]} />
                    <Physics gravity={[0, 0, 0]}>
                        <Ground setTerrainRef={setTerrainRef} radius={10} />
                        <Player terrainRef={terrainRef} onPositionChange={updatePlayerPosition} />
                        <Players />
                        {/* <Cube position={[1,10,1]} /> */}
                        {/* <Cubes peerPositions={peerPositions} /> */}
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
            }}>
                <button
                    onClick={handleOnExit}
                    style={{ marginTop: "20px", padding: "10px 20px", cursor: "pointer" }}
                >
                    Exit
                </button>
                <span>Press `esc` to control pointer</span>
                <h2>Controls:</h2>
                <ul>
                    <li><strong>W</strong> / <strong>Arrow Up</strong> - Move Forward</li>
                    <li><strong>S</strong> / <strong>Arrow Down</strong> - Move Backward</li>
                    <li><strong>A</strong> / <strong>Arrow Left</strong> - Move Left</li>
                    <li><strong>D</strong> / <strong>Arrow Right</strong> - Move Right</li>
                    <li><strong>Space</strong> - Ascend</li>
                    <li><strong>Shift</strong> - Descend</li>
                </ul>
                <h2>Position:</h2>
                <p>x: {playerPosition.x}</p>
                <p>y: {playerPosition.y}</p>
                <p>z: {playerPosition.z}</p>
            </div>
        </>
    );
}
