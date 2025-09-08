/*
    A service to call the transmutation contract
 */
import { BN, BN_ONE } from "@polkadot/util";



const MAX_CALL_WEIGHT = new BN(1_000_000_000_000).isub(BN_ONE);
const PROOFSIZE = new BN(100_000);
export async function roll(api, signer, name, contract, callback) {
    await contract.tx
        .roll({
            gasLimit: api.createType('WeightV2', {
                refTime: MAX_CALL_WEIGHT,
                proofSize: PROOFSIZE,
              }),
              storageDepositLimit: null,
        }, name)
        .signAndSend(signer.address, result => {
            // if (result.status.isInBlock) {
                callback(result);
            // }
        });
}

export async function queryIslandRegistry(api, signer, contract, who) {
    const { gasRequired, storageDeposit, result, output } =  
        await contract.query.registryLookup(signer.address, 
            {
                gasLimit: api.createType('WeightV2', {
                    refTime: MAX_CALL_WEIGHT,
                    proofSize: PROOFSIZE,
                }),
                storageDepositLimit: null,
            }, 
        who,
    );
    return result.toHuman()
}

export async function queryPlayers(api, signer, contract) {
    const { gasRequired, storageDeposit, result, output } =  
        await contract.query.getPlayers(signer.address, 
            {
                gasLimit: api.createType('WeightV2', {
                    refTime: MAX_CALL_WEIGHT,
                    proofSize: PROOFSIZE,
                }),
                storageDepositLimit: null,
            },
    );
    return result.toHuman()
}

// export async function tryNewSwap(api, signer, transmutationContract, who, when, callback) {
//     await transmutationContract.tx
//         .tryNewSwap({
//             gasLimit: api.createType('WeightV2', {
//                 refTime: MAX_CALL_WEIGHT2,
//                 proofSize: PROOFSIZE,
//             }),
//             storageDepositLimit: null,
//         }, who, when)
//         .signAndSend(signer.address, result => {
//             if (result.status.isInBlock) {
//                 callback(result);
//             }
//         });
// }

// export async function rejectSwap(api, signer, transmutationContract, callback) {
//     await transmutationContract.tx
//         .rejectSwap({
//             gasLimit: api.createType('WeightV2', {
//                 refTime: MAX_CALL_WEIGHT2,
//                 proofSize: PROOFSIZE,
//             }),
//             storageDepositLimit: null,
//         })
//         .signAndSend(signer.address, result => {
//             if (result.status.isInBlock) {
//                 callback(result);
//             }
//         });
// }

// export async function complete(api, signer, contract, swapId, callback) {
//     await contract.tx
//         .complete({
//             gasLimit: api.createType('WeightV2', {
//                 refTime: MAX_CALL_WEIGHT2,
//                 proofSize: PROOFSIZE,
//             }),
//             storageDepositLimit: null,
//         }, swapId)
//         .signAndSend(signer.address, result => {
//             if (result.status.isInBlock) {
//                 callback(result);
//             }
//         });
// }

// export function transmute__call(api, transmutationContract) {
//     return transmutationContract.tx
//         .transmute({
//             gasLimit: api.createType('WeightV2', {
//                 refTime: MAX_CALL_WEIGHT2,
//                 proofSize: PROOFSIZE,
//             }),
//             storageDepositLimit: null,
//         });
// }

// export async function queryWorldRegistry(api, signer, transmutationContract, who) {
//     const { gasRequired, storageDeposit, result, output } =  
//         await transmutationContract.query.registryLookup(signer.address, 
//             {
//                 gasLimit: api.createType('WeightV2', {
//                     refTime: MAX_CALL_WEIGHT2,
//                     proofSize: PROOFSIZE,
//                 }),
//                 storageDepositLimit: null,
//             }, 
//         who,
//     );
//     return result.toHuman()
// }

// export async function queryClaimedAssets(api, signer, transmutation) {
//     const { gasRequired, storageDeposit, result, output } =  
//         await transmutation.query.getClaimedAssets(signer.address, 
//             {
//                 gasLimit: api.createType('WeightV2', {
//                     refTime: MAX_CALL_WEIGHT2,
//                     proofSize: PROOFSIZE,
//                 }),
//                 storageDepositLimit: null,
//             },
//     );
//     return output
// }

// export async function queryAssetOwner(api, signer, transmutation, seed) {
//     const { gasRequired, storageDeposit, result, output } =  
//         await transmutation.query.getOwner(signer.address, 
//             {
//                 gasLimit: api.createType('WeightV2', {
//                     refTime: MAX_CALL_WEIGHT2,
//                     proofSize: PROOFSIZE,
//                 }),
//                 storageDepositLimit: null,
//             }, seed,
//     );
//     return output
// }

// export async function getPendingSwap(api, signer, transmutation) {
//     const { gasRequired, storageDeposit, result, output } =  
//         await transmutation.query.getPendingSwap(signer.address, 
//             {
//                 gasLimit: api.createType('WeightV2', {
//                     refTime: MAX_CALL_WEIGHT2,
//                     proofSize: PROOFSIZE,
//                 }),
//                 storageDepositLimit: null,
//             },
//         );
//     return output
// }

// export async function getAssetSwapHash(api, signer, transmutation, assetId) {
//     const { gasRequired, storageDeposit, result, output } =  
//     await transmutation.query.getAssetSwap(signer.address, 
//         {
//             gasLimit: api.createType('WeightV2', {
//                 refTime: MAX_CALL_WEIGHT2,
//                 proofSize: PROOFSIZE,
//             }),
//             storageDepositLimit: null,
//         }, assetId,
//     );
//     return output
// }