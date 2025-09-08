import React, { useContext, useEffect, useState } from 'react';
import { IdnContext } from '../../IdnContext';
import './transmutation.css';

import { complete, getAssetSwapHash, getPendingSwap, queryAssetOwner, queryClaimedAssets, rejectSwap, transmute__call, tryNewSwap } from '../../services/transmutation.service';
import { Link, useNavigate } from 'react-router-dom';
import { hexToString, hexToU8a } from '@polkadot/util';

function Transmutation() {

    const { etf, signer, contract, latestBlock } = useContext(IdnContext);

    const [activeSwap, setActiveSwap] = useState('');
    const [swapStatus, setSwapStatus] = useState('');
    const [swap, setSwap] = useState('');
    const [refreshKey, setRefreshKey] = useState(0);
    const [showInfo, setShowInfo] = useState(true);

    // const [swapAcceptanceStatus, setSwapAcceptanceStatus] = useState(false);

    const [to, setTo] = useState('');
    const [deadline, setDeadline] = useState(0);

    useEffect(() => {
        const setup = async () => {
            let swap = await getPendingSwap(etf, signer, contract);
            if (swap) {
                setSwap(swap.toHuman().Ok);
                if (swap.Ok) {
                    let activeSwap = await handleQueryActiveSwapHash(swap.Ok);
                    setActiveSwap(activeSwap);
                    setSwapStatus(localStorage.getItem(activeSwap))
                }
            }
            
        }
        setup();
    }, [refreshKey]);

    const handleTransmute = async () => {
        // submit a delayed transaction to call transmute at the swap deadline
        let innerCall = (etf, contract);
        let deadlineBlock = parseInt(swap['deadline'].replaceAll(",", ""));
        // console.log(deadline)
        // let diff = deadlineBlock - etf.latestBlockNumber;
        // let slot = latestBlock + diff;
        let outerCall = await etf.delay(innerCall, 99, deadlineBlock);
        console.log(outerCall)
        await outerCall.signAndSend(signer.address, result => {
            if (result.status.isInBlock) {
                console.log('transmutation scheduled')
                localStorage.setItem(activeSwap, true);
                setRefreshKey((prevKey) => prevKey + 1);
            }
        });
    }

    const handleQueryActiveSwapHash = async (swap) => {
        let hash = await getAssetSwapHash(etf, signer, contract, swap['assetIdOne']);
        if (hash) {
            return hash.toHuman().Ok;    
        } else {
            return null;
        }
        
    }

    const handleReject = async () => {
        await rejectSwap(etf, signer, contract, result => {
            if (result.status.isInBlock) {
                console.log('swap rejected');
                setRefreshKey((prevKey) => prevKey + 1);
                setActiveSwap(null);
            }
        });
    }

    const handleCreateSwap = async () => {
        await tryNewSwap(etf, signer, contract, to, deadline, result => {
            console.log('it worked!');
            setRefreshKey((prevKey) => prevKey + 1);
        });
    }

    const handleCompleteSwap = async () => {
        await complete(etf, signer, contract, activeSwap, result => {
            if (result.status.isInBlock) {
                console.log('it worked! swap completed')
                setRefreshKey((prevKey) => prevKey + 1);
                setSwap(null);
                setActiveSwap('');
            }
        });
    }

    return (
        <div className='container' key={refreshKey}>
            Transmute Assets
            {showInfo && (
            <div className='fixed-textbox inner'>
            <h3>Instructions</h3>
            { activeSwap === null || activeSwap === '' && (
            <p>
                Transmutation lets two parties trustlessly swap their worlds. It is a two-party <b>non-interactive trustless atomic asset swap </b>
                 enabled with secure delayed transactions (timelock encryption). Specify the owner of the seed you want to swap with.
                 If both recipients accept the swap by the deadline, then the protocol can be completed and the worlds are swapped.
                 If either party rejects or does not participate, then it fails.
                 <br/>
                <b>If swap creation fails, check if the other party is already in an active swap or does not have an asset.</b>
            </p>
            
            )}
            {swap && (
                <div>
                    { parseInt(swap['deadline'].replaceAll(",", "")) < etf.latestBlockNumber && (
                    <p>
                        If a swap is expired and either participant rejected or didn't participate, 
                         then you must reject if before participating in a new swap.
                    </p>
                    )}  
                </div>
            )}

            {swap && !activeSwap && !swapStatus && (
                <p>
                    Swaps can either be accepted or rejected. When a swap is accepted, a delayed transaction is submitted to the chain to be 
                     executed at the swap's specified deadline. If rejected, then the swap is failed and there are no consequences.
                </p>
            )}

            { swapStatus && (
                <p>
                    Once accepted (delayed transaction submitted), you must wait for the swap deadline.
                </p>
            )}

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
            <div className='transmutation-body'>
                <span>Current Block: {latestBlock}</span>
                {!activeSwap && !swap ?
                    <div className='pending-swap-container'>
                        <span>Create a new swap</span>
                        <label htmlFor='acct-id-input'>AccountId</label>
                        <input type="text" id="acct-id-input" value={to} onChange={e => setTo(e.target.value)} />
                        <label htmlFor='deadline-input'>Deadline (block)</label>
                        <input onChange={e => setDeadline(e.target.value)} type="number" id="deadline-input" placeholder={latestBlock} />
                         <button className="open-button" onClick={handleCreateSwap}>
                            Create Swap
                        </button>
                    </div> :
                    <div>
                        { activeSwap && (
                            <div className='pending-swap-container'>
                                <span className='copy' onClick={() => navigator.clipboard.writeText(activeSwap)}>
                                    Swap Id: { activeSwap.slice(0, 8) + '...' }
                                </span>
                                <button className="open-button" onClick={handleCompleteSwap}>Complete</button>
                            </div>)}
                            { swap && (
                            <div className='pending-swap-container'>
                                <span>Pending Swap</span>
                                <span className='copy' onClick={() => navigator.clipboard.writeText(swap['assetIdOne'])}>Asset One: { swap['assetIdOne'].slice(0, 6) + '...' } </span>
                                <span className='copy' onClick={() => navigator.clipboard.writeText(swap['assetIdTwo'])}>Asset Two: {swap['assetIdTwo'].slice(0, 6) + '...'} </span>
                                <span>Deadline: {swap['deadline']} </span>
                                {parseInt(swap['deadline'].replaceAll(",", "")) < etf.latestBlockNumber ?
                                    <div>
                                        {/* {swapStatus && (
                                            <button className="open-button" onClick={handleCompleteSwap}>Complete</button>
                                        )} */}
                                        {!swapStatus && (
                                        <div>
                                            <button className="open-button" onClick={handleCompleteSwap}>Complete</button>
                                            <button className="open-button" onClick={handleReject}>Reject Swap (expired)</button>
                                        </div>)}
                                    </div> :
                                    <div>
                                        { swapStatus && ( <span>Swap Accepted, waiting { parseInt(swap['deadline'].replaceAll(",", "")) - etf.latestBlockNumber } blocks for deadline. </span> )}
                                        { !swapStatus && (
                                        <div>
                                            <button className="open-button" onClick={handleTransmute}>Accept</button>
                                            <button className="open-button" onClick={handleReject}>Reject</button>
                                        </div>
                                        ) }
                                    </div>}
                                </div>
                            ) }
                    </div>
                }
            </div>
        </div>
    );
};

export default Transmutation;
