/* global BigInt */
import { web3Enable, web3Accounts, web3FromAddress } from "@polkadot/extension-dapp";
import { useContext, useEffect, useState } from 'react';
import { IdnContext } from "../IdnContext";
// import Modal from "react-mnod";

import './connect.component.css';

function Modal(props) {
    const { title, visible, children, onClose } = props;

    if (!visible) {
        return null;
    }

    const handleBackdropClick = (e) => onClose();
    const handleModalClick = (e) => e.stopPropagation();

    return (
        <div
            className="cursor-pointer fixed left-0 top-0 z-[1055] block h-full w-full overflow-y-auto overflow-x-hidden outline-none flex backdrop-blur-sm items-center justify-center"
            id="modal-overlay"
            onClick={handleBackdropClick}
        >
            <div className="cursor-default bg-white rounded-lg border-2 px-4 py-6" onClick={handleModalClick}>
                <h2 className="text-2xl font-bold leading-tight tracking-tight text-gray-900 pb-3 px-4 text-center">
                    {title}
                </h2>
                {children}
            </div>
        </div>
    )
}

function WalletConnect(props) {

    const [isConnected, setIsConnected] = useState(false);
    const [showWalletSelection, setShowWalletSelection] = useState(true)
    const [signerAddress, setSignerAddress] = useState("");
    const [availableAccounts, setAvailableAccounts] = useState([]);
    // const [balance, setBalance] = useState(0);

    const { api } = useContext(IdnContext);

    useEffect(() => {
        handleConnect()
    }, []);

    async function connect() {
        await web3Enable('TerraBit');
        const allAccounts = await web3Accounts();
        setAvailableAccounts(allAccounts);
    }

    // Handler for the click event of the `Connect` button
    const handleConnect = async () => {
        await connect();
    }

    const checkBalance = async (address) => {
        let bal = await api.query.system.account(address);
        let bigBalance = BigInt(parseInt(bal.data.free))
        props.setBalance(Number(bigBalance) || 0);
    }

    const handleSelectWallet = (address) => async () => {
        // finds an injector for an address
        const injector = await web3FromAddress(address);
        props.setSigner({ signer: injector.signer, address });
        setSignerAddress(address);
        setIsConnected(true);
        setShowWalletSelection(false);
        api.setSigner(injector.signer);
        checkBalance(address)
    }

    return (
        <div className="connect">
            {isConnected ?
                <div className="wallet-amount">
                    <span className="copy" onClick={() => navigator.clipboard.writeText(signerAddress)}>
                        Address: {signerAddress.slice(0, 4) + '...' + signerAddress.slice(signerAddress.length - 4)}
                    </span>
                    {/* <span>Balance: {balance} IDN</span> */}
                </div> :
                <div className="connect-modal-container">
                    <Modal
                        title="Select an account"
                        visible={showWalletSelection}
                        onClose={() => setShowWalletSelection(false)}
                    >
                        {availableAccounts.length > 0 ?
                            <table className="account-selection-table">
                                <thead>
                                    <tr>
                                        <th scope="col">Name</th>
                                        <th scope="col">Address</th>
                                        <th scope="col" />
                                    </tr>
                                </thead>
                                <tbody>
                                    {availableAccounts.map((account, index) => (
                                        <tr key={index}>
                                            <td>
                                                {account.meta.name.substring(0, 8) + (account.meta.name.length > 8 ? ' ...' : '')}
                                            </td>
                                            <td className="address">
                                                <span onClick={() => navigator.clipboard.writeText(account.address)} className='clickable'>
                                                    {account.address.substring(0, 8) + '...'}
                                                </span>
                                            </td>
                                            <td>
                                                <button className="open-button" onClick={handleSelectWallet(account.address)}>
                                                    Connect
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table> :
                            <div>
                                <h3>You need a polkadotjs wallet and at least one account to play.</h3>
                            </div>
                        }</Modal>
                </div>
            }</div>
    );
}

export default WalletConnect;