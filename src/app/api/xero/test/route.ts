import { NextRequest, NextResponse } from 'next/server';
import xero from '@/lib/xero';

// Test route to check Xero configuration
export async function GET() {
  try {
    console.log("Testing Xero configuration...");
    
    // Test getting auth URL
    const consentUrl = await xero.buildConsentUrl();
    
    return NextResponse.json({ 
      success: true, 
      message: "Xero client initialized successfully",
      consentUrl: consentUrl.substring(0, 50) + "..." // Partial URL for security
    });
    
  } catch (error: any) {
    console.error('Xero test error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message,
        stack: error.stack 
      },
      { status: 500 }
    );
  }
}