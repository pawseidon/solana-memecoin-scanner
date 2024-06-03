import { clusterApiUrl, Connection, PublicKey } from '@solana/web3.js';
export const RPC_URL = clusterApiUrl('mainnet-beta');
export const connection = new Connection(RPC_URL);
export const TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
export const RAYDIUM_API_URL = 'https://api.raydium.io/v2/main/pairs';
