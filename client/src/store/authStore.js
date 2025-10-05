import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import axios from 'axios';
import toast from 'react-hot-toast';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (email, password, twoFactorCode = null) => {
        set({ isLoading: true });
        try {
          const response = await axios.post(`${API_BASE_URL}/auth/login`, {
            email,
            password,
            twoFactorCode
          });

          if (response.data.requires2FA) {
            set({ isLoading: false });
            return { requires2FA: true };
          }

          const { token, user } = response.data;
          set({
            user,
            token,
            isAuthenticated: true,
            isLoading: false
          });

          // Set default authorization header
          axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          
          toast.success('Login successful!');
          return { success: true };
        } catch (error) {
          set({ isLoading: false });
          const message = error.response?.data?.error || 'Login failed';
          toast.error(message);
          return { success: false, error: message };
        }
      },

      register: async (userData) => {
        set({ isLoading: true });
        try {
          const response = await axios.post(`${API_BASE_URL}/auth/register`, userData);
          set({ isLoading: false });
          toast.success('Registration successful! Please check your email for verification.');
          return { success: true };
        } catch (error) {
          set({ isLoading: false });
          const message = error.response?.data?.error || 'Registration failed';
          toast.error(message);
          return { success: false, error: message };
        }
      },

      logout: () => {
        set({
          user: null,
          token: null,
          isAuthenticated: false
        });
        
        // Remove authorization header
        delete axios.defaults.headers.common['Authorization'];
        toast.success('Logged out successfully');
      },

      verifyEmail: async (token) => {
        set({ isLoading: true });
        try {
          await axios.get(`${API_BASE_URL}/auth/verify-email/${token}`);
          set({ isLoading: false });
          toast.success('Email verified successfully!');
          return { success: true };
        } catch (error) {
          set({ isLoading: false });
          const message = error.response?.data?.error || 'Email verification failed';
          toast.error(message);
          return { success: false, error: message };
        }
      },

      forgotPassword: async (email) => {
        set({ isLoading: true });
        try {
          await axios.post(`${API_BASE_URL}/auth/forgot-password`, { email });
          set({ isLoading: false });
          toast.success('Password reset link sent to your email');
          return { success: true };
        } catch (error) {
          set({ isLoading: false });
          const message = error.response?.data?.error || 'Failed to send reset link';
          toast.error(message);
          return { success: false, error: message };
        }
      },

      resetPassword: async (token, password) => {
        set({ isLoading: true });
        try {
          await axios.post(`${API_BASE_URL}/auth/reset-password`, { token, password });
          set({ isLoading: false });
          toast.success('Password reset successfully!');
          return { success: true };
        } catch (error) {
          set({ isLoading: false });
          const message = error.response?.data?.error || 'Password reset failed';
          toast.error(message);
          return { success: false, error: message };
        }
      },

      updateProfile: async (profileData) => {
        set({ isLoading: true });
        try {
          const response = await axios.put(`${API_BASE_URL}/users/profile`, profileData);
          set({ 
            user: response.data.user,
            isLoading: false 
          });
          toast.success('Profile updated successfully!');
          return { success: true };
        } catch (error) {
          set({ isLoading: false });
          const message = error.response?.data?.error || 'Failed to update profile';
          toast.error(message);
          return { success: false, error: message };
        }
      },

      changePassword: async (currentPassword, newPassword) => {
        set({ isLoading: true });
        try {
          await axios.put(`${API_BASE_URL}/users/change-password`, {
            currentPassword,
            newPassword
          });
          set({ isLoading: false });
          toast.success('Password changed successfully!');
          return { success: true };
        } catch (error) {
          set({ isLoading: false });
          const message = error.response?.data?.error || 'Failed to change password';
          toast.error(message);
          return { success: false, error: message };
        }
      },

      setup2FA: async () => {
        set({ isLoading: true });
        try {
          const response = await axios.post(`${API_BASE_URL}/auth/setup-2fa`);
          set({ isLoading: false });
          return { success: true, data: response.data };
        } catch (error) {
          set({ isLoading: false });
          const message = error.response?.data?.error || 'Failed to setup 2FA';
          toast.error(message);
          return { success: false, error: message };
        }
      },

      enable2FA: async (code) => {
        set({ isLoading: true });
        try {
          await axios.post(`${API_BASE_URL}/auth/enable-2fa`, { code });
          set({ isLoading: false });
          toast.success('2FA enabled successfully!');
          return { success: true };
        } catch (error) {
          set({ isLoading: false });
          const message = error.response?.data?.error || 'Failed to enable 2FA';
          toast.error(message);
          return { success: false, error: message };
        }
      },

      disable2FA: async (code) => {
        set({ isLoading: true });
        try {
          await axios.post(`${API_BASE_URL}/auth/disable-2fa`, { code });
          set({ isLoading: false });
          toast.success('2FA disabled successfully!');
          return { success: true };
        } catch (error) {
          set({ isLoading: false });
          const message = error.response?.data?.error || 'Failed to disable 2FA';
          toast.error(message);
          return { success: false, error: message };
        }
      },

      // Initialize auth state from localStorage
      initializeAuth: () => {
        const state = get();
        if (state.token) {
          axios.defaults.headers.common['Authorization'] = `Bearer ${state.token}`;
        }
      }
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated
      })
    }
  )
);

export { useAuthStore };