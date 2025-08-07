import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Orderbook } from "../target/types/orderbook";
import { TOKEN_PROGRAM_ID, createMint } from "@solana/spl-token";
import { PublicKey, SystemProgram } from "@solana/web3.js";

import { expect } from "chai";

describe("orderbook", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());
  const program = anchor.workspace.orderbook as Program<Orderbook>;
  const provider = anchor.getProvider();

  let mintA: PublicKey;
  let mintB: PublicKey;
  let marketPda: PublicKey;
  let marketBump: number;

  before(async () => {
    // Create two test mints
    mintA = await createMint(
      provider.connection,
      provider.wallet.payer,
      provider.wallet.publicKey,
      null,
      6
    );
    mintB = await createMint(
      provider.connection,
      provider.wallet.payer,
      provider.wallet.publicKey,
      null,
      6
    );

    // Derive market PDA
    [marketPda, marketBump] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("market"),
        mintA.toBuffer(),
        mintB.toBuffer(),
      ],
      program.programId
    );
  });

  it("Initializes a market", async () => {
    await program.methods
      .initializeMarket()
      .accounts({
        payer: provider.wallet.publicKey,
        market: marketPda,
        tokenA: mintA,
        tokenB: mintB,
        systemProgram: SystemProgram.programId,
      })
      .signers([])
      .rpc();

    // Fetch and check the market account
    const market = await program.account.market.fetch(marketPda);
    expect(market.tokenA.toBase58()).to.equal(mintA.toBase58());
    expect(market.tokenB.toBase58()).to.equal(mintB.toBase58());
    expect(market.orders.toNumber()).to.equal(0);
    expect(market.bump).to.equal(marketBump);
  });

  it("Is initialized!", async () => {
    // Add your test here.
    const tx = await program.methods.initialize().rpc();
    console.log("Your transaction signature", tx);
  });
});
