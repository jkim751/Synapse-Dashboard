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

const SCOPES = [
  'accounting.transactions',
  'accounting.contacts',
  'accounting.settings',
  'accounting.reports.read',
  'payroll.employees',
  'payroll.payruns',
  'payroll.payslip',
  'payroll.timesheets',
  'payroll.settings',
  'offline_access',
].join(' ');

const xero = new XeroClient({
  clientId: process.env.XERO_CLIENT_ID!,
  clientSecret: process.env.XERO_CLIENT_SECRET!,
  redirectUris: [process.env.XERO_REDIRECT_URI!],
  scopes: SCOPES.split(' '),
});

export default xero;

export const buildConsentUrl = async () => xero.buildConsentUrl();

export const storeTokens = async (userId: string, tokenSet: TokenSet) => {
  if (!tokenSet.access_token || !tokenSet.refresh_token || !tokenSet.expires_at) {
    throw new Error('Invalid token set from Xero — missing required fields.');
  }

  let tenantId: string | undefined;

  if ((tokenSet as any).connections?.length) {
    tenantId = (tokenSet as any).connections[0]?.tenantId;
  }
  if (!tenantId && (tokenSet as any).tenant_id) {
    tenantId = (tokenSet as any).tenant_id;
  }
  if (!tenantId) {
    try {
      await xero.setTokenSet(tokenSet);
      const connections = await xero.updateTenants();
      tenantId = connections?.[0]?.tenantId;
    } catch (err) {
      console.error('Error resolving Xero tenant ID:', err);
    }
  }

  if (!tenantId) throw new Error('Could not determine Xero tenant ID.');

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

export const deleteTokens = async (userId: string) => {
  await prisma.xeroTokens.deleteMany({ where: { userId } });
};

export const getStoredTokens = async (userId: string): Promise<TokenSetData | null> => {
  const record = await prisma.xeroTokens.findUnique({ where: { userId } });
  if (!record) return null;
  return {
    access_token: record.accessToken,
    refresh_token: record.refreshToken,
    expires_at: Math.floor(record.expiresAt.getTime() / 1000),
    token_type: 'Bearer',
    scope: SCOPES,
    tenant_id: record.tenantId,
  };
};

// Get a client using a specific user's stored tokens.
// Reuses the module-level singleton. initialize() must be called explicitly on
// each cold-start invocation so the underlying OpenID client is ready before
// any token operation (refreshToken depends on the OIDC issuer discovery).
export async function getXeroClient(userId: string) {
  const tokenData = await getStoredTokens(userId);
  if (!tokenData) throw new Error('No Xero token found for user.');

  // Ensure the OIDC client is initialized (idempotent — safe to call every time)
  await xero.initialize();

  await xero.setTokenSet(tokenData);

  if (xero.readTokenSet().expired()) {
    const newTokenSet = await xero.refreshToken();
    await storeTokens(userId, newTokenSet);
  }

  await xero.updateTenants();
  return xero;
}

// Get a client using whichever admin has connected Xero — used by parent/teacher routes
export async function getAnyXeroClient() {
  const record = await prisma.xeroTokens.findFirst({
    orderBy: { updatedAt: 'desc' },
  });
  if (!record) throw new Error('Xero is not connected. An admin must connect Xero first.');
  return getXeroClient(record.userId);
}
