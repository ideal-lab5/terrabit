import React, { Suspense, useContext, useEffect, useMemo, useState, useRef } from 'react';
import { IdnContext } from '../../../IdnContext';
import './world-view.css';

import { queryWorldRegistry } from '../../../services/transmutation.service';
import CreateWorld from '../create-world/create-world';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import Controls from '../../controls';
import Scene from '../../scene';
import { SHA3 } from 'sha3';
import seedrandom from 'seedrandom';
import Lights from '../../Lights';
import { useNavigate, useParams } from 'react-router-dom';
// import Lights from '../../scene/lights';
import useHexagonScatter from '../../../hooks/useHexagonScatter';
import appState from '../../../state/appState';
import GUI from '../../GUI';
import Effects from '../../../Effects';
import Terrain from '../../ScatterHexagonMesh';
import { Object3D, PCFShadowMap, SRGBColorSpace, Vector3 } from 'three';
import { Environment, OrbitControls, PointerLockControls, KeyboardControls, PerspectiveCamera } from '@react-three/drei';
import Trees from '../../Trees';
import Grass from '../../Grass';
import Clouds from '../../Clouds';
import abbreviate from '../../../utils/stringUtils';
import Helpers from '../../../utils/Helpers';
import useFBM from '../../../hooks/useFBM';
import useCameraController from '../../../hooks/useCameraController';
import { Player } from '../../../Player';
import { Physics } from '@react-three/rapier';

// function Player({ points, noise, generation }) {
//    const { camera } = useThree();
//    const [moveForward, setMoveForward] = useState(false);
//    const [moveBackward, setMoveBackward] = useState(false);
//    const [moveLeft, setMoveLeft] = useState(false);
//    const [moveRight, setMoveRight] = useState(false);
//    const velocity = useRef(new Vector3());
//    const direction = useRef(new Vector3());
//    const prevPosition = useRef(camera.position.clone());

//    const onKeyDown = (event) => {
//       switch (event.code) {
//          case 'ArrowUp':
//          case 'KeyW':
//             setMoveForward(true);
//             break;
//          case 'ArrowLeft':
//          case 'KeyA':
//             setMoveLeft(true);
//             break;
//          case 'ArrowDown':
//          case 'KeyS':
//             setMoveBackward(true);
//             break;
//          case 'ArrowRight':
//          case 'KeyD':
//             setMoveRight(true);
//             break;
//       }
//    };

//    const onKeyUp = (event) => {
//       switch (event.code) {
//          case 'ArrowUp':
//          case 'KeyW':
//             setMoveForward(false);
//             break;
//          case 'ArrowLeft':
//          case 'KeyA':
//             setMoveLeft(false);
//             break;
//          case 'ArrowDown':
//          case 'KeyS':
//             setMoveBackward(false);
//             break;
//          case 'ArrowRight':
//          case 'KeyD':
//             setMoveRight(false);
//             break;
//       }
//    };

//    useEffect(() => {
//       document.addEventListener('keydown', onKeyDown);
//       document.addEventListener('keyup', onKeyUp);
//       return () => {
//          document.removeEventListener('keydown', onKeyDown);
//          document.removeEventListener('keyup', onKeyUp);
//       };
//    }, []);


//    useFrame(() => {
//       const moveSpeed = 0.01;

//       if (moveForward || moveBackward || moveLeft || moveRight) {

//          console.log('hey')
//          console.log(camera.position)

//          if (moveForward) camera.translateZ(-moveSpeed);
//          if (moveBackward) camera.translateZ(moveSpeed);
//          if (moveLeft) camera.translateX(-moveSpeed);
//          if (moveRight) camera.translateX(moveSpeed);

//          // Adjust camera height based on noise function
//          const noiseHeight = noise(camera.position) * generation.Height;
//          camera.position.y = noiseHeight + 10; // Adjust based on your height requirements

//          // Optionally, reset the rotation or look direction to keep the camera's view consistent
//          // camera.rotation.set(0, camera.rotation.y, 0); // Example if you want to keep the camera's pitch unchanged
//          console.log('after')
//          console.log(camera.position)
//       }
//    });
//    return <PointerLockControls />;
// }

// // const useCameraController = (cameraRef) => {
// //    const mockRef = useRef(new Object3D());

// //    useFrame(() => {
// //       if (!cameraRef.current) {
// //          return;
// //       }

// //       cameraRef.current.quaternion.slerp(mockRef.quaternion, 0.1);
// //    });

// //    return {
// //       smoothLookAt: (target) => mockRef.current.lookAt(target)
// //    };
// };

// https://stackoverflow.com/questions/75562296/how-do-you-animate-the-camera-with-react-three-fiber
function WorldView() {

   let { accountId } = useParams();

   const points = useHexagonScatter(25);
   const general = appState((s) => s.general);
   const setGenerationSeed = appState((s) => s.setSeed);
   const setGeneral = appState((s) => s.setGeneral);
   const setGeneration = appState((s) => s.setGeneration);

   const { etf, signer, contract } = useContext(IdnContext);
   const [seed, setSeed] = useState('');
   const [account, setAccount] = useState('');
   const [showInfo, setShowInfo] = useState(false);
   const [refreshKey, setRefreshKey] = useState(0);
   const [fullscreen, setFullscreen] = useState(false);
   // the data returned when there is no world 
   const NOWORLD = "0x0000";

   const cameraRef = useRef(null);
   // const {smoothLookAt} = useCameraController(cameraRef);

   const [style, setStyle] = useState('Perlin');

   // setup account
   useEffect(() => {
      setAccount(account);
   }, [accountId]);

   // query the world details
   useEffect(() => {
      queryWorld();
   }, [refreshKey]);

   const toggleFullscreen = () => {
      setFullscreen(!fullscreen);
   };

   const queryWorld = async () => {
      let validity = isValid(accountId);
      let account = bitwiseCmp(validity, new Uint8Array(32).fill(0)) ?
         signer.address : validity;
      let output = await queryWorldRegistry(
         etf, signer, contract, account);
      if (output.Ok) {
         let data = output.Ok.data;
         // console.log('updating generation with data ' + data);
         let rng = csprngFromSeed(data);
         setGenerationSeed(rng());
         setGeneration('Trees', rng());
         setGeneral('Trees', rng());
         setGeneral('Grass', rng());
         setGeneral('Water', rng());
         setGeneral('Clouds', rng());
         setSeed(data);
      }
   }

   const isValid = (account) => {
      try {
         return etf.createType('AccountId', account);
      } catch (e) {
         return new Uint8Array(32).fill(0);
      }
   }

   const handleCreateWorld = async (result) => {
      if (result.status.isInBlock) {
         console.log('refreshing');
         setRefreshKey((prevKey) => prevKey + 1);
         setShowInfo(false);
      }
   }

   function bitwiseCmp(array1, array2) {
      if (array1.length !== array2.length) {
         return false;
      }

      for (let i = 0; i < array1.length; i++) {
         if (array1[i] !== array2[i]) {
            return false;
         }
      }

      return true;
   }

   const csprngFromSeed = (seed) => {
      const hash = new SHA3(512);
      // we need to go from 48 bytes to 32
      hash.update(seed);
      let out = hash.digest();
      let csprng = seedrandom(out);
      return csprng;
   }

   const randomFromSeed = (seed) => {
      const hash = new SHA3(512);
      // we need to go from 48 bytes to 32
      hash.update(seed);
      let out = hash.digest();
      let csprng = seedrandom(out);
      let rand = csprng().toString();
      return rand;
   }

   const generation = appState((s) => s.generation);
   const colors = appState((s) => s.colors);
   const noise = useFBM(colors.Water.value);

   return (
      <div className='container' key={refreshKey}>
         World View
         {showInfo && (
            <div className='fixed-textbox inner'>
               <h3>Instructions</h3>
               <p>
                  You need IDN tokens to use this feature. You can get some from the <a target='_blank' href='https://etf.idealabs.network/docs/examples/getting_started'>faucet</a>.
               </p>
               {seed === '' || seed === NOWORLD ?
                  <p>
                     Use onchain randomness to create a unique seed to generate your world. Optionally provide
                     a nonce to further randomize your world's seed.
                  </p> :
                  <ul>
                     <li>Each user can only own a single seed at a time. </li>
                     <li>Each seed is created from publicly verifiable onchain randomness and is used to construct a procedurally generated world. </li>
                     <li>Toggle between Perlin noise and a Hex world</li>
                     <li>Use the <b>world registry</b> to view other worlds.</li>
                     <li>Use <b>transmutation</b> to swap worlds with others.</li>
                  </ul>}
               <button className='close-button' onClick={() => setShowInfo(false)}>
                  Close
               </button>
            </div>
         )}
         {!showInfo && (
            <button className='open-button instructions-button' onClick={() => setShowInfo(true)}>
               Show Instructions
            </button>
         )}
         <div className='world-body'>
            {seed === '' || seed === NOWORLD ? <div><CreateWorld callback={handleCreateWorld} /></div> :
               <div className='world-info'>
                  <span>Owner:</span>
                  <span className='copy' onClick={() => navigator.clipboard.writeText(accountId === undefined ? signer.address : accountId)}>
                     {accountId === undefined ? abbreviate(signer.address, 4, signer.address.length - 4) : abbreviate(accountId, 4, accountId.length - 4)}
                  </span>
                  <div>
                     <span>Seed: </span>
                     <span className='copy' onClick={() => navigator.clipboard.writeText(seed)}>{abbreviate(seed, 4, seed.length - 4)}</span>
                  </div>
                  <div className='toggle-container'>
                     <label className='toggle-label' htmlFor='toggle'>Perlin</label>
                     <input type='checkbox' id='toggle' onChange={() => {
                        if (style === 'Perlin') {
                           setStyle('Hex');
                        } else {
                           setStyle('Perlin');
                        }
                     }} />
                     <label className='toggle-label' htmlFor='toggle'>Hex</label>
                  </div>
                  {style === 'Perlin' ?
                     <div className='canvas-container'>
                        <Canvas camera={{ zoom: 50, position: [0, 0, 600] }}>
                           <Suspense
                              fallback={<span>Loading...</span>}
                           >
                              <Lights />
                              <Controls />
                              <Scene seed={randomFromSeed(seed)} />
                           </Suspense>
                        </Canvas>
                     </div>
                     :
                     <div className={`canvas-container${fullscreen ? " fullscreen" : ""}`}>
                        <button className={`open-button fullscreen-button ${fullscreen ? "exit" : ""}`} onClick={toggleFullscreen}>
                           {fullscreen ? "Exit Fullscreen" : "Fullscreen"}
                        </button>
                        <Canvas
                           shadows
                           gl={{
                              antialias: true,
                              toneMappingExposure: 0.5,
                              shadowMap: {
                                 enabled: true,
                                 type: PCFShadowMap
                              },
                              outputEncoding: SRGBColorSpace
                           }}
                           camera={{ zoom: 30, position: [0, 30, 10] }}
                        >
                           <Suspense fallback={null}>
                           <Physics gravity={[0, -30, 0]}>
                              <group rotation-x={-Math.PI / 2}>
                                 {/* <PerspectiveCamera ref={cameraRef} /> */}
                                 {/* <Player points={points} noise={noise} generation={generation} /> */}
                                 {general.Trees && <Trees points={points} />}
                                 {general.Grass && <Grass points={points} />}
                                 {general.Clouds && <Clouds />}
                                 <Terrain points={points} />
                              </group>
                              <Environment preset="warehouse" />
                              <Player />
                              {/* <Player points={points} noise={noise} generation={generation} />
                              <OrbitControls /> */}
                              <Effects />
                              {/* <Stats /> */}
                              </Physics>
                           </Suspense>
                           <Lights />
                        </Canvas>
                        {/* <HexCanvas /> */}
                     </div>
                  }
               </div>
            }
         </div>
      </div>
   );
};

export default WorldView;
