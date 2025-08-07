pub mod constants;
pub mod error;
pub mod instructions;
pub mod state;

use anchor_lang::prelude::*;

pub use constants::*;
pub use instructions::*;
pub use state::*;

declare_id!("85f9vuQUP56MuuwDoPYuzHmhc2MjmN1rDvSJvfNAANFN");

#[program]
pub mod orderbook {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        initialize::handler(ctx)
    }

    pub fn initialize_market(ctx: Context<InitializeMarket>) -> Result<()> {
        initialize_market::handler(ctx)
    }
}
