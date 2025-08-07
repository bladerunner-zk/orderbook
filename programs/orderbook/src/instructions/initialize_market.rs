use anchor_lang::prelude::*;
use anchor_spl::token::{
    Mint
};
use crate::constants::*;
use crate::state::*;

#[derive(Accounts)]
pub struct InitializeMarket<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(
        init,
        payer = payer,
        space = 8 + Market::INIT_SPACE,
        seeds = [
            MARKET_SEED.as_bytes(),
            token_a.key().as_ref(),
            token_b.key().as_ref()
        ],
        bump
    )]
    pub market: Account<'info, Market>,

    #[account()]
    pub token_a: Account<'info, Mint>,

    #[account()]
    pub token_b: Account<'info, Mint>,

    #[account()]
    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<InitializeMarket>,
) -> Result<()> {
    let market = &mut ctx.accounts.market;
    let token_a = &ctx.accounts.token_a;
    let token_b = &ctx.accounts.token_b;

    market.token_a = token_a.key();
    market.token_b = token_b.key();
    market.bump = ctx.bumps.market;
    market.orders = 0;

    Ok(())
}