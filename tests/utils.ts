import BN from 'bn.js';
import { Connection, Keypair, PublicKey, SystemProgram } from "@solana/web3.js";
import { type Account, TOKEN_PROGRAM_ID, createMint, getOrCreateAssociatedTokenAccount } from "@solana/spl-token";
import { type Provider, type Program } from "@coral-xyz/anchor";

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

const createNewUserAccount = async (connection, payer, mintA, mintB): Promise<User> => {
    const keypair = Keypair.generate();
    const tokenAccountA = await getOrCreateAssociatedTokenAccount(
        connection,
        payer,
        mintA,
        keypair.publicKey
    );
    const tokenAccountB = await getOrCreateAssociatedTokenAccount(
        connection,
        payer,
        mintB,
        keypair.publicKey
    );
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

    const maker = await createNewUserAccount(connection, wallet.payer, mintA, mintB);
    const taker = await createNewUserAccount(connection, wallet.payer, mintA, mintB);

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