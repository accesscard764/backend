import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { User, Session } from '@supabase/supabase-js';
import type { Staff } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  staff: Staff | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [staff, setStaff] = useState<Staff | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    let authTimeout: NodeJS.Timeout;

    const initializeAuth = async () => {
      try {
        console.log('🔄 Initializing authentication...');
        
        // Set a timeout to prevent infinite loading
        authTimeout = setTimeout(() => {
          if (mounted) {
            console.log('⏰ Auth initialization timeout');
            setLoading(false);
          }
        }, 5000);

        // Get initial session
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('❌ Error getting session:', error);
          if (mounted) {
            clearTimeout(authTimeout);
            setLoading(false);
          }
          return;
        }

        console.log('📋 Initial session:', session?.user?.email || 'No session');
        
        if (mounted) {
          clearTimeout(authTimeout);
          setSession(session);
          setUser(session?.user ?? null);
          
          if (session?.user) {
            // Don't wait for staff data to finish loading
            fetchStaffData(session.user);
          }
          setLoading(false);
        }
      } catch (error) {
        console.error('❌ Error in initializeAuth:', error);
        if (mounted) {
          clearTimeout(authTimeout);
          setLoading(false);
        }
      }
    };

    // Initialize auth
    initializeAuth();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔄 Auth state change:', event, session?.user?.email || 'No user');
      
      if (mounted) {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          fetchStaffData(session.user);
        } else {
          setStaff(null);
        }
        
        // Always set loading to false on auth state change
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      if (authTimeout) {
        clearTimeout(authTimeout);
      }
      subscription.unsubscribe();
    };
  }, []);

  const createDefaultRestaurant = async (userEmail: string) => {
    try {
      console.log('🏢 Creating default restaurant for user:', userEmail);
      
      // Extract restaurant name from email domain or use default
      const emailDomain = userEmail.split('@')[1];
      const restaurantName = emailDomain ? 
        `${emailDomain.split('.')[0]} Restaurant` : 
        'My Restaurant';

      // The RLS policy requires that the user's email matches the restaurant email
      // So we use the user's email as the restaurant email to satisfy the policy
      const { data: restaurant, error } = await supabase
        .from('restaurants')
        .insert({
          name: restaurantName,
          email: userEmail, // This must match the authenticated user's email for RLS
          settings: {},
          subscription_plan: 'basic',
          is_active: true
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Error creating restaurant:', error);
        throw error;
      }

      console.log('✅ Default restaurant created:', restaurant.name);
      return restaurant;
    } catch (error) {
      console.error('❌ Error in createDefaultRestaurant:', error);
      throw error;
    }
  };

  const createDefaultLoyaltyTiers = async (restaurantId: string) => {
    try {
      console.log('🏆 Creating default loyalty tiers for restaurant:', restaurantId);
      
      const defaultTiers = [
        {
          restaurant_id: restaurantId,
          tier: 'bronze',
          name: 'Bronze',
          min_points: 0,
          benefits: ['Earn 1 point per $1 spent', 'Birthday bonus'],
          color: '#CD7F32'
        },
        {
          restaurant_id: restaurantId,
          tier: 'silver',
          name: 'Silver',
          min_points: 500,
          benefits: ['Earn 1.5 points per $1 spent', 'Birthday bonus', '5% discount'],
          color: '#C0C0C0'
        },
        {
          restaurant_id: restaurantId,
          tier: 'gold',
          name: 'Gold',
          min_points: 1000,
          benefits: ['Earn 2 points per $1 spent', 'Birthday bonus', '10% discount', 'Priority seating'],
          color: '#FFD700'
        }
      ];

      const { error } = await supabase
        .from('loyalty_tiers')
        .insert(defaultTiers);

      if (error) {
        console.error('❌ Error creating loyalty tiers:', error);
        throw error;
      }

      console.log('✅ Default loyalty tiers created');
    } catch (error) {
      console.error('❌ Error in createDefaultLoyaltyTiers:', error);
      // Don't throw - this is not critical for basic functionality
    }
  };

  const createDefaultRewards = async (restaurantId: string) => {
    try {
      console.log('🎁 Creating default rewards for restaurant:', restaurantId);
      
      const defaultRewards = [
        {
          restaurant_id: restaurantId,
          name: 'Free Appetizer',
          description: 'Get a free appetizer of your choice',
          points_required: 100,
          category: 'food',
          min_tier: 'bronze',
          is_active: true
        },
        {
          restaurant_id: restaurantId,
          name: '10% Off Meal',
          description: '10% discount on your entire meal',
          points_required: 200,
          category: 'discount',
          min_tier: 'bronze',
          is_active: true
        },
        {
          restaurant_id: restaurantId,
          name: 'Free Dessert',
          description: 'Complimentary dessert with any entree',
          points_required: 150,
          category: 'food',
          min_tier: 'silver',
          is_active: true
        },
        {
          restaurant_id: restaurantId,
          name: 'Free Main Course',
          description: 'Free main course (up to $25 value)',
          points_required: 500,
          category: 'food',
          min_tier: 'gold',
          is_active: true
        }
      ];

      const { error } = await supabase
        .from('rewards')
        .insert(defaultRewards);

      if (error) {
        console.error('❌ Error creating rewards:', error);
        throw error;
      }

      console.log('✅ Default rewards created');
    } catch (error) {
      console.error('❌ Error in createDefaultRewards:', error);
      // Don't throw - this is not critical for basic functionality
    }
  };

  const fetchStaffData = async (user: User) => {
    try {
      console.log('👤 Fetching staff data for:', user.email);
      
      // Test database connection first
      const { data: testConnection, error: connectionError } = await supabase
        .from('staff')
        .select('restaurant_id')
        .limit(1);

      if (connectionError) {
        console.error('❌ Database connection error:', connectionError);
        setStaff(null);
        setUser(null);
        await supabase.auth.signOut();
        return;
      }

      console.log('✅ Database connection successful');

      // Try to find staff by user_id first
      const { data: staffData, error } = await supabase
        .from('staff')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('❌ Error fetching staff by user_id:', error);
        setStaff(null);
        setUser(null);
        await supabase.auth.signOut();
        return;
      }

      // If staff record found by user_id, we're done
      if (staffData) {
        console.log('✅ Staff data found by user_id:', staffData.first_name, staffData.last_name, staffData.role);
        setStaff(staffData);
        return;
      }

      // No staff record found by user_id, try to find by email
      console.log('🔍 No staff record found by user_id, trying email lookup...');
      
      if (user.email) {
        const { data: staffByEmail, error: emailError } = await supabase
          .from('staff')
          .select('*')
          .eq('email', user.email)
          .maybeSingle();

        if (emailError) {
          console.error('❌ Error fetching staff by email:', emailError);
          setStaff(null);
          setUser(null);
          await supabase.auth.signOut();
          return;
        }

        if (staffByEmail && !staffByEmail.user_id) {
          console.log('🔗 Linking user_id to existing staff record');
          
          // Update the staff record with the user_id
          const { data: updatedStaff, error: updateError } = await supabase
            .from('staff')
            .update({ 
              user_id: user.id,
              last_login: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('email', user.email)
            .select()
            .single();

          if (updateError) {
            console.error('❌ Error updating staff user_id:', updateError);
            setStaff(null);
            setUser(null);
            await supabase.auth.signOut();
            return;
          }

          console.log('✅ Staff record linked and updated');
          setStaff(updatedStaff);
          return;
        } else if (staffByEmail) {
          console.log('✅ Staff data found by email');
          setStaff(staffByEmail);
          return;
        }
      }

      // No staff record exists - check if user can access any existing restaurants first
      console.log('🔍 Checking for existing restaurants user can access...');
      
      if (!user.email) {
        console.error('❌ User has no email - cannot create staff record');
        setStaff(null);
        setUser(null);
        await supabase.auth.signOut();
        return;
      }

      // Check if there's a restaurant with the same email as the user
      const { data: existingRestaurant, error: restaurantError } = await supabase
        .from('restaurants')
        .select('*')
        .eq('email', user.email)
        .eq('is_active', true)
        .maybeSingle();

      if (restaurantError) {
        console.error('❌ Error checking for existing restaurant:', restaurantError);
        // Continue with creating new restaurant
      }

      let restaurant = existingRestaurant;

      if (!restaurant) {
        console.log('🆕 No matching restaurant found - creating default setup...');
        
        try {
          // Create a new restaurant with the user's email to satisfy RLS policy
          restaurant = await createDefaultRestaurant(user.email);
          
          // Create default loyalty tiers and rewards
          await createDefaultLoyaltyTiers(restaurant.id);
          await createDefaultRewards(restaurant.id);
        } catch (restaurantError) {
          console.error('❌ Failed to create restaurant:', restaurantError);
          
          // If restaurant creation fails, check if there are any restaurants we can use
          const { data: anyRestaurants } = await supabase
            .from('restaurants')
            .select('*')
            .eq('is_active', true)
            .limit(1);

          if (anyRestaurants && anyRestaurants.length > 0) {
            console.log('⚠️ Using fallback restaurant due to creation failure');
            restaurant = anyRestaurants[0];
          } else {
            console.error('❌ No restaurants available and cannot create new one');
            setStaff(null);
            setUser(null);
            await supabase.auth.signOut();
            return;
          }
        }
      } else {
        console.log('✅ Using existing restaurant with matching email:', restaurant.name);
      }

      // Extract name from email or use defaults
      const emailPrefix = user.email.split('@')[0];
      const nameParts = emailPrefix.split(/[._-]/);
      const firstName = nameParts[0] ? 
        nameParts[0].charAt(0).toUpperCase() + nameParts[0].slice(1) : 
        'Restaurant';
      const lastName = nameParts[1] ? 
        nameParts[1].charAt(0).toUpperCase() + nameParts[1].slice(1) : 
        'Manager';

      // Create staff record
      const { data: newStaff, error: staffError } = await supabase
        .from('staff')
        .insert({
          restaurant_id: restaurant.id,
          user_id: user.id,
          email: user.email,
          first_name: firstName,
          last_name: lastName,
          role: 'admin', // Make them admin by default
          permissions: ['all'], // Give full permissions
          is_active: true,
          last_login: new Date().toISOString()
        })
        .select()
        .single();

      if (staffError) {
        console.error('❌ Error creating staff record:', staffError);
        setStaff(null);
        setUser(null);
        await supabase.auth.signOut();
        return;
      }

      console.log('✅ Staff record created successfully:', newStaff.first_name, newStaff.last_name, newStaff.role);
      setStaff(newStaff);

    } catch (error) {
      console.error('❌ Error in fetchStaffData:', error);
      setStaff(null);
      setUser(null);
      await supabase.auth.signOut();
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      console.log('🔐 Attempting sign in for:', email);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('❌ Sign in error:', error.message);
        
        // Provide more user-friendly error messages
        if (error.message.includes('Invalid login credentials')) {
          return { error: 'Invalid email or password. Please check your credentials and try again.' };
        }
        if (error.message.includes('Email not confirmed')) {
          return { error: 'Please check your email and click the verification link before signing in.' };
        }
        if (error.message.includes('Too many requests')) {
          return { error: 'Too many login attempts. Please wait a few minutes before trying again.' };
        }
        
        return { error: error.message };
      }

      console.log('✅ Sign in successful for:', data.user?.email);
      return {};
    } catch (error) {
      console.error('❌ Unexpected sign in error:', error);
      return { error: 'An unexpected error occurred. Please try again.' };
    }
  };

  const signOut = async () => {
    console.log('🚪 Signing out user');
    await supabase.auth.signOut();
    setUser(null);
    setStaff(null);
    setSession(null);
  };

  const resetPassword = async (email: string) => {
    try {
      console.log('🔄 Sending password reset for:', email);
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        console.error('❌ Password reset error:', error.message);
        return { error: error.message };
      }

      console.log('✅ Password reset email sent successfully');
      return {};
    } catch (error) {
      console.error('❌ Unexpected password reset error:', error);
      return { error: 'An unexpected error occurred' };
    }
  };

  const value = {
    user,
    staff,
    session,
    loading,
    signIn,
    signOut,
    resetPassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};