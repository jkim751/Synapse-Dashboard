import { XeroClient, TokenSet } from 'xero-node';
import prisma from './prisma';

// This custom interface represents the PLAIN OBJECT we will use.
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
  const tenantId = (tokenSet as any).connections?.[0]?.tenantId;

  if (!tokenSet.access_token || !tokenSet.refresh_token || !tokenSet.expires_at || !tenantId) {
    console.error("Full token set from Xero:", tokenSet);
    throw new Error("Invalid token set from Xero. Missing essential fields.");
  }

  await prisma.xeroTokens.upsert({
    where: { userId },
    create: {
      userId,
      accessToken: tokenSet.access_token,
      refreshToken: tokenSet.refresh_token,
      expiresAt: new Date(tokenSet.expires_at * 1000),
      tenantId,
    },
    update: {
      accessToken: tokenSet.access_token,
      refreshToken: tokenSet.refresh_token,
      expiresAt: new Date(tokenSet.expires_at * 1000),
      tenantId,
      updatedAt: new Date(),
    },
  });
};

export const getStoredTokens = async (userId: string): Promise<TokenSetData | null> => {
  const tokenRecord = await prisma.xeroTokens.findUnique({
    where: { userId: userId },
  });

  if (!tokenRecord) return null;

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

// --- THIS IS THE CORRECTED FUNCTION ---
export const getXeroClient = async (userId: string) => {
  let tokenData = await getStoredTokens(userId);

  if (!tokenData) {
    throw new Error('No Xero tokens found. Please authenticate first.');
  }

  const isExpired = tokenData.expires_at - Math.floor(Date.now() / 1000) < 300;

  if (isExpired) {
    console.log('Xero token is expiring soon, refreshing...');
    try {
      await xero.setTokenSet(tokenData as TokenSet);
      const newTokenSet = await xero.refreshToken();
      await storeTokens(userId, newTokenSet);
      
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
  
  await xero.setTokenSet(tokenData as TokenSet);
  
  if (tokenData.tenant_id) {

    (xero as any).activeTenantId = tokenData.tenant_id;
  } else {
    const connections = await xero.updateTenants();
    const activeTenantId = connections?.[0]?.tenantId;
    if (activeTenantId) {
      (xero as any).activeTenantId = activeTenantId;
    } else {
      throw new Error("Could not determine active tenant ID. Please re-authenticate.");
    }
  }

  return xero;
};