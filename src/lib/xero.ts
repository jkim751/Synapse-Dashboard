import { XeroClient, TokenSet } from 'xero-node';
import prisma from './prisma';

interface TokenSetData {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  token_type: 'Bearer';
  scope: string;
  tenant_id?: string;
  [key: string]: any;
}

// Debug environment variables
console.log("Xero Environment Check:", {
  hasClientId: !!process.env.XERO_CLIENT_ID,
  hasClientSecret: !!process.env.XERO_CLIENT_SECRET,
  hasRedirectUri: !!process.env.XERO_REDIRECT_URI,
  clientIdLength: process.env.XERO_CLIENT_ID?.length,
  redirectUri: process.env.XERO_REDIRECT_URI, // Safe to log redirect URI
});

// Validate environment variables
if (!process.env.XERO_CLIENT_ID) {
  throw new Error('XERO_CLIENT_ID is not set');
}
if (!process.env.XERO_CLIENT_SECRET) {
  throw new Error('XERO_CLIENT_SECRET is not set');
}
if (!process.env.XERO_REDIRECT_URI) {
  throw new Error('XERO_REDIRECT_URI is not set');
}

const xero = new XeroClient({
  clientId: process.env.XERO_CLIENT_ID,
  clientSecret: process.env.XERO_CLIENT_SECRET,
  redirectUris: [process.env.XERO_REDIRECT_URI],
scopes: 'accounting.transactions accounting.contacts accounting.settings accounting.reports.read offline_access'.split(' '),
});

console.log("Xero client initialized successfully");

export default xero;

export const storeTokens = async (userId: string, tokenSet: TokenSet) => {
  console.log("=== STORE TOKENS DEBUG ===");
  console.log("User ID:", userId);
  console.log("TokenSet received:", JSON.stringify(tokenSet, null, 2));
  console.log("TokenSet type:", typeof tokenSet);
  console.log("TokenSet constructor:", tokenSet.constructor.name);

  // Check basic token fields first
  if (!tokenSet.access_token || !tokenSet.refresh_token || !tokenSet.expires_at) {
    console.error("Missing basic token fields:", {
      access_token: {
        exists: !!tokenSet.access_token,
        type: typeof tokenSet.access_token,
        length: tokenSet.access_token?.length,
        value: tokenSet.access_token?.substring(0, 20) + '...'
      },
      refresh_token: {
        exists: !!tokenSet.refresh_token,
        type: typeof tokenSet.refresh_token,
        length: tokenSet.refresh_token?.length,
      },
      expires_at: {
        exists: !!tokenSet.expires_at,
        type: typeof tokenSet.expires_at,
        value: tokenSet.expires_at
      }
    });
    throw new Error("Invalid token set from Xero. Missing access_token, refresh_token, or expires_at.");
  }

  // Try different ways to get tenant ID
  let tenantId: string | undefined;

  // Method 1: Check connections array
  if ((tokenSet as any).connections && Array.isArray((tokenSet as any).connections)) {
    tenantId = (tokenSet as any).connections[0]?.tenantId;
    console.log("Tenant ID from connections:", tenantId);
  }

  // Method 2: Check if it's directly on tokenSet
  if (!tenantId && (tokenSet as any).tenant_id) {
    tenantId = (tokenSet as any).tenant_id;
    console.log("Tenant ID from tokenSet.tenant_id:", tenantId);
  }

  // Method 3: Try to get it from xero client after setting token
  if (!tenantId) {
    try {
      console.log("Attempting to get tenant ID from Xero client...");
      await xero.setTokenSet(tokenSet);
      const connections = await xero.updateTenants();
      console.log("Connections from updateTenants:", connections);
      tenantId = connections?.[0]?.tenantId;
      console.log("Tenant ID from updateTenants:", tenantId);
    } catch (err) {
      console.error("Error getting tenant from xero client:", err);
    }
  }

  if (!tenantId) {
    console.error("Could not determine tenant ID from any method");
    console.error("Full tokenSet for debugging:", tokenSet);
    throw new Error("Invalid token set from Xero. Missing tenant ID.");
  }

  console.log("Storing tokens with tenant ID:", tenantId);

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

  console.log("Tokens stored successfully for user:", userId);
  console.log("=== END STORE TOKENS DEBUG ===");
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

export async function getXeroClient(userId: string) {
  try {
    const tokenData = await getStoredTokens(userId);
    if (!tokenData) {
      throw new Error('No Xero token found for the user.');
    }

    const xero = new XeroClient({
      clientId: process.env.XERO_CLIENT_ID!,
      clientSecret: process.env.XERO_CLIENT_SECRET!,
      redirectUris: [process.env.XERO_REDIRECT_URI!],
    });

    xero.setTokenSet(tokenData);

    if (xero.readTokenSet().expired()) {
      console.log('Xero token is expiring soon, refreshing...');
      const newTokenSet = await xero.refreshToken();
      await storeTokens(userId, newTokenSet);
    }

    return xero;
  } catch (error: any) {
    console.error('Error initializing Xero client:', error);
    throw new Error('Failed to initialize Xero client. Please re-authenticate.');
  }
}