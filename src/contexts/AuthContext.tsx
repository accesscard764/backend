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

      // No staff record exists - this user is not authorized
      console.log('❌ No staff record found for user - unauthorized access');
      setStaff(null);
      setUser(null);
      await supabase.auth.signOut();
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