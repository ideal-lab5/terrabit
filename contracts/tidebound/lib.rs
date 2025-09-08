#![cfg_attr(not(feature = "std"), no_std, no_main)]

use idn_contract_lib::ext::IDNEnvironment;
#[ink::contract(env = IDNEnvironment)]
mod tidebound {

    use crate::IDNEnvironment;

    // use perlin::PerlinNoiseRef;
    use ink::ToAccountId;
    use ink::prelude::vec::Vec;
    use ink::storage::Mapping;
    use ink::env::hash::{
        HashOutput,
        Sha2x256,
    };

    /// any length data (should probably bound this though)
    pub type OpaqueData = Vec<u8>;


    #[derive(PartialEq, Debug, scale::Decode, scale::Encode)]
    #[cfg_attr(
        feature = "std",
        derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout)
    )]
    pub struct WorldConfig {
        /// the world name
        pub name: OpaqueData,
        /// the random seed used to create the world
        pub seed: OpaqueData,
    }

    #[derive(PartialEq, Debug, scale::Decode, scale::Encode)]
    #[cfg_attr(
        feature = "std",
        derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout)
    )]
    pub enum Error {
        /// the player is already registered
        PlayerAlreadyRegistered,
    }

    #[ink(storage)]
    pub struct Tidebound {
        /// A list of all players who have registered
        registered_players: Vec<AccountId>,
        /// registry of all players' worlds
        registry: Mapping<AccountId, WorldConfig>,
    }


    impl Tidebound {

        /// build a new "overworld" game contract
        #[ink(constructor, payable)]
        pub fn new(
            // perlin_noise_contract_code_hash: Hash
        ) -> Self {
            Self {
                registered_players: Vec::new(),
                registry: Mapping::new(),
                // perlin_noise_contract_code_hash,

            }
        }

        #[ink(constructor, payable)]
        pub fn default() -> Self {
            Self::new()
        }

        /// register in the overworld and initialize a game world with a random seed
        /// must be called in order for the game to be "playable"
        ///
        /// world seed is calculated as:
        ///
        ///     rand: [u8;32] = latest_round_randomness;
        ///     seed: [u8; 32] = Sha256(accountId || name) XOR rand;
        ///
        #[ink(message)]
        pub fn roll(
            &mut self,
            name: Vec<u8>,
        ) -> Result<(), Error> {
            let caller = self.env().caller();

            if !self.registered_players.contains(&caller) {
                self.registered_players.push(caller);
            }

            let mut acct_id_bytes: &[u8] = caller.as_ref();
            // generate random seed
            let mut seed: [u8;32] = self.get_seed(acct_id_bytes.try_into().unwrap());
            // add to storage
            self.registry.insert(caller, &WorldConfig { 
                name,
                seed: seed.to_vec(),
            });
            // TODO: emit event
            Ok(())
        }

        // Fetch randomness from IDN
        fn get_seed(&self, ctx: &[u8;32]) -> [u8; 32] {
            self.env().extension().fetch_random(*ctx)
                .unwrap_or([0u8;32])
        }

        #[ink(message)]
        pub fn get_players(&self) -> Vec<AccountId> {
            self.registered_players.clone()
        }

        
        #[ink(message)]
        pub fn registry_lookup(&self, who: AccountId) -> Option<WorldConfig> {
            self.registry.get(who)
        }

        // #[ink(message)]
        // pub fn destroy_island(&mut self) -> Result<(), Error> {
        //     let caller = self.env().caller();

        //     if let Some(asset) = self.registry_lookup(caller) {
        //         self.island_registry.remove(asset.clone());
        //         self.asset_status.remove(asset.clone());
        //         self.pending_swaps.remove(caller.clone());
        //         return Ok(());
        //     }
            
        //     Err(Error::NoOwnedAsset)
        // }

        // #[ink(message)]
        // pub fn get_asset_swap(&self, asset_id: OpaqueAssetId) -> Option<Hash> {
        //     self.asset_status.get(asset_id)
        // }



        // #[ink(message)]
        // pub fn get_owner(&self, asset_id: OpaqueAssetId) -> Option<AccountId> {
        //     self.island_registry.get(asset_id)
        // }

        
        // #[ink(message)]
        // pub fn get_claimed_assets(&self) -> Vec<OpaqueAssetId> {
        //     self.claimed_assets.clone()
        // }

        // #[ink(message)]
        // pub fn get_pending_swap(&self) -> Option<Swap> {
        //     if let Some(hash) = self.pending_swaps.get(self.env().caller()) {
        //         return self.swaps.get(hash);
        //     }
        //     None
        // }

        // /// get all opens swaps the participant is associated with
        // #[ink(message)]
        // pub fn swap_lookup(
        //     &self, 
        //     left: AccountId, 
        //     right: AccountId
        // ) -> Result<(Hash, Swap), Error> {
        //     let merkle_root = Self::calculate_merkle_root(left, right)?;
        //     if let Some(swap) = self.swaps.get(merkle_root)  {
        //         return Ok((merkle_root, swap));
        //     }
        //     Err(Error::SwapDNE)
        // }

        // /// create a new swap 
        // #[ink(message)]
        // pub fn try_new_swap( 
        //     &mut self,
        //     who: AccountId,
        //     deadline: BlockNumber,
        // ) -> Result<(), Error> {
        //     let caller = self.env().caller();
        //     // make sure caller has an asset
        //     if let Some(source_asset_id) = self.registry_lookup(caller.clone()) {
        //         // and neither asset is part of a pending swap
        //         if let None = self.pending_swaps.get(caller.clone()) {
        //             if let None = self.pending_swaps.get(who.clone()) {
        //                 // get the owner of the target asset id
        //                 if let Some(target_asset_id) = self.registry_lookup(who.clone()) {
        //                     let merkle_root = Self::calculate_merkle_root(caller, who.clone())?;
        //                     let swap = Swap {
        //                         asset_id_one: source_asset_id,
        //                         asset_id_two: target_asset_id,
        //                         deadline,
        //                     };
        //                     let hash = Hash::from(merkle_root);
        //                     self.swaps.insert(hash, &swap);
        //                     self.pending_swaps.insert(caller, &hash);
        //                     self.pending_swaps.insert(who, &hash);
        //                 } else {
        //                     return Err(Error::NoSuchAsset);
        //                 }
        //             }
        //         }
        //     } else {
        //         return Err(Error::NoOwnedAsset);
        //     }
            
        //     Ok(())
        // }

        // /// if part of a pending swap, reject it 
        // /// this is needed since each participant can have only one pending swap at a time
        // #[ink(message)]
        // pub fn reject_swap(&mut self) -> Result<(), Error> {
            
        //     if let Some(_root) = self.pending_swaps.take(self.env().caller()) {
        //         return Ok(());
        //     }

        //     Err(Error::InvalidSwap)
            
        // }

        // /// transfers ownership of the asset to the contract at the swap deadline only
        // #[ink(message)]
        // pub fn transmute(&mut self) -> Result<(), Error> {
        //     let caller = self.env().caller();

        //     if let Some(merkle_root) = self.pending_swaps.get(caller) {
        //         if let Some(swap) = self.swaps.get(merkle_root)  {
        //             // transmutation must occur simultaneously
        //             let current_block = self.env().block_number();
        //             if !swap.deadline.eq(&current_block) {
        //                 return Err(Error::InvalidBlockNumber);
        //             }

        //             if let Some(asset_owner_one) = 
        //                 self.island_registry.get(swap.asset_id_one.clone()) {
        //                 if asset_owner_one.eq(&caller) {
        //                     self.asset_status.insert(swap.asset_id_one, &merkle_root);
        //                 } else {
        //                     self.asset_status.insert(swap.asset_id_two, &merkle_root);
        //                 }
        //             }
        //         }
        //     }
        //     Ok(())
        // }

        // #[ink(message)]
        // pub fn complete(&mut self, swap_id: Hash) -> Result<(), Error> {
        //     // let caller = self.env().caller();
        //     // let merkle_root = Self::calculate_merkle_root(caller, from)?;
        //     if let Some(swap) = self.swaps.take(swap_id)  {
        //         let current_block = self.env().block_number();
        //         if swap.deadline > current_block {
        //             return Err(Error::InvalidBlockNumber);
        //         }
        //         // both assets  must be locked (r1 and r2 are merkle roots)
        //         if let Some(r1) = self.asset_status.get(swap.asset_id_one.clone()) {
        //             if let Some(r2) = self.asset_status.get(swap.asset_id_two.clone()) {
        //                 if !r1.eq(&swap_id) || !r2.eq(&swap_id) {
        //                     return Err(Error::InvalidSwap);
        //                 }
        //             }   
        //         }
        //         // execute the swap
        //         if let Some(asset_owner_one) = self.island_registry.get(swap.asset_id_one.clone()) {
        //             if let Some(asset_owner_two) = self.island_registry.get(swap.asset_id_two.clone()) {
        //                 self.island_registry.insert(swap.asset_id_one.clone(), &asset_owner_two);
        //                 self.island_registry.insert(swap.asset_id_two.clone(), &asset_owner_one);
        //                 self.pending_swaps.remove(asset_owner_one);
        //                 self.pending_swaps.remove(asset_owner_two);
        //                 self.asset_status.remove(swap.asset_id_one);
        //                 self.asset_status.remove(swap.asset_id_two);
        //             }
        //         }
        //     }

        //     Ok(())
        // }

        // /// a helper function to calculate a merkle root
        // pub fn calculate_merkle_root(
        //     left: AccountId, 
        //     right: AccountId
        // ) -> Result<Hash, Error> {
        //     let mut leaf_values = [left, right];
        //     let leaves: Vec<[u8;32]> = 
        //         leaf_values
        //             .iter_mut()
        //             .map(|x| Sha256::hash(x.as_mut()))
        //             .collect();
        //     let merkle_tree = MerkleTree::<Sha256>::from_leaves(&leaves);
        //     // this should never happen
        //     if let Some(merkle_root) = merkle_tree.root() {
        //         return Ok(Hash::from(merkle_root));
        //     }
        //     Err(Error::InvalidMerkleTree)
        // }
    }

   
}
