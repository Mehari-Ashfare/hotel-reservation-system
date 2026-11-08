/* This file will define the "Frame" for your public pages (Navbar at top, content in middle, Footer at bottom). */

import React from 'react';
import { Outlet, Link } from 'react-router-dom';

const PublicLayout = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* --- PUBLIC NAVBAR --- */}
      <nav style={{ 
        padding: '1rem 2rem', 
        backgroundColor: '#fff', 
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        position: 'sticky',
        top: 0,
        zIndex: 1000
      }}>
        <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1976d2' }}>
          <Link to="/" style={{ textDecoration: 'none', color: '#1976d2' }}>
            Hotel System
          </Link>
        </div>
        <div style={{ display: 'flex', gap: '20px' }}>
          <Link to="/" style={{ textDecoration: 'none', color: '#333', fontWeight: '500' }}>Home</Link>
          <Link to="/rooms" style={{ textDecoration: 'none', color: '#333', fontWeight: '500' }}>Our Rooms</Link>
          <Link to="/login" style={{ 
            textDecoration: 'none', 
            backgroundColor: '#1976d2', 
            color: 'white', 
            padding: '8px 16px', 
            borderRadius: '4px',
            fontWeight: 'bold'
          }}>
            Login / Sign Up
          </Link>
        </div>
      </nav>

      {/* --- PAGE CONTENT (Landing Page goes here) --- */}
      <div style={{ flex: 1 }}>
        <Outlet />
      </div>

      {/* --- FOOTER --- */}
      <footer style={{ 
        backgroundColor: '#1a1a1a', 
        color: '#fff', 
        padding: '3rem 2rem', 
        marginTop: 'auto' 
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '2rem' }}>
          <div>
            <h3>About Us</h3>
            <p style={{ color: '#aaa', lineHeight: '1.6' }}>
              Experience luxury and comfort in the heart of the city. 
              Our hotel offers premium amenities and unforgettable stays.
            </p>
          </div>
          <div>
            <h3>Contact</h3>
            <p style={{ color: '#aaa' }}> 123 Main Street, Aksum</p>
            <p style={{ color: '#aaa' }}> +251 901298714</p>
            <p style={{ color: '#aaa' }}> mehariashfare2012@gamil.com</p>
          </div>
          <div>
            <h3>Quick Links</h3>
            <ul style={{ listStyle: 'none', padding: 0, color: '#aaa' }}>
              <li style={{ marginBottom: '8px' }}><Link to="/" style={{ color: '#aaa', textDecoration: 'none' }}>Home</Link></li>
              <li style={{ marginBottom: '8px' }}><Link to="/rooms" style={{ color: '#aaa', textDecoration: 'none' }}>Rooms</Link></li>
              <li style={{ marginBottom: '8px' }}><Link to="/login" style={{ color: '#aaa', textDecoration: 'none' }}>Admin Login</Link></li>
            </ul>
          </div>
        </div>
        <div style={{ textAlign: 'center', borderTop: '1px solid #333', marginTop: '2rem', paddingTop: '2rem', color: '#666' }}>
          © {new Date().getFullYear()} Hotel Reservation System. All rights reserved.
        </div>
      </footer>
    </div>
  );
};

export default PublicLayout;