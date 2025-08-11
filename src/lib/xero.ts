// import { XeroApi, XeroAccessToken } from 'xero-node';
// import prisma from './prisma';

// const xero = new XeroApi({
//   clientId: process.env.XERO_CLIENT_ID!,
//   clientSecret: process.env.XERO_CLIENT_SECRET!,
//   redirectUris: [process.env.XERO_REDIRECT_URI || `${process.env.REPLIT_URL}/api/xero/auth`],
//   scopes: 'accounting.transactions accounting.contacts accounting.settings',
// });

// export default xero;

// // Store tokens in database
// export const storeTokens = async (tokenSet: XeroAccessToken, userId?: string) => {
//   try {
//     // You can store tokens per user or globally for the organization
//     await prisma.$executeRaw`
//       INSERT INTO xero_tokens (user_id, access_token, refresh_token, expires_at, created_at, updated_at)
//       VALUES (${userId || 'system'}, ${tokenSet.access_token}, ${tokenSet.refresh_token}, 
//               ${new Date(Date.now() + (tokenSet.expires_in || 1800) * 1000)}, ${new Date()}, ${new Date()})
//       ON CONFLICT (user_id) 
//       DO UPDATE SET 
//         access_token = ${tokenSet.access_token},
//         refresh_token = ${tokenSet.refresh_token},
//         expires_at = ${new Date(Date.now() + (tokenSet.expires_in || 1800) * 1000)},
//         updated_at = ${new Date()}
//     `;
//   } catch (error) {
//     console.error('Error storing tokens:', error);
//   }
// };

// // Retrieve tokens from database
// export const getStoredTokens = async (userId?: string): Promise<XeroAccessToken | null> => {
//   try {
//     const result = await prisma.$queryRaw<Array<{
//       access_token: string;
//       refresh_token: string;
//       expires_at: Date;
//     }>>`
//       SELECT access_token, refresh_token, expires_at 
//       FROM xero_tokens 
//       WHERE user_id = ${userId || 'system'}
//     `;

//     if (result.length === 0) return null;

//     const token = result[0];
//     return {
//       access_token: token.access_token,
//       refresh_token: token.refresh_token,
//       expires_in: Math.floor((token.expires_at.getTime() - Date.now()) / 1000),
//     };
//   } catch (error) {
//     console.error('Error retrieving tokens:', error);
//     return null;
//   }
// };

// // Check if token is expired and refresh if needed
// export const refreshTokenIfNeeded = async (tokenSet: XeroAccessToken): Promise<XeroAccessToken> => {
//   const expiresIn = tokenSet.expires_in || 0;
//   const isExpired = expiresIn <= 300; // Refresh if expires in 5 minutes or less

//   if (isExpired && tokenSet.refresh_token) {
//     try {
//       const newTokenSet = await xero.refreshToken();
//       await storeTokens(newTokenSet);
//       return newTokenSet;
//     } catch (error) {
//       console.error('Error refreshing token:', error);
//       throw new Error('Token refresh failed');
//     }
//   }

//   return tokenSet;
// };

// export const getXeroClient = async (userId?: string) => {
//   try {
//     let tokenSet = await getStoredTokens(userId);
    
//     if (!tokenSet) {
//       throw new Error('No Xero tokens found. Please authenticate first.');
//     }

//     // Refresh token if needed
//     tokenSet = await refreshTokenIfNeeded(tokenSet);
    
//     await xero.setTokenSet(tokenSet);
//     return xero;
//   } catch (error) {
//     console.error('Error getting Xero client:', error);
//     throw error;
//   }
// };
