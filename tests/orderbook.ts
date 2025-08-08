import * as anchor from "@coral-xyz/anchor";
import { BN, Program } from "@coral-xyz/anchor";
import { Orderbook } from "../target/types/orderbook";
import { TOKEN_PROGRAM_ID, createMint, getOrCreateAssociatedTokenAccount } from "@solana/spl-token";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { mintTo } from "@solana/spl-token";
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
      .rpc();

    // Fetch and check the market account
    const market = await program.account.market.fetch(marketPda);
    expect(market.tokenA.toBase58()).to.equal(mintA.toBase58());
    expect(market.tokenB.toBase58()).to.equal(mintB.toBase58());
    expect(market.orders.toNumber()).to.equal(0);
    expect(market.bump).to.equal(marketBump);
  });

  it("Creates a new order", async () => {
    const price = new BN(1000);
    const side = { bid: {} };
    const amount = new BN(10);

    const market = await program.account.market.fetch(marketPda);
    const orderIndex = market.orders.toNumber();

    const [orderPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("order"),
        marketPda.toBuffer(),
        new BN(market.orders).toArrayLike(Buffer, "le", 8),
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

    const userTokenAccount = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      provider.wallet.payer,
      mintA, // tokenSell for Bid
      provider.wallet.publicKey
    );
    await mintTo(
      provider.connection,
      provider.wallet.payer,
      mintA,
      userTokenAccount.address,
      provider.wallet.publicKey,
      1000
    );

    const userTokenAccountBalance = (await provider.connection.getTokenAccountBalance(userTokenAccount.address)).value.amount;
    console.log("User token account balance:", userTokenAccountBalance);

    await program.methods.createOrder(price, side, amount)
    .accounts({
      payer: provider.wallet.publicKey,
      market: marketPda,
      tokenSell: mintA,
      tokenBuy: mintB,
      order: orderPda,
      userTokenAccount: userTokenAccount.address,
      lockup: lockupPda,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .signers([provider.wallet.payer])
    .rpc();

    const order = await program.account.order.fetch(orderPda);
    expect(order.index.toNumber()).to.equal(orderIndex);
    expect(order.side.bid).to.deep.equal({});
    expect(order.user.toBase58()).to.equal(provider.wallet.publicKey.toBase58());
    expect(order.price.toNumber()).to.equal(1000);
    expect(order.amount.toNumber()).to.equal(10);

    const lockupBalance = (await provider.connection.getTokenAccountBalance(lockupPda)).value.amount;
    console.log("Lockup token account balance:", lockupBalance);
    expect(lockupBalance).to.equal("10");
  });

  it("Is initialized!", async () => {
    // Add your test here.
    const tx = await program.methods.initialize().rpc();
    console.log("Your transaction signature", tx);
  });
});
