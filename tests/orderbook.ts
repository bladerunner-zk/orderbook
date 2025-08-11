import * as anchor from "@coral-xyz/anchor";
import { BN, Program } from "@coral-xyz/anchor";
import { Orderbook } from "../target/types/orderbook";
import { TOKEN_PROGRAM_ID, createMint, getOrCreateAssociatedTokenAccount } from "@solana/spl-token";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { mintTo } from "@solana/spl-token";
import { expect } from "chai";

import { createTestValues, type TestValues, type User, } from './utils' 

async function initializeMarket(
    values: TestValues, 
    provider: anchor.Provider, 
    program: Program<Orderbook>
) {
    const { marketPda, mintA, mintB } = values;
    await program.methods
        .initializeMarket()
        .accounts({
            payer: provider.wallet.publicKey,
            market: marketPda,
            tokenA: mintA,
            tokenB: mintB,
            systemProgram: SystemProgram.programId,
        })
        .rpc();
}

describe("orderbook", () => {
    // Configure the client to use the local cluster.
    anchor.setProvider(anchor.AnchorProvider.env());
    const program = anchor.workspace.orderbook as Program<Orderbook>;
    const provider = anchor.getProvider();

    let values: TestValues;

    beforeEach(async () => {
        values = await createTestValues(provider, program);
    });

    it("Initializes a market", async () => {
        await initializeMarket(values, provider, program);

        // Fetch and check the market account
        const market = await program.account.market.fetch(values.marketPda);
        expect(market.tokenA.toBase58()).to.equal(values.mintA.toBase58());
        expect(market.tokenB.toBase58()).to.equal(values.mintB.toBase58());
        expect(market.orders.toNumber()).to.equal(0);
        expect(market.bump).to.equal(values.marketBump);
    });

    it("Creates and fills order: sell token A for token B", async () => {
        const getTokenBalance = async(tokenAccount) => {
            let balance = (await provider.connection.getTokenAccountBalance(tokenAccount.address)).value;
            return balance.uiAmount * (10 ** balance.decimals);
        }

        const price = new BN(1000);
        const side = { bid: {} };
        const amount = new BN(10);

        const makerTokenABalanceBeforeOrder = await getTokenBalance(values.maker.tokenAccountA);
        console.log("Maker token A balance before order:", makerTokenABalanceBeforeOrder);

        await initializeMarket(values, provider, program);

        const market = await program.account.market.fetch(values.marketPda);
        const orderIndex = market.orders.toNumber();

        const [orderPda] = PublicKey.findProgramAddressSync(
            [
                Buffer.from("order"),
                values.marketPda.toBuffer(),
                new BN(orderIndex).toArrayLike(Buffer, "le", 8),
            ],
            program.programId
        );

        const [lockupPda] = PublicKey.findProgramAddressSync(
            [
                Buffer.from("lockup"),
                orderPda.toBuffer(),
            ],
            program.programId
        );

        await program.methods.createOrder(price, side, amount)
        .accounts({
            payer: values.maker.keypair.publicKey,
            market: values.marketPda,
            tokenSell: values.mintA,
            tokenBuy: values.mintB,
            order: orderPda,
            userTokenAccount: values.maker.tokenAccountA.address,
            lockup: lockupPda,
            tokenProgram: TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
        })
        .signers([values.maker.keypair])
        .rpc();

        const order = await program.account.order.fetch(orderPda);
        expect(order.price.toNumber()).to.equal(price.toNumber());
        expect(order.side).to.deep.equal(side);
        expect(order.amount.toNumber()).to.equal(amount.toNumber());

        const makerTokenABalanceAfterOrder = await getTokenBalance(values.maker.tokenAccountA);
        // console.log("Maker token A balance after order:", makerTokenABalanceAfterOrder);

        expect(makerTokenABalanceAfterOrder).to.equal(makerTokenABalanceBeforeOrder - amount.toNumber());

        /* logging
            for (const user of [values.maker, values.taker]) {
                let name = user === values.maker ? "maker" : "taker";
                let balanceA = await getTokenBalance(user.tokenAccountA);
                let balanceB = await getTokenBalance(user.tokenAccountB);

                console.log(`${name} token A balance before fill order:`, balanceA);
                console.log(`${name} token B balance before fill order:`, balanceB);
            }
        */

        let takerTokenBBalanceBeforeFill = await getTokenBalance(values.taker.tokenAccountB);
        let takerTokenABalanceBeforeFill = await getTokenBalance(values.taker.tokenAccountA);
        let makerTokenBBalanceBeforeFill = await getTokenBalance(values.maker.tokenAccountB);

        await program.methods
            .fillOrder(order.index)
            .accounts({
                payer: values.taker.keypair.publicKey,
                market: values.marketPda,
                order: orderPda,
                tokenSell: values.mintA,
                tokenBuy: values.mintB,
                payerTokenSellAccount: values.taker.tokenAccountA.address,
                payerTokenBuyAccount: values.taker.tokenAccountB.address,
                lockup: lockupPda,
                counterparty: values.maker.keypair.publicKey,
                counterpartyTokenAccount: values.maker.tokenAccountB.address,
                tokenProgram: TOKEN_PROGRAM_ID,
                systemProgram: SystemProgram.programId,
            })
            .signers([values.taker.keypair])
            .rpc();

        /* logging
            for (const user of [values.maker, values.taker]) {
                let name = user === values.maker ? "maker" : "taker";
                let balanceA = await getTokenBalance(user.tokenAccountA);
                let balanceB = await getTokenBalance(user.tokenAccountB);
        
                console.log(`${name} token A balance after fill order:`, balanceA);
                console.log(`${name} token B balance after fill order:`, balanceB);
            }
        */
        let takerTokenBBalanceAfterOrder = await getTokenBalance(values.taker.tokenAccountB);
        expect(takerTokenBBalanceAfterOrder).to.equal(takerTokenBBalanceBeforeFill - price.toNumber());

        let takerTokenABalanceAfterOrder = await getTokenBalance(values.taker.tokenAccountA);
        expect(takerTokenABalanceAfterOrder).to.equal(takerTokenABalanceBeforeFill + amount.toNumber());

        let makerTokenBBalanceAfterOrder = await getTokenBalance(values.maker.tokenAccountB);
        expect(makerTokenBBalanceAfterOrder).to.equal(makerTokenBBalanceBeforeFill + price.toNumber());
    });
});