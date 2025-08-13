// 1. IMPORT the correct class: XeroClient
import { XeroClient, XeroAccessToken, TokenSet } from 'xero-node';
import prisma from './prisma';

// 2. INSTANTIATE the correct class
const xero = new XeroClient({
  clientId: process.env.XERO_CLIENT_ID!,
  clientSecret: process.env.XERO_CLIENT_SECRET!,
  redirectUris: [process.env.XERO_REDIRECT_URI!],
  scopes: 'accounting.transactions accounting.contacts accounting.settings offline_access'.split(' '), // Added offline_access for refresh tokens
});

export default xero;

// The rest of your functions are correct and do not need to change,
// but I am including them here for completeness.

// Store tokens using Prisma's upsert for safety
export const storeTokens = async (userId: string, tokenSet: TokenSet) => {
  if (!tokenSet.access_token || !tokenSet.refresh_token || !tokenSet.expires_at || !tokenSet.tenant_id || typeof tokenSet.tenant_id !== 'string') {
    throw new Error("Invalid token set received from Xero.");
  }

  await prisma.xeroTokens.upsert({
    where: { userId: userId },
    create: {
      userId: userId,
      accessToken: tokenSet.access_token,
      refreshToken: tokenSet.refresh_token,
      expiresAt: new Date(tokenSet.expires_at * 1000),
      tenantId: tokenSet.tenant_id,
    },
    update: {
      accessToken: tokenSet.access_token,
      refreshToken: tokenSet.refresh_token,
      expiresAt: new Date(tokenSet.expires_at * 1000),
      tenantId: tokenSet.tenant_id,
      updatedAt: new Date(),
    },
  });
};

// Retrieve tokens using Prisma's findUnique
export const getStoredTokens = async (userId: string): Promise<TokenSet | null> => {
  const tokenRecord = await prisma.xeroTokens.findUnique({
    where: { userId: userId },
  });

  if (!tokenRecord) return null;

  return {
    access_token: tokenRecord.accessToken,
    refresh_token: tokenRecord.refreshToken,
    expires_at: Math.floor(tokenRecord.expiresAt.getTime() / 1000),
    token_type: 'Bearer',
    scope: 'accounting.transactions accounting.contacts accounting.settings offline_access',
    tenant_id: tokenRecord.tenantId,
    expired: () => false,
    claims: () => ({
      aud: '',
      exp: 0,
      iat: 0,
      iss: '',
      sub: ''
    }),
  };
};

// Main function to get a ready-to-use Xero client
export const getXeroClient = async (userId: string) => {
  let tokenSet = await getStoredTokens(userId);

  if (!tokenSet) {
    throw new Error('No Xero tokens found. Please authenticate first.');
  }

  // Check if token is expired (within 5 minutes)
  const isExpired = tokenSet.expires_at! - Math.floor(Date.now() / 1000) < 300;

  if (isExpired) {
    console.log('Xero token expired, refreshing...');
    await xero.setTokenSet(tokenSet);
    tokenSet = (await xero.refreshToken()) as TokenSet;
    await storeTokens(userId, tokenSet);
  }
  
  await xero.setTokenSet(tokenSet);
  return xero;
};