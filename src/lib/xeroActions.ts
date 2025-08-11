
// "use server";

// import { getXeroClient } from './xero';
// import { Contact, Invoice, LineItem } from 'xero-node';
// import { auth } from '@clerk/nextjs/server';

// export const createXeroContact = async (studentData: {
//   name: string;
//   surname: string;
//   email?: string;
//   phone?: string;
//   address: string;
// }) => {
//   try {
//     const { userId } = await auth();
//     const xero = await getXeroClient(userId || undefined);
    
//     const contact: Contact = {
//       name: `${studentData.name} ${studentData.surname}`,
//       emailAddress: studentData.email,
//       phones: studentData.phone ? [{
//         phoneType: 'DEFAULT',
//         phoneNumber: studentData.phone
//       }] : undefined,
//       addresses: [{
//         addressType: 'STREET',
//         addressLine1: studentData.address
//       }]
//     };

//     const response = await xero.accountingApi.createContacts('', { contacts: [contact] });
//     return response.body.contacts?.[0];
//   } catch (error) {
//     console.error('Error creating Xero contact:', error);
//     throw error;
//   }
// };

// export const createSchoolFeeInvoice = async (studentId: string, amount: number, description: string) => {
//   try {
//     const { userId } = await auth();
//     const xero = await getXeroClient(userId || undefined);
    
//     // Get student contact from Xero (you'll need to store Xero contact ID in your database)
//     const lineItems: LineItem[] = [{
//       description,
//       quantity: 1,
//       unitAmount: amount,
//       accountCode: '200', // Revenue account code
//     }];

//     const invoice: Invoice = {
//       type: 'ACCREC', // Accounts Receivable
//       contact: { contactID: studentId }, // This should be the Xero contact ID
//       date: new Date().toISOString().split('T')[0],
//       dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from now
//       lineItems,
//       status: 'AUTHORISED'
//     };

//     const response = await xero.accountingApi.createInvoices('', { invoices: [invoice] });
//     return response.body.invoices?.[0];
//   } catch (error) {
//     console.error('Error creating Xero invoice:', error);
//     throw error;
//   }
// };

// export const getXeroReports = async () => {
//   try {
//     const { userId } = await auth();
//     const xero = await getXeroClient(userId || undefined);
    
//     // Get Profit & Loss report
//     const profitLoss = await xero.accountingApi.getReportProfitAndLoss('');
    
//     // Get Balance Sheet
//     const balanceSheet = await xero.accountingApi.getReportBalanceSheet('');
    
//     return {
//       profitLoss: profitLoss.body,
//       balanceSheet: balanceSheet.body
//     };
//   } catch (error) {
//     console.error('Error fetching Xero reports:', error);
//     throw error;
//   }
// };
