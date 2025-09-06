#![cfg_attr(not(feature = "std"), no_std, no_main)]

use idl_contract_extension::idn_ext::IDNEnvironment;

#[ink::contract(env = IDNEnvironment)]
mod tidebound {

    use crate::IDNEnvironment;

    use perlin::PerlinNoiseRef;
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
        /// the world contract address
        pub address: AccountId,
        /// the world name
        pub name: OpaqueData,
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
        /// registry of all players' worlds
        registry: Mapping<AccountId, WorldConfig>,
        /// The perlin noise contract code hash
        perlin_noise_contract_code_hash: Hash,
    }


    impl Tidebound {

        /// build a new "overworld" game contract
        #[ink(constructor, payable)]
        pub fn new(perlin_noise_contract_code_hash: Hash) -> Self {
            Self {
                registry: Mapping::new(),
                perlin_noise_contract_code_hash,

            }
        }

        // #[ink(constructor, payable)]
        // pub fn default() -> Self {
        //     Self::new()
        // }

        /// register in the overworld and initialize a game world with a random seed
        /// must be called in order for the game to be "playable"
        ///
        /// world seed is calculated as:
        ///
        ///     rand: [u8;32] = latest_round_randomness;
        ///     seed: [u8; 32] = Sha256(accountId || name) XOR rand;
        ///
        #[ink(message)]
        pub fn register(
            &mut self,
            name: Vec<u8>,
        ) -> Result<(), Error> {
            let caller = self.env().caller();

            let mut acct_id_bytes: &[u8] = caller.as_ref();
            let concat = [
                acct_id_bytes.to_vec(), 
                name.clone()
            ].concat();
            let mut seed: [u8;32] = self.get_seed();
            let roll = self.roll(seed, &concat);
            // TODO: idk, arbitarily picked 10
            let scale = 10;
            // deploy Perlin contract
            let noise_contract = PerlinNoiseRef::new(
                caller,
                roll,
                scale,
            )
                .endowment(0)
                .code_hash(self.perlin_noise_contract_code_hash)
                .salt_bytes(seed)
                .instantiate();
            let account_id = noise_contract.to_account_id();
            // TODO: emit event
            Ok(())
        }

        /// roll the dice, get 32 bytes of fresh randomness
        /// outputs: roll := round_randomness XOR sha256(concat)
        ///
        /// * `concat`: Any length input
        ///
        fn roll(&self, mut seed: [u8;32], concat: &[u8]) -> u32 {
            let hash = self.env().hash_bytes::<Sha2x256>(&concat);
            hash.clone().iter().enumerate().for_each(|(i, bit)| {
                seed[i] = seed[i] ^ bit;
            });
            let mut result: u32 = 0;
            for byte in hash {
                result = result.wrapping_add(byte as u32);
            }
            result
        }

         // Fetch 32 bytes of randomness from the IDN and convert it to a 32-byte array
         fn get_seed(&self) -> [u8; 32] {
            self.env().extension().random() // Fetch randomness from IDN
        }


        // /// join the game (open to public)
        // #[ink(message)]
        // pub fn join(&mut self) -> Result<(), Error> {
        //     let caller = self.env().caller();

        //     let mut updatedPlayers = self.players.clone();
        //     // TODO: enforce upper bound on number of players based on the size of the island
        //     // max_players = (size^2 + 1)/(size^2 - 1)? or just make it freely configurable?
        //     //  floor(sqrt(size)): 1-4 => 1, 5-8 => 2, 9-15 => 3, 16-24 => 4, 25-35 => 5, 36-48 => 6, ..., 100- 120 => 10
        //     // floor((size^2 - 1)/(size^2 + 1)):  1 => 0, 2 => 0
        //     if !updatedPlayers.contains(&caller) {
        //         updatedPlayers.push(caller);
        //         self.players = updatedPlayers;
        //         return Ok(());
        //     }

        //     Err(Error::PlayerAlreadyRegistered)
        // }

        // /// a player takes their next turn
        // /// 1. generates fresh randomness
        // /// 2. uses that randomness to do something to the player state...
        // #[ink(message)]
        // pub fn move(
        //     &mut self,
        // ) -> Result<(), Error> {
        //     let caller = self.env().caller();
        //     // 1. check that it is the caller's turn
        //     if let Some(next) = self.next_player {
        //         if next == caller {
        //             // roll = rand xor hash(caller)
        //             let caller_bytes: &[u8] = caller.as_ref();
        //             let rand = self.roll(&[caller_bytes.to_vec()].concat());

        //             // then something happens here
        //             // but this is where it gets difficult
        //             // because the hex grid and noise function do not actually exist within this contract...
        //             // so maybe I need to use circom? 
        //             // somehow generate the noise offchain, encode it as a static [x,y,z] vec and initialize the contract with it
        //             // 

        //             return Ok(());
        //         }
        //         return Err(Error::WaitYourTurn);
        //     }

        //     Err(Error::NoPlayers)
        // }

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
        // pub fn registry_lookup(&self, who: AccountId) -> Option<OpaqueAssetId> {
        //     if let Some(found_seed) = self.claimed_assets.iter().find(|seed| {
        //         self.island_registry
        //             .get(seed)
        //             .map_or(false, |registry_entry| registry_entry.eq(&who))
        //     }) {
        //         return Some(found_seed.clone());
        //     }
        //     None
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
