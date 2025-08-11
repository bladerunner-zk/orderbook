import BN from 'bn.js';
import { Connection, Keypair, PublicKey, SystemProgram } from "@solana/web3.js";
import { type Account, TOKEN_PROGRAM_ID, createMint, getOrCreateAssociatedTokenAccount } from "@solana/spl-token";
import { type Provider, type Program, web3 } from "@coral-xyz/anchor";
import { mintTo } from "@solana/spl-token";

export interface TestValues {
    mintA: PublicKey;
    mintB: PublicKey;
    marketPda: PublicKey;
    marketBump: number;
    maker: User;
    taker: User;
}

export interface User {
    keypair: Keypair;
    tokenAccountA: Account;
    tokenAccountB: Account;
}

const createNewUserAccount = async (connection, wallet, mintA, mintB): Promise<User> => {
    const keypair = Keypair.generate();
    const tokenAccountA = await getOrCreateAssociatedTokenAccount(
        connection,
        wallet.payer,
        mintA,
        keypair.publicKey
    );
    const tokenAccountB = await getOrCreateAssociatedTokenAccount(
        connection,
        wallet.payer,
        mintB,
        keypair.publicKey
    );
    await connection.requestAirdrop(keypair.publicKey, 2 * web3.LAMPORTS_PER_SOL);

    for (const [mint, tokenAccount] of [
        [mintA, tokenAccountA],
        [mintB, tokenAccountB]
    ]) {
        await mintTo(
            connection,
            wallet.payer,
            mint,
            tokenAccount.address,
            wallet.publicKey,
            1000
        );
    }

    return {
        keypair,
        tokenAccountA,
        tokenAccountB
    };
};


export const createTestValues = async (
    provider: Provider,
    program: Program<any>
) : Promise<TestValues> => {
    let connection = provider.connection;
    let wallet = provider.wallet;

    const mintA = await createMint(
        connection, 
        wallet.payer, 
        wallet.publicKey,
        null,
        6
    );

    const mintB = await createMint(
        connection,
        wallet.payer,
        wallet.publicKey,
        null,
        6
    );

    const maker = await createNewUserAccount(connection, wallet, mintA, mintB);
    const taker = await createNewUserAccount(connection, wallet, mintA, mintB);

    const [marketPda, marketBump] = PublicKey.findProgramAddressSync(
        [
            Buffer.from("market"),
            mintA.toBuffer(),
            mintB.toBuffer(),
        ],
        program.programId
    );

    return {
        mintA,
        mintB,
        marketPda,
        marketBump,
        maker,
        taker
    }
};