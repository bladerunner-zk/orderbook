use anchor_lang::prelude::*;
use anchor_spl::{
    token::{
        Mint, 
        Token, 
        TokenAccount,
        Transfer,
        transfer,
    }
};
use crate::constants::*;
use crate::state::*;

#[derive(Accounts)]
#[instruction(
    order_id: u64,
)]
pub struct FillOrder<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(
        constraint = (market.token_a == token_sell.key() && market.token_b == token_buy.key()) 
            || (market.token_b == token_sell.key() && market.token_a == token_buy.key())
    )]
    pub market: Account<'info, Market>,

    #[account(
        mut,
        close = payer,
        seeds = [
            ORDER_SEED.as_bytes(),
            market.key().as_ref(),
            &order_id.to_le_bytes(),
        ],
        bump
    )]
    pub order: Account<'info, Order>,

    #[account(
        constraint = market.token_a == token_sell.key() && order.side == Side::Bid 
            || market.token_b == token_sell.key() && order.side == Side::Ask
    )]
    pub token_sell: Account<'info, Mint>, // token being sold in the order (token that the counterparty is selling)

    #[account(
        constraint = market.token_a == token_sell.key() && market.token_b == token_buy.key() 
            || market.token_b == token_sell.key() && market.token_a == token_buy.key()
    )]
    pub token_buy: Account<'info, Mint>, // token being bought in the order (token that the counterparty is buying)

    #[account(
        mut,
        associated_token::mint = token_sell,
        associated_token::authority = payer
    )]
    pub payer_token_sell_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        associated_token::mint = token_buy,
        associated_token::authority = payer
    )]
    pub payer_token_buy_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        seeds = [
            LOCKUP_SEED.as_bytes(),
            order.key().as_ref(),
        ],
        bump
    )]
    pub lockup: Account<'info, TokenAccount>,


    /// CHECK: We only need the address, not writing or reading into this account.
    #[account(
        address = order.user.key()
    )]
    pub counterparty: UncheckedAccount<'info>,

    #[account(
        mut,
        associated_token::mint = token_buy,
        associated_token::authority = counterparty
    )]
    pub counterparty_token_account: Account<'info, TokenAccount>,

    #[account()]
    pub token_program: Program<'info, Token>,

    #[account()]
    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<FillOrder>,
    _order_id: u64,
) -> Result<()> {
    // let accounts = &mut ctx.accounts;
 let order = &ctx.accounts.order;
    let payer_token_buy_acc = &mut ctx.accounts.payer_token_buy_account;
    let payer_token_sell_acc = &mut ctx.accounts.payer_token_sell_account;
    let counterparty_token_buy_acc = &mut ctx.accounts.counterparty_token_account;
    let payer = &ctx.accounts.payer;
    let token_program = &ctx.accounts.token_program;
    let lockup = &mut ctx.accounts.lockup;

    transfer(
        CpiContext::new(
            token_program.to_account_info(), 
            Transfer { 
                from: payer_token_buy_acc.to_account_info(), 
                to: counterparty_token_buy_acc.to_account_info(), 
                authority: payer.to_account_info()
            }
        ), 
        order.price
    )?;

    let market_key = ctx.accounts.market.key();
    let order_seeds = &[
        ORDER_SEED.as_bytes(),
        market_key.as_ref(),
        &_order_id.to_le_bytes(),
        &[ctx.bumps.order],
    ];

    transfer(
    CpiContext::new_with_signer(
        token_program.to_account_info(), 
        Transfer { 
                from: lockup.to_account_info(), 
                to: payer_token_sell_acc.to_account_info(), 
                authority: order.to_account_info()
        },
        &[order_seeds],
    ), 
    order.amount
    )?;

    Ok(())
}