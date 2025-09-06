#![cfg_attr(not(feature = "std"), no_std, no_main)]
pub use self::perlin::{PerlinNoise, PerlinNoiseRef};

use idl_contract_extension::idn_ext::IDNEnvironment;

#[ink::contract(env = IDNEnvironment)]
mod perlin {

    use crate::IDNEnvironment;

    use ink::prelude::vec::Vec;
    use ink::storage::Mapping;
    use ink::env::hash::{
        HashOutput,
        Sha2x256,
    };

    use sha3::{Digest, Sha3_256};

    #[derive(PartialEq, Debug, scale::Decode, scale::Encode)]
    #[cfg_attr(
        feature = "std",
        derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout)
    )]
    pub enum ContractError {
        Error,
    }

    #[ink(storage)]
    pub struct PerlinNoise {
        seed: u32,
        scale: u32,
        owner: AccountId,
        noise: Mapping<(u32, u32), u128>,
    }

    impl PerlinNoise {
        #[ink(constructor)]
        pub fn new(
            owner: AccountId,
            seed: u32,
            scale: u32,
        ) -> Self {

            // let's precompute some perlin noise within a grid of radius 1 about the origin 
            let mut noise = Mapping::new();
            [
                [-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 0], [0, 1], [1, -1], [1, 0], [1, 1]
            ].iter().for_each(|(x, y)| => {
                let z = self.compute_perlin_scaled(x, y, seed, scale);
                noise.insert((x, y), &z);
            });

            Self {
                seed,
                scale,
                owner,
                noise,
            }
        }

        fn get_gradient_at(
            &self,
            x: u32,
            y: u32,
            scale: u32,
            seed: u32,
        ) -> [i16; 2] {
            let mut hasher = Sha3_256::new();
            hasher.update(
                [
                    x.to_le_bytes(), 
                    y.to_le_bytes(), 
                    scale.to_le_bytes(), 
                    seed.to_le_bytes()
                ].concat()
            );
            let hash = hasher.finalize();
            let mut idx: u32 = 0;
            for byte in hash {
                 idx = idx.wrapping_add(byte as u32);
            }
            idx %= 16;
    
            let vecs: [[i16; 2]; 16] = [
                [1000, 0], [923, 382], [707, 707], [382, 923],
                [0, 1000], [-383, 923], [-708, 707], [-924, 382],
                [-1000, 0], [-924, -383], [-708, -708], [-383, -924],
                [-1, -1000], [382, -924], [707, -708], [923, -383]
            ];
            
            vecs[idx as usize]
        }
    
        fn get_weight(
            &self,
            corner_x: u32,
            corner_y: u32,
            x: u32,
            y: u32,
            scale: u32,
        ) -> u64 {
            let mut res: u64 = 1;
            
            if corner_x > x {
                res = res.saturating_mul(
                    scale.saturating_sub(corner_x.saturating_sub(x)) as u64);
            } else {
                res = res.saturating_mul(
                    scale.saturating_sub(x.saturating_sub(corner_x)) as u64);
            }
    
            if corner_y > y {
                res = res.saturating_mul(
                    scale.saturating_sub(corner_y.saturating_sub(y)) as u64);
            } else {
                res = res.saturating_mul(
                    scale.saturating_sub(y.saturating_sub(corner_y)) as u64);
            }
    
            res
        }
    
        fn get_corners(
            &self,
            x: u32,
            y: u32,
            scale: u32,
        ) -> [[u32; 2]; 4] {
            // TODO: do we want to unwrap or 0, or should we the function fail?
            let lower_x = x.checked_div(scale).unwrap_or(0)
                .saturating_mul(scale);
            let lower_y = y.checked_div(scale).unwrap_or(0)
                .saturating_mul(scale);
    
            [
                [lower_x, lower_y],
                [lower_x.saturating_add(scale), lower_y],
                [lower_x.saturating_add(scale), lower_y.saturating_add(scale)],
                [lower_x, lower_y.saturating_add(scale)]
            ]
        }
    
        fn get_single_scale_perlin(
            &self,
            x: u32,
            y: u32,
            scale: u32,
            seed: u32,
        ) -> i128 {
            let corners = self.get_corners(x, y, scale);
    
            let mut res_numerator: i128 = 0;
    
            for i in 0..4 {
                let corner = corners[i];
                
                let offset = [
                    (x as i32).saturating_sub(corner[0] as i32), 
                    (y as i32).saturating_sub(corner[1] as i32)
                ];
                
                let gradient = self.get_gradient_at(corner[0], corner[1], scale, seed);
                
                let dot = (offset[0] as i64).saturating_mul(gradient[0] as i64)
                    .saturating_add((offset[1] as i64).saturating_mul(gradient[1] as i64));
                
                let weight = self.get_weight(corner[0], corner[1], x, y, scale);
                
                res_numerator = res_numerator.saturating_add((weight as i128).saturating_mul(dot as i128));
            }
    
            let scale_u128 = scale as u128;
            res_numerator.checked_div(1000_u128.saturating_mul(scale_u128.saturating_pow(3)) as i128)
                .unwrap_or(0)
        }

        fn compute_perlin_scaled(
            &self,
            x: u32,
            y: u32,
            seed: u32,
            scale: u32,
        ) -> i128 {
            let mut perlin: i128 = 0;

            for i in 0..3 {
                let v = self.get_single_scale_perlin(x, y, scale.saturating_mul(2_u32.pow(i)), seed);
                perlin = perlin.saturating_add(v);
            }

            let v = self.get_single_scale_perlin(x, y, scale, seed);
            perlin = perlin.saturating_add(v);

            perlin = perlin.saturating_div(4);

            // Scale and shift
            let perlin_max = 64_i128;
            let perlin_scaled_shifted = perlin
                .saturating_mul(perlin_max / 2)
                .saturating_add(perlin_max / 2);
            perlin_scaled_shifted
        }
    
        #[ink(message)]
        pub fn compute_perlin(
            &mut self,
            x: u32,
            y: u32,
        ) -> Result<(), ContractError> {
            // TODO: check that there isn't already noise for the coordinates
            // TODO: check that the caller is the owner
            let seed = self.seed;
            let scale = self.scale;

            let perlin_scaled_shifted = self.compute_perlin_scaled(x, y, seed, scale);
    
            self.noise.insert((x, y), &(perlin_scaled_shifted as u128));
            // TODO: emit an event
            Ok(())
        }
    }

   
}
