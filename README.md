# Tidebound

Tidebound is a **fully decentralized**, peer-to-peer web3 game. It is an 'autonomous world' set in a flooded apocalypse where players are subject to the random wills of the tides. 

Tidebound is powered by verifiable randomness from the IDN Randomness beacon. It uses OrbitDB to store game state and libp2p for communication and real-time updates. 

## Build

https://github.com/nalinbhardwaj/devconnect-procgen-workshop/blob/island/eth/contracts/Perlin.sol

### Pre-requisites

To run the game you must have a running IDN instance (substrate node), webrtc relay server (libp2p), and the tidebound contract must be deployed. To start, open two terminals and then:

``` shell
# in terminal 1, run a local node and a relay node
docker compose up -d
# view the logs of the relay container and copy it into .env
docker compose logs -f relay
# deploy the contract in terminal 2
./deploy_local.sh
```

Then copy the contract address into `.env` and run 

``` shell
npm i 
npm run start
```
The game opens on `localhost:3000`.

### Controlling Dev Env with Docker Compose

You can take advantage of docker compose to run various service when developing.
There are two services, `node_alice` and `relay`

1. run all services in the background
``` shell
docker compose up -d
```

2. Manage services with docker compose

Follow SERVICE logs with `docker compose logs -f SERVICE`
Restart the SERVICE with `docker compose restart SERVICE`
Kill the SERVICE with `docker compose kill SERVICE`

## TODOs
- [ ] fix account id logic when getting other players islands [decoding acct ids]
- [ ] relay component periodically fails 
- [ ] player status
    - [ ] player health + hunger 
    - [ ] skill points
- [ ] revamp landing page
- [ ] play as guest mode (no wallet needed)
- [x] p2p communication w/ libp2p
    - [ ] use pubsub to relay positions [WIP]
- [ ] use ready player me for avatars (e.g. https://github.com/knightcube/react-three-fiber-practice-avatar?tab=readme-ov-file)
- [ ] add collisions to islands
- [ ] add 'play as guest' mode
- [ ] sometimes renders without color
- [ ] allow players to customize aspects of their island (through the contract, e.g. set color of things)
- [ ] improve player movements + add gravity
- [ ] connect/extend hex islands
- [ ] split home component into multiple components & add lazy loading
- [ ] implement 'factory' contract to enable multiple instances of the game
- [ ] develop axial hex grid to track world in contract storage
- [ ] R&D Tidal Energy (points)
- [ ] investigate persistance of in-game items/resources
- [ ] add audio effects (i.e. atmospheric sounds)

## License

MIT-0
