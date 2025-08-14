import { XeroClient, TokenSet } from 'xero-node';
import prisma from './prisma';

// This custom interface represents the PLAIN OBJECT we will use.
// It matches the data structure of the TokenSet interface.
interface TokenSetData {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  token_type: 'Bearer';
  scope: string;
  tenant_id?: string;
}

const xero = new XeroClient({
  clientId: process.env.XERO_CLIENT_ID!,
  clientSecret: process.env.XERO_CLIENT_SECRET!,
  redirectUris: [process.env.XERO_REDIRECT_URI!],
  scopes: 'accounting.transactions accounting.contacts accounting.settings offline_access'.split(' '),
});

export default xero;

export const storeTokens = async (userId: string, tokenSet: TokenSet) => {
  // The connections array is the reliable source for the tenant ID.
  const tenantId = (tokenSet as any).connections?.[0]?.tenantId;

  if (!tokenSet.access_token || !tokenSet.refresh_token || !tokenSet.expires_at || !tenantId) {
    throw new Error("Invalid token set from Xero. Missing essential fields.");
  }

  await prisma.xeroTokens.upsert({
    where: { userId: userId },
    create: {
      userId: userId,
      accessToken: tokenSet.access_token,
      refreshToken: tokenSet.refresh_token,
      expiresAt: new Date(tokenSet.expires_at * 1000),
      tenantId: tenantId,
    },
    update: {
      accessToken: tokenSet.access_token,
      refreshToken: tokenSet.refresh_token,
      expiresAt: new Date(tokenSet.expires_at * 1000),
      tenantId: tenantId,
      updatedAt: new Date(),
    },
  });
};

// --- CORRECTED FUNCTION ---
export const getStoredTokens = async (userId: string): Promise<TokenSetData | null> => {
  const tokenRecord = await prisma.xeroTokens.findUnique({
    where: { userId: userId },
  });

  if (!tokenRecord) return null;

  // Create a PLAIN JavaScript object that matches our TokenSetData interface.
  // We are no longer calling `new TokenSet()`.
  const tokenSetData: TokenSetData = {
    access_token: tokenRecord.accessToken,
    refresh_token: tokenRecord.refreshToken,
    expires_at: Math.floor(tokenRecord.expiresAt.getTime() / 1000),
    token_type: 'Bearer',
    scope: 'accounting.transactions accounting.contacts accounting.settings offline_access',
    tenant_id: tokenRecord.tenantId,
  };

  return tokenSetData;
};

// --- CORRECTED FUNCTION ---
export const getXeroClient = async (userId: string) => {
  let tokenData = await getStoredTokens(userId);

  if (!tokenData) {
    throw new Error('No Xero tokens found. Please authenticate first.');
  }

  // 1. Manually check if the token is expired. This avoids using the .expired() method.
  const isExpired = tokenData.expires_at - Math.floor(Date.now() / 1000) < 300; // 5 minute buffer

  if (isExpired) {
    console.log('Xero token is expiring soon, refreshing...');
    try {
      // 2. Set the token set first, then call refreshToken with no arguments.
      await xero.setTokenSet(tokenData as TokenSet);
      const newTokenSet = await xero.refreshToken();
      
      // 3. Save the newly acquired tokens.
      await storeTokens(userId, newTokenSet);
      
      // 4. Update our local variable with the new, full token set.
      const tenantId = (newTokenSet as any).connections?.[0]?.tenantId;
      
      if (!newTokenSet.access_token || !newTokenSet.refresh_token || !newTokenSet.expires_at) {
        throw new Error("Refreshed token set is missing required fields");
      }
      
      tokenData = {
        access_token: newTokenSet.access_token,
        refresh_token: newTokenSet.refresh_token,
        expires_at: newTokenSet.expires_at,
        token_type: 'Bearer',
        scope: newTokenSet.scope || 'accounting.transactions accounting.contacts accounting.settings offline_access',
        tenant_id: tenantId,
      };

    } catch (err) {
      console.error("Failed to refresh Xero token", err);
      throw new Error("Could not refresh Xero token. Please try re-authenticating.");
    }
  }
  
  // 5. Apply the valid token set to the client instance.
  await xero.setTokenSet(tokenData as TokenSet);
  
  // 6. Ensure we have a tenant ID for API calls.
  if (!tokenData.tenant_id) {
    throw new Error("Could not determine active tenant ID.");
  }

  return xero;
};