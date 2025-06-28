import React, { useState, useEffect } from 'react';
import { 
  ChefHat, Phone, User, CheckCircle2, ArrowRight, 
  Gift, Crown, Sparkles, Timer,
  Loader2, TrendingUp, Award, Heart, Utensils,
  Coffee, CreditCard, MapPin, Clock, Zap, AlertCircle,
  LogIn, Building
} from 'lucide-react';
import { CustomerService } from '../services/customerService';
import { SMSService } from '../services/smsService';

interface OnboardingProps {
  onComplete: (userData: any) => void;
  restaurantId?: string; // Add restaurant ID prop for QR code linking
}

interface FormData {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  birthDate: string;
  acceptTerms: boolean;
}

interface VerificationData {
  code: string;
  isVerifying: boolean;
  error: string;
  phoneNumber: string;
  messageId?: string;
}

interface LoginData {
  emailOrPhone: string;
  error: string;
}

interface RestaurantInfo {
  id: string;
  name: string;
  logo_url?: string;
}

const OnboardingFlow: React.FC<OnboardingProps> = ({ onComplete, restaurantId }) => {
  const [currentStep, setCurrentStep] = useState<'welcome' | 'signup' | 'login' | 'verify' | 'complete'>('welcome');
  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    birthDate: '',
    acceptTerms: false
  });
  const [verification, setVerification] = useState<VerificationData>({
    code: '',
    isVerifying: false,
    error: '',
    phoneNumber: ''
  });
  const [loginData, setLoginData] = useState<LoginData>({
    emailOrPhone: '',
    error: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [existingCustomer, setExistingCustomer] = useState<any>(null);
  const [restaurantInfo, setRestaurantInfo] = useState<RestaurantInfo | null>(null);

  // Fetch restaurant info if restaurantId is provided
  useEffect(() => {
    if (restaurantId) {
      fetchRestaurantInfo();
    }
  }, [restaurantId]);

  const fetchRestaurantInfo = async () => {
    try {
      const info = await CustomerService.getRestaurantInfo(restaurantId!);
      setRestaurantInfo(info);
    } catch (error) {
      console.error('Error fetching restaurant info:', error);
    }
  };

  const handleInputChange = (field: keyof FormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Auto-format phone number
    if (field === 'phone' && typeof value === 'string') {
      const formatted = formatPhoneInput(value);
      if (formatted !== value) {
        setFormData(prev => ({ ...prev, phone: formatted }));
      }
    }
  };

  const formatPhoneInput = (value: string): string => {
    // Remove all non-digit characters
    const cleaned = value.replace(/\D/g, '');
    
    // Limit to 15 digits (international standard)
    const limited = cleaned.slice(0, 15);
    
    // Auto-detect and format based on country
    if (limited.startsWith('971')) {
      // UAE format: +971 50 123 4567
      if (limited.length <= 3) return `+${limited}`;
      if (limited.length <= 5) return `+${limited.slice(0, 3)} ${limited.slice(3)}`;
      if (limited.length <= 8) return `+${limited.slice(0, 3)} ${limited.slice(3, 5)} ${limited.slice(5)}`;
      return `+${limited.slice(0, 3)} ${limited.slice(3, 5)} ${limited.slice(5, 8)} ${limited.slice(8)}`;
    }
    
    if (limited.startsWith('1') && limited.length > 1) {
      // US format: +1 (555) 123-4567
      if (limited.length <= 1) return `+${limited}`;
      if (limited.length <= 4) return `+${limited.slice(0, 1)} (${limited.slice(1)}`;
      if (limited.length <= 7) return `+${limited.slice(0, 1)} (${limited.slice(1, 4)}) ${limited.slice(4)}`;
      return `+${limited.slice(0, 1)} (${limited.slice(1, 4)}) ${limited.slice(4, 7)}-${limited.slice(7)}`;
    }
    
    // Default international format
    if (limited.length > 0) {
      return `+${limited}`;
    }
    
    return value;
  };

  const validatePhoneNumber = (phone: string): boolean => {
    return SMSService.isValidPhoneNumber(phone);
  };

  const handleLogin = async () => {
    setIsLoading(true);
    setLoginData(prev => ({ ...prev, error: '' }));
    
    try {
      const customer = await CustomerService.findCustomerForLogin(
        loginData.emailOrPhone, 
        restaurantId
      );
      
      if (customer) {
        // Customer found, complete login
        onComplete({
          name: `${customer.first_name} ${customer.last_name}`,
          email: customer.email,
          phone: customer.phone,
          birthDate: customer.date_of_birth,
          customerId: customer.id,
          restaurantId: customer.restaurant_id
        });
      } else {
        setLoginData(prev => ({ 
          ...prev, 
          error: restaurantId 
            ? 'No account found with this email or phone number at this restaurant. Please sign up instead.'
            : 'No account found with this email or phone number. Please sign up instead.'
        }));
      }
    } catch (error: any) {
      console.error('Error during login:', error);
      setLoginData(prev => ({ 
        ...prev, 
        error: error.message || 'Login failed. Please try again.' 
      }));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async () => {
    setIsLoading(true);
    setExistingCustomer(null);
    setVerification(prev => ({ ...prev, error: '' }));
    
    try {
      // Validate phone number
      if (!validatePhoneNumber(formData.phone)) {
        setVerification(prev => ({ 
          ...prev, 
          error: 'Please enter a valid phone number (10-15 digits)' 
        }));
        setIsLoading(false);
        return;
      }

      // Check if customer already exists (with restaurant context if provided)
      const existing = await CustomerService.checkCustomerExists(
        formData.email, 
        formData.phone,
        restaurantId
      );
      
      if (existing) {
        setExistingCustomer(existing);
        setIsLoading(false);
        return;
      }
      
      // Send SMS verification
      const smsResult = await SMSService.sendVerificationCode(formData.phone);
      
      if (!smsResult.success) {
        setVerification(prev => ({ 
          ...prev, 
          error: smsResult.error || 'Failed to send verification code' 
        }));
        setIsLoading(false);
        return;
      }
      
      setVerification(prev => ({ 
        ...prev, 
        phoneNumber: formData.phone,
        messageId: smsResult.messageId,
        error: '' 
      }));
      setCurrentStep('verify');
    } catch (error: any) {
      console.error('Error during signup:', error);
      setVerification(prev => ({ 
        ...prev, 
        error: error.message || 'Failed to send verification code' 
      }));
    } finally {
      setIsLoading(false);
    }
  };

  const handleExistingCustomerLogin = () => {
    if (existingCustomer) {
      onComplete({
        name: `${existingCustomer.first_name} ${existingCustomer.last_name}`,
        email: existingCustomer.email,
        phone: existingCustomer.phone,
        birthDate: existingCustomer.date_of_birth,
        customerId: existingCustomer.id,
        restaurantId: existingCustomer.restaurant_id
      });
    }
  };

  const handleVerification = async () => {
    if (verification.code.length !== 4) {
      setVerification(prev => ({ 
        ...prev, 
        error: 'Please enter a 4-digit verification code' 
      }));
      return;
    }

    setVerification(prev => ({ ...prev, isVerifying: true, error: '' }));
    
    try {
      // Verify SMS code
      const verifyResult = await SMSService.verifyCode(verification.phoneNumber, verification.code);
      
      if (!verifyResult.success) {
        setVerification(prev => ({ 
          ...prev, 
          isVerifying: false, 
          error: verifyResult.error || 'Invalid verification code. Please try again.' 
        }));
        return;
      }
      
      // Verification successful - complete onboarding
      onComplete({
        name: `${formData.firstName} ${formData.lastName}`,
        email: formData.email,
        phone: formData.phone,
        birthDate: formData.birthDate,
        restaurantId: restaurantId // Pass restaurant ID for customer creation
      });
    } catch (error: any) {
      console.error('Error during verification:', error);
      setVerification(prev => ({ 
        ...prev, 
        isVerifying: false, 
        error: 'Verification failed. Please try again.' 
      }));
    }
  };

  const renderWelcomeStep = () => (
    <div className="min-h-screen bg-gray-50 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#1E2A78]/5 via-transparent to-[#3B4B9A]/5"></div>
      <div className="absolute top-0 right-0 w-96 h-96 bg-[#1E2A78]/5 rounded-full -translate-y-48 translate-x-48"></div>
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#3B4B9A]/5 rounded-full translate-y-32 -translate-x-32"></div>
      
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header */}
        <div className="flex-1 flex flex-col justify-center px-6 py-12">
          <div className="max-w-sm mx-auto text-center">
            {/* Restaurant branding if available */}
            {restaurantInfo ? (
              <div className="mb-8">
                <div className="w-20 h-20 mx-auto bg-gradient-to-br from-[#1E2A78] to-[#3B4B9A] rounded-3xl flex items-center justify-center mb-4 shadow-2xl">
                  {restaurantInfo.logo_url ? (
                    <img 
                      src={restaurantInfo.logo_url} 
                      alt={restaurantInfo.name}
                      className="w-12 h-12 rounded-2xl object-cover"
                    />
                  ) : (
                    <Building className="h-10 w-10 text-white" />
                  )}
                </div>
                <h1 className="text-2xl font-light text-gray-900 mb-2 tracking-tight">
                  {restaurantInfo.name}
                </h1>
                <p className="text-gray-600 text-lg mb-4">
                  Loyalty Program
                </p>
              </div>
            ) : (
              <div className="mb-8">
                <div className="w-20 h-20 mx-auto bg-gradient-to-br from-[#1E2A78] to-[#3B4B9A] rounded-3xl flex items-center justify-center mb-8 shadow-2xl">
                  <ChefHat className="h-10 w-10 text-white" />
                </div>
                <h1 className="text-4xl font-light text-gray-900 mb-4 tracking-tight">
                  TableLoyalty
                </h1>
              </div>
            )}
            
            <p className="text-gray-600 text-xl leading-relaxed mb-12">
              Turn every meal into rewards
            </p>

            {/* Benefit Cards */}
            <div className="space-y-4 mb-12">
              {/* Earn Points */}
              <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-lg">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-[#1E2A78] to-[#3B4B9A] rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg">
                    <Zap className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1 text-left">
                    <h3 className="font-semibold text-gray-900 text-lg mb-1">Earn Instantly</h3>
                    <p className="text-gray-600 text-sm leading-relaxed">
                      Get 1 point for every dollar spent automatically
                    </p>
                  </div>
                </div>
              </div>

              {/* Redeem Rewards */}
              <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-lg">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg">
                    <Gift className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1 text-left">
                    <h3 className="font-semibold text-gray-900 text-lg mb-1">Free Rewards</h3>
                    <p className="text-gray-600 text-sm leading-relaxed">
                      Redeem points for free meals and exclusive treats
                    </p>
                  </div>
                </div>
              </div>

              {/* VIP Status */}
              <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-lg">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-amber-500 to-amber-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg">
                    <Crown className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1 text-left">
                    <h3 className="font-semibold text-gray-900 text-lg mb-1">VIP Benefits</h3>
                    <p className="text-gray-600 text-sm leading-relaxed">
                      Unlock priority seating and exclusive menu access
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="space-y-3 mb-6">
              <button
                onClick={() => setCurrentStep('signup')}
                className="w-full py-4 bg-gradient-to-r from-[#1E2A78] to-[#3B4B9A] text-white rounded-2xl font-semibold text-lg shadow-2xl hover:shadow-3xl transition-all duration-300 transform hover:scale-[1.02] flex items-center justify-center gap-3"
              >
                Get Started
                <ArrowRight className="h-5 w-5" />
              </button>
              
              <button
                onClick={() => setCurrentStep('login')}
                className="w-full py-4 bg-white text-[#1E2A78] border-2 border-[#1E2A78] rounded-2xl font-semibold text-lg hover:bg-[#1E2A78] hover:text-white transition-all duration-300 flex items-center justify-center gap-3"
              >
                <LogIn className="h-5 w-5" />
                Already have an account?
              </button>
            </div>
            
            <p className="text-center text-sm text-gray-500">
              {restaurantInfo ? `Join ${restaurantInfo.name}'s loyalty program` : 'Join thousands earning rewards daily'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderLoginStep = () => (
    <div className="min-h-screen bg-gray-50 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-[#1E2A78]/5 via-transparent to-[#3B4B9A]/5"></div>
      
      <div className="relative z-10 min-h-screen flex flex-col justify-center px-6 py-8">
        <div className="max-w-sm mx-auto w-full">
          
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto bg-gradient-to-br from-[#1E2A78] to-[#3B4B9A] rounded-2xl flex items-center justify-center mb-6 shadow-xl">
              <LogIn className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-3xl font-light text-gray-900 mb-2">Welcome Back</h2>
            <p className="text-gray-600 text-base">
              {restaurantInfo ? `Sign in to ${restaurantInfo.name}` : 'Enter your email or phone number'}
            </p>
          </div>

          {/* Form */}
          <div className="bg-white rounded-3xl border border-gray-200 p-6 shadow-lg">
            <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); handleLogin(); }}>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email or Phone</label>
                <input
                  type="text"
                  value={loginData.emailOrPhone}
                  onChange={(e) => setLoginData(prev => ({ ...prev, emailOrPhone: e.target.value, error: '' }))}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-[#1E2A78] focus:border-transparent transition-all duration-200"
                  placeholder="Enter email or phone number"
                  required
                />
              </div>

              {loginData.error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>{loginData.error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={!loginData.emailOrPhone.trim() || isLoading}
                className="w-full py-4 bg-gradient-to-r from-[#1E2A78] to-[#3B4B9A] text-white rounded-xl font-semibold hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Checking...
                  </>
                ) : (
                  <>
                    Continue
                    <ArrowRight className="h-5 w-5" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 text-center">
              <button
                onClick={() => {
                  setCurrentStep('welcome');
                  setLoginData({ emailOrPhone: '', error: '' });
                }}
                className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                ← Back to welcome
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSignupStep = () => (
    <div className="min-h-screen bg-gray-50 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#1E2A78]/5 via-transparent to-[#3B4B9A]/5"></div>
      <div className="absolute top-0 right-0 w-96 h-96 bg-[#1E2A78]/5 rounded-full -translate-y-48 translate-x-48"></div>
      
      <div className="relative z-10 min-h-screen flex flex-col justify-center px-6 py-8">
        <div className="max-w-sm mx-auto w-full">
          
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto bg-gradient-to-br from-[#1E2A78] to-[#3B4B9A] rounded-2xl flex items-center justify-center mb-6 shadow-xl">
              <ChefHat className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-3xl font-light text-gray-900 mb-2">Create Account</h2>
            <p className="text-gray-600 text-base">
              {restaurantInfo ? `Join ${restaurantInfo.name}'s loyalty program` : 'Start earning rewards today'}
            </p>
          </div>

          {/* Existing Customer Alert */}
          {existingCustomer && (
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-6">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <h3 className="font-medium text-blue-900 mb-1">Welcome back!</h3>
                  <p className="text-blue-700 text-sm mb-3">
                    We found an existing account for {existingCustomer.first_name} {existingCustomer.last_name}
                    {restaurantInfo && ` at ${restaurantInfo.name}`}
                  </p>
                  <button
                    onClick={handleExistingCustomerLogin}
                    className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                  >
                    Continue with existing account
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Form */}
          <div className="bg-white rounded-3xl border border-gray-200 p-6 shadow-lg">
            <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); handleSignup(); }}>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">First Name</label>
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => handleInputChange('firstName', e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-[#1E2A78] focus:border-transparent transition-all duration-200"
                    placeholder="Ahmed"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Last Name</label>
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => handleInputChange('lastName', e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-[#1E2A78] focus:border-transparent transition-all duration-200"
                    placeholder="Al Rashid"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Phone className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    className={`w-full pl-12 pr-4 py-3 bg-gray-50 border rounded-xl text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-[#1E2A78] focus:border-transparent transition-all duration-200 ${
                      formData.phone && !validatePhoneNumber(formData.phone) 
                        ? 'border-red-300 bg-red-50' 
                        : 'border-gray-200'
                    }`}
                    placeholder="+971 50 567 8123"
                    required
                  />
                </div>
                {formData.phone && !validatePhoneNumber(formData.phone) && (
                  <p className="text-red-600 text-xs mt-1">Please enter a valid phone number</p>
                )}
                <p className="text-gray-500 text-xs mt-1">
                  {SMSService.detectCountryCode(formData.phone) !== 'UNKNOWN' 
                    ? `Detected: ${SMSService.getCountryName(SMSService.detectCountryCode(formData.phone))}` 
                    : 'Enter with country code (e.g., +971 for UAE, +1 for US)'
                  }
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-[#1E2A78] focus:border-transparent transition-all duration-200"
                  placeholder="ahmed@example.com"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Date of Birth (Optional)</label>
                <input
                  type="date"
                  value={formData.birthDate}
                  onChange={(e) => handleInputChange('birthDate', e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-[#1E2A78] focus:border-transparent transition-all duration-200"
                />
                <p className="text-sm text-gray-500 mt-2">Unlock birthday rewards</p>
              </div>

              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id="terms"
                  checked={formData.acceptTerms}
                  onChange={(e) => handleInputChange('acceptTerms', e.target.checked)}
                  className="mt-1 w-4 h-4 text-[#1E2A78] border-gray-300 rounded focus:ring-[#1E2A78] bg-gray-50"
                  required
                />
                <label htmlFor="terms" className="text-sm text-gray-600 leading-relaxed">
                  I agree to the <span className="text-[#1E2A78] font-medium">Terms of Service</span> and <span className="text-[#1E2A78] font-medium">Privacy Policy</span>
                  {restaurantInfo && (
                    <span> for {restaurantInfo.name}</span>
                  )}
                </label>
              </div>

              {verification.error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>{verification.error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={!formData.firstName || !formData.lastName || !formData.phone || !formData.email || !formData.acceptTerms || !validatePhoneNumber(formData.phone) || isLoading}
                className="w-full py-4 bg-gradient-to-r from-[#1E2A78] to-[#3B4B9A] text-white rounded-xl font-semibold hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Sending verification...
                  </>
                ) : (
                  <>
                    Continue
                    <ArrowRight className="h-5 w-5" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 text-center">
              <button
                onClick={() => {
                  setCurrentStep('welcome');
                  setExistingCustomer(null);
                  setVerification(prev => ({ ...prev, error: '' }));
                }}
                className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                ← Back to welcome
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderVerifyStep = () => (
    <div className="min-h-screen bg-gray-50 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#1E2A78]/5 via-transparent to-[#3B4B9A]/5"></div>
      <div className="absolute top-0 right-0 w-96 h-96 bg-[#1E2A78]/5 rounded-full -translate-y-48 translate-x-48"></div>
      
      <div className="relative z-10 min-h-screen flex flex-col justify-center px-6 py-8">
        <div className="max-w-sm mx-auto w-full">
          
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto bg-gradient-to-br from-[#1E2A78] to-[#3B4B9A] rounded-2xl flex items-center justify-center mb-6 shadow-xl">
              <Phone className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-3xl font-light text-gray-900 mb-2">Verify Phone</h2>
            <p className="text-gray-600 mb-1">Enter the code sent to</p>
            <p className="font-medium text-gray-900">{SMSService.formatPhoneNumber(verification.phoneNumber)}</p>
          </div>

          {/* Form */}
          <div className="bg-white rounded-3xl border border-gray-200 p-6 shadow-lg">
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Verification Code</label>
                <input
                  type="text"
                  value={verification.code}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 4);
                    setVerification(prev => ({ ...prev, code: value, error: '' }));
                  }}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-[#1E2A78] focus:border-transparent transition-all duration-200 text-center text-2xl font-bold tracking-widest"
                  placeholder="0000"
                  maxLength={4}
                />
                {verification.error && (
                  <p className="text-red-600 text-sm mt-2 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    {verification.error}
                  </p>
                )}
                <p className="text-gray-500 text-sm mt-2">
                  For demo purposes, enter any 4-digit code
                </p>
              </div>

              <button
                onClick={handleVerification}
                disabled={verification.code.length !== 4 || verification.isVerifying}
                className="w-full py-4 bg-gradient-to-r from-[#1E2A78] to-[#3B4B9A] text-white rounded-xl font-semibold hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg"
              >
                {verification.isVerifying ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  'Verify & Continue'
                )}
              </button>

              <div className="text-center">
                <button 
                  onClick={async () => {
                    const result = await SMSService.sendVerificationCode(verification.phoneNumber);
                    if (result.success) {
                      setVerification(prev => ({ ...prev, error: '', messageId: result.messageId }));
                    } else {
                      setVerification(prev => ({ ...prev, error: result.error || 'Failed to resend code' }));
                    }
                  }}
                  className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
                >
                  Didn't receive the code? Resend
                </button>
              </div>
            </div>

            <div className="mt-6 text-center">
              <button
                onClick={() => setCurrentStep('signup')}
                className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                ← Back to signup
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="transition-all duration-700 ease-in-out">
      {currentStep === 'welcome' && renderWelcomeStep()}
      {currentStep === 'signup' && renderSignupStep()}
      {currentStep === 'login' && renderLoginStep()}
      {currentStep === 'verify' && renderVerifyStep()}
    </div>
  );
};

export default OnboardingFlow;