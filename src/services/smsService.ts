// SMS Service for real SMS verification
// Note: This is a production-ready structure that would integrate with services like Twilio, AWS SNS, etc.

export interface SMSResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface VerificationResponse {
  success: boolean;
  error?: string;
}

export class SMSService {
  private static readonly DEMO_MODE = true; // Set to false for production SMS

  // Send SMS verification code
  static async sendVerificationCode(phoneNumber: string): Promise<SMSResponse> {
    try {
      // Validate phone number format
      if (!this.isValidPhoneNumber(phoneNumber)) {
        return {
          success: false,
          error: 'Invalid phone number format'
        };
      }

      if (this.DEMO_MODE) {
        // Demo mode - simulate SMS sending
        console.log(`📱 Demo SMS sent to ${phoneNumber}: Your verification code is 1234`);
        
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 500));
        
        return {
          success: true,
          messageId: `demo_${Date.now()}`
        };
      }

      // Production SMS integration would go here
      // Example with Twilio:
      /*
      const client = twilio(accountSid, authToken);
      const message = await client.messages.create({
        body: `Your TableLoyalty verification code is: ${code}`,
        from: '+1234567890', // Your Twilio phone number
        to: phoneNumber
      });
      
      return {
        success: true,
        messageId: message.sid
      };
      */

      return {
        success: false,
        error: 'SMS service not configured for production'
      };
    } catch (error) {
      console.error('Error sending SMS:', error);
      return {
        success: false,
        error: 'Failed to send verification code'
      };
    }
  }

  // Verify SMS code
  static async verifyCode(phoneNumber: string, code: string): Promise<VerificationResponse> {
    try {
      if (this.DEMO_MODE) {
        // Demo mode - accept any 4-digit code for faster testing
        if (code.length === 4 && /^\d{4}$/.test(code)) {
          console.log(`✅ Demo verification successful for ${phoneNumber} with code ${code}`);
          
          // Simulate minimal verification delay
          await new Promise(resolve => setTimeout(resolve, 300));
          
          return { success: true };
        } else {
          return {
            success: false,
            error: 'Please enter a valid 4-digit code'
          };
        }
      }

      // Production verification would integrate with your SMS provider's verification API
      // Example with Twilio Verify:
      /*
      const verification = await client.verify.services(serviceSid)
        .verificationChecks
        .create({
          to: phoneNumber,
          code: code
        });
      
      return {
        success: verification.status === 'approved'
      };
      */

      return {
        success: false,
        error: 'Verification service not configured for production'
      };
    } catch (error) {
      console.error('Error verifying code:', error);
      return {
        success: false,
        error: 'Verification failed'
      };
    }
  }

  // Validate phone number format
  static isValidPhoneNumber(phoneNumber: string): boolean {
    // Remove all non-digit characters
    const cleaned = phoneNumber.replace(/\D/g, '');
    
    // Check for valid international format (10-15 digits)
    if (cleaned.length < 10 || cleaned.length > 15) {
      return false;
    }

    // Additional validation for specific country codes
    // For UAE numbers: should start with 971 and be 12 digits total
    if (cleaned.startsWith('971')) {
      return cleaned.length === 12;
    }

    // For US numbers: should be 10 or 11 digits (with or without country code)
    if (cleaned.startsWith('1') && cleaned.length === 11) {
      return true;
    }
    
    if (!cleaned.startsWith('1') && cleaned.length === 10) {
      return true;
    }

    // For other international numbers, basic length validation
    return cleaned.length >= 10 && cleaned.length <= 15;
  }

  // Format phone number for display
  static formatPhoneNumber(phoneNumber: string): string {
    const cleaned = phoneNumber.replace(/\D/g, '');
    
    // UAE format
    if (cleaned.startsWith('971')) {
      return `+971 ${cleaned.slice(3, 5)} ${cleaned.slice(5, 8)} ${cleaned.slice(8)}`;
    }
    
    // US format
    if (cleaned.length === 10) {
      return `+1 (${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    
    if (cleaned.length === 11 && cleaned.startsWith('1')) {
      return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
    }
    
    // Default international format
    return `+${cleaned}`;
  }

  // Detect country code from phone number
  static detectCountryCode(phoneNumber: string): string {
    const cleaned = phoneNumber.replace(/\D/g, '');
    
    if (cleaned.startsWith('971')) return 'AE'; // UAE
    if (cleaned.startsWith('1')) return 'US'; // US/Canada
    if (cleaned.startsWith('44')) return 'GB'; // UK
    if (cleaned.startsWith('33')) return 'FR'; // France
    if (cleaned.startsWith('49')) return 'DE'; // Germany
    if (cleaned.startsWith('91')) return 'IN'; // India
    if (cleaned.startsWith('86')) return 'CN'; // China
    if (cleaned.startsWith('81')) return 'JP'; // Japan
    if (cleaned.startsWith('82')) return 'KR'; // South Korea
    
    return 'UNKNOWN';
  }

  // Get country name from code
  static getCountryName(countryCode: string): string {
    const countries: { [key: string]: string } = {
      'AE': 'United Arab Emirates',
      'US': 'United States',
      'GB': 'United Kingdom',
      'FR': 'France',
      'DE': 'Germany',
      'IN': 'India',
      'CN': 'China',
      'JP': 'Japan',
      'KR': 'South Korea'
    };
    
    return countries[countryCode] || 'Unknown';
  }
}