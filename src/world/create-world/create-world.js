import React, { useContext, useState } from 'react';
import { IdnContext } from '../../../IdnContext';
import './create-world.css';
import {randomSeed} from '../../../services/transmutation.service';

function CreateWorld(props) {
   const { etf, signer, contract } = useContext(IdnContext);

   // const [name, setName] = useState('');
   const [nonce, setNonce] = useState('');
   const [seedInputError, setSeedInputError] = useState('');

   const handleInputChange = (event) => {
      const value = event.target.value;
  
      // Check if the length in bytes is within the limit (48 bytes in this case)
      if (value.length <= 48) {
         setSeedInputError("");
         setNonce(value);
      } else {
         setSeedInputError("nonce too long");
      }
    };

   const createWorld = async () => {      
      let paddedNonce = nonce.padEnd(48, '0');
      await randomSeed(etf, signer, paddedNonce, contract, result => {
         props.callback(result);
      });
   }

   return (
   <div>
      Create World
      <div className='container create-world-body'>
         <label htmlFor='seed'>Nonce (max 48-bytes)</label>
         <input 
            id="seed" 
            type="text" 
            value={nonce} 
            onChange={handleInputChange}>
         </input>
         { seedInputError !== "" ? <span>{ seedInputError }</span> : <span></span> } 
         <button className='open-button' onClick={createWorld} disabled={seedInputError !== ""}>
            Create World
         </button>
      </div>
   </div>
   );
};

export default CreateWorld;
