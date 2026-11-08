/**
 * Auth Context (Smart Detection Version)
 * Purpose: Automatically adapts to different backend response structures.
 */
import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // 1. SAFE STORAGE LOADING
  useEffect(() => {
    try {
      const savedUser = localStorage.getItem('user');
      const savedToken = localStorage.getItem('token');
      if (savedToken && savedUser && savedUser !== "undefined" && savedUser !== "null") {
        setUser(JSON.parse(savedUser));
      }
    } catch (error) {
      console.error("Storage Error:", error);
      localStorage.clear();
    }
    setLoading(false);
  }, []);

  // 2. SMART LOGIN
  const login = async (email, password) => {
    try {
      console.log("Logging in...");
      const response = await api.post('/auth/login', { email, password });
      
      // DEBUG: Dump the exact structure to console as text (easier to read)
      console.log("RAW RESPONSE TEXT:", JSON.stringify(response.data, null, 2));

      // normalize response
      const data = response.data || response;
      
      // === FIND THE TOKEN ===
      let token = data.token || data.accessToken || data.access_token;
      
      // Check nested 'data' object (Common in standard APIs)
      if (!token && data.data) {
        token = data.data.token || data.data.accessToken || data.data.access_token;
      }

      // === FIND THE USER ===
      let userData = data.user || data.userData;

      // Check nested 'data' object
      if (!userData && data.data) {
        userData = data.data.user || data.data.userData;
      }

      // === FALLBACK: SPREAD STRUCTURE ===
      // If we found a token in data.data, but no 'user' folder, 
      // the entire data.data object is likely the user profile.
      if (token && !userData && data.data) {
         console.log("Assuming spread structure (User details mixed with token)");
         userData = data.data;
      }

      if (token && userData) {
        console.log("Login Success! Token and User found.");
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(userData));
        setUser(userData);
        return { success: true };
      } else {
        console.error("Login Parsing Failed. Structure:", data);
        return { 
          success: false, 
          message: "Login successful, but Frontend couldn't find user data. Check Console 'RAW RESPONSE TEXT'." 
        };
      }
    } catch (error) {
      console.error("Login Error:", error);
      return { 
        success: false, 
        message: error.response?.data?.message || "Login failed." 
      };
    }
  };

  const logout = () => {
    localStorage.clear();
    setUser(null);
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);