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

    pub fn create_order(
        ctx: Context<CreateOrder>,
        price: u64,
        side: Side,
        amount: u64,
    ) -> Result<()> {
        create_order::handler(ctx, price, side, amount)
    }

    pub fn initialize_market(ctx: Context<InitializeMarket>) -> Result<()> {
        initialize_market::handler(ctx)
    }

    pub fn fill_order(ctx: Context<FillOrder>, order_id: u64) -> Result<()> {
        fill_order::handler(ctx, order_id)
    }
}
