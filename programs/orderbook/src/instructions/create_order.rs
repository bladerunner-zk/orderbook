use anchor_lang::prelude::*;
use anchor_spl::token::Token;
use anchor_spl::token::{
    TokenAccount, 
    Mint,
    transfer,
    Transfer
};
use crate::constants::*;
use crate::state::*;

#[derive(Accounts)]
#[instruction(
    price: u64,
    side: Side,
    amount: u64,
)]
pub struct CreateOrder<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(
        constraint = (market.token_a == token_sell.key() && market.token_b == token_buy.key() && side == Side::Bid) 
            || (market.token_b == token_sell.key() && market.token_a == token_buy.key() && side == Side::Ask),
    )]
    pub market: Account<'info, Market>,

    #[account()]
    pub token_sell: Account<'info, Mint>,

    #[account()]
    pub token_buy: Account<'info, Mint>,

    #[account(
        init,
        payer = payer,
        space = 8 + Order::INIT_SPACE,
        seeds = [
            ORDER_SEED.as_bytes(),
            market.key().as_ref(),
            &market.orders.to_le_bytes(),
        ],
        bump
    )]
    pub order: Account<'info, Order>,

    #[account(
        associated_token::authority = payer,
        associated_token::mint = token_sell,
    )]
    pub user_token_account: Account<'info, TokenAccount>,

    #[account(
        init,
        payer = payer,
        token::authority = order,
        token::mint = token_sell,
        seeds = [
            LOCKUP_SEED.as_bytes(),
            order.key().as_ref(),
        ],
        bump,
    )]
    pub lockup: Account<'info, TokenAccount>,

    #[account()]
    pub token_program: Program<'info, Token>,

    #[account()]
    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<CreateOrder>,
    price: u64,
    side: Side,
    amount: u64,
) -> Result<()> {
    let payer = &ctx.accounts.payer;
    let market = &mut ctx.accounts.market;
    let order = &mut ctx.accounts.order;
    let token_program = &ctx.accounts.token_program;

    let lockup = &ctx.accounts.lockup;
    let user_token_account = &ctx.accounts.user_token_account;

    order.index = market.orders;
    order.amount = amount;
    order.side = side;
    order.price = price;
    order.user = payer.key();

    market.orders += 1;

    transfer(
        CpiContext::new(
            token_program.to_account_info(), 
            Transfer { 
                from: user_token_account.to_account_info(), 
                to: lockup.to_account_info(), 
                authority: payer.to_account_info()
            }
        ), 
        amount
    )?;

    Ok(())
}