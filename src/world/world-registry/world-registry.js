import React, { useContext, useEffect, useState } from 'react';
import { IdnContext } from '../../../IdnContext';
import './world-registry.css';

import {queryAssetOwner, queryClaimedAssets} from '../../../services/transmutation.service';
import { Link, useNavigate } from 'react-router-dom';
import { hexToString, hexToU8a } from '@polkadot/util';

function WorldRegistry() {


   const navigate = useNavigate();

   const { etf, signer, contract } = useContext(IdnContext);
   
   const [knownAssetIds, setKnownAssetIds] = useState([]);

   useEffect(() => {
      handleQueryClaimedAssets();
   }, []);

   const handleQueryClaimedAssets = async () => {
      let output = await queryClaimedAssets(etf, signer, contract);
      if (output) {
         setKnownAssetIds(output.toHuman().Ok);
      }
      
   }

   const handleNavigateToWorldView = async (seed) => {
      let owner = await handleQueryOwner(seed);
      navigate(`/${owner.Ok}`);
   }

   const handleQueryOwner = async (seed) => {
      let result = await queryAssetOwner(etf, signer, contract, seed);
      if (result) {
         return result.toHuman();
      } else {
         return null;
      }
      
   }

   return (
   <div className='container world-registry-component'>
      World Registry
      <div className='world-registry-body'>
         <table>
            <thead>
               <tr>
                  <th>
                     Seed
                  </th>
                  <th>
                     Details
                  </th>
               </tr>
            </thead>
            <tbody>
               { knownAssetIds.map((item, idx) => {
                  return (
                     <tr key={idx}>
                        <td>
                           { item.slice(0, 5) + '...' + item.slice(item.length - 4) }
                        </td>
                        <td>
                           <button className='details-button' onClick={() => handleNavigateToWorldView(item)}>
                              Details
                           </button>
                        </td>
                     </tr>
                  );
               }) }
            </tbody>
         </table>
      </div>
   </div>
   );
};

export default WorldRegistry;
