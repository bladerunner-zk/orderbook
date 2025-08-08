use anchor_lang::prelude::*;

#[derive(AnchorDeserialize, AnchorSerialize, Clone, PartialEq, InitSpace)]
pub enum Side {
    Bid,
    Ask
}

#[account]
#[derive(InitSpace)]
pub struct Order {
    pub index: u64,
    pub side: Side,
    pub user: Pubkey,
    pub price: u64,
    pub amount: u64,
}