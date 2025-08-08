use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct Market {
    pub bump: u8,
    pub orders: u64,
    pub token_a: Pubkey,
    pub token_b: Pubkey,
}
