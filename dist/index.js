import { PublicKey } from '@solana/web3.js';
import fetch from 'node-fetch';
import pLimit from 'p-limit';
import { connection, TOKEN_PROGRAM_ID, RAYDIUM_API_URL } from './config.js'; // Add .js extension
const limit = pLimit(5); // Adjust the concurrency limit as needed
async function fetchRaydiumPairs() {
    const response = await fetch(RAYDIUM_API_URL);
    const pairs = await response.json();
    if (!Array.isArray(pairs)) {
        throw new Error('Invalid response from Raydium API');
    }
    return pairs;
}
async function getTokenAccountsByOwner(owner) {
    const tokenAccounts = await connection.getTokenAccountsByOwner(new PublicKey(owner), {
        programId: TOKEN_PROGRAM_ID,
    });
    return tokenAccounts.value.map((account) => account.pubkey.toString());
}
async function getTokenSupply(tokenMintAddress) {
    const supply = await connection.getTokenSupply(new PublicKey(tokenMintAddress));
    return supply.value.uiAmount || 0;
}
async function getTokenInfo(tokenAddress) {
    const tokenInfo = await connection.getParsedAccountInfo(new PublicKey(tokenAddress));
    if (tokenInfo.value === null)
        return null;
    if ('parsed' in tokenInfo.value.data) {
        return tokenInfo.value.data.parsed;
    }
    return null;
}
async function isBurnedOrLocked(tokenAddress) {
    const tokenInfo = await getTokenInfo(tokenAddress);
    if (!tokenInfo)
        return false;
    const owner = tokenInfo.info.owner;
    const BURN_ADDRESSES = [
        '11111111111111111111111111111111',
        // Add more known burn addresses here
    ];
    return BURN_ADDRESSES.includes(owner);
}
async function getOwnershipDetails(tokenAddress) {
    const tokenInfo = await getTokenInfo(tokenAddress);
    if (!tokenInfo)
        return null;
    return {
        owner: tokenInfo.info.owner,
        mintAuthority: tokenInfo.info.mintAuthority,
        freezeAuthority: tokenInfo.info.freezeAuthority,
        isMutable: tokenInfo.info.isMutable,
    };
}
async function notifyLPBurn(tokenAddress, amount) {
    console.log(`LP tokens burned: ${amount} for token: ${tokenAddress}`);
}
async function main() {
    const pairs = await fetchRaydiumPairs();
    const tasks = pairs.map(pair => limit(async () => {
        const tokenAccounts = await getTokenAccountsByOwner(pair.lpMint);
        for (const account of tokenAccounts) {
            const tokenInfo = await getTokenInfo(account);
            if (!tokenInfo)
                continue;
            const supply = await getTokenSupply(account);
            const burnedOrLocked = await isBurnedOrLocked(account);
            const ownershipDetails = await getOwnershipDetails(account);
            console.log(`Pair: ${pair.name}`);
            console.log(`Token Address: ${account}`);
            console.log(`Supply: ${supply}`);
            console.log(`Burned or Locked: ${burnedOrLocked}`);
            console.log(`Ownership Details:`, ownershipDetails);
            // Example: Check if LP tokens have been burned and notify
            const previousSupply = 0; // Retrieve this from storage or state
            if (supply < previousSupply) {
                const burnedAmount = previousSupply - supply;
                await notifyLPBurn(account, burnedAmount);
            }
            // Update the previous supply in storage or state
        }
    }));
    await Promise.all(tasks);
}
main().catch(console.error);
