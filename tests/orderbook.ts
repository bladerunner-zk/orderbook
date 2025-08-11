import * as anchor from "@coral-xyz/anchor";
import { BN, Program } from "@coral-xyz/anchor";
import { Orderbook } from "../target/types/orderbook";
import { TOKEN_PROGRAM_ID, createMint, getOrCreateAssociatedTokenAccount } from "@solana/spl-token";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { mintTo } from "@solana/spl-token";
import { expect } from "chai";

import { createTestValues, type TestValues, type User, } from './utils' 

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
        await program.methods
        .initializeMarket()
        .accounts({
            payer: provider.wallet.publicKey,
            market: values.marketPda,
            tokenA: values.mintA,
            tokenB: values.mintB,
            systemProgram: SystemProgram.programId,
        })
        .rpc();

        // Fetch and check the market account
        const market = await program.account.market.fetch(values.marketPda);
        expect(market.tokenA.toBase58()).to.equal(values.mintA.toBase58());
        expect(market.tokenB.toBase58()).to.equal(values.mintB.toBase58());
        expect(market.orders.toNumber()).to.equal(0);
        expect(market.bump).to.equal(values.marketBump);
  });
});