/* This page includes the Search Bar */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const LandingPage = () => {
  const navigate = useNavigate();
  
  // State for the Search Box
  const [search, setSearch] = useState({
    checkIn: '',
    checkOut: '',
    adults: 1
  });

  const handleSearch = (e) => {
    e.preventDefault();
    // In the future, this will redirect to a Results page
    console.log("Searching for:", search);
    alert(`Searching availability from ${search.checkIn} to ${search.checkOut}`);
  };

  return (
    <div>
      {/* --- HERO SECTION WITH BACKGROUND IMAGE --- */}
      <div style={{ 
        backgroundImage: 'linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.5)), url("https://images.unsplash.com/photo-1566073771259-6a8506099945?ixlib=rb-1.2.1&auto=format&fit=crop&w=1920&q=80")',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        height: '80vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        color: 'white',
        textAlign: 'center',
        padding: '20px'
      }}>
        <h1 style={{ fontSize: '3.5rem', marginBottom: '1rem', textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>
          Welcome to Gi'ez Hotel-Aksum MAHWG
        </h1>
        <p style={{ fontSize: '1.2rem', maxWidth: '600px', marginBottom: '3rem' }}>
          Your perfect getaway starts here. Book your stay with us today.
        </p>

        {/* --- SEARCH BOX --- */}
        <form onSubmit={handleSearch} style={{ 
          backgroundColor: 'white', 
          padding: '20px', 
          borderRadius: '8px', 
          display: 'flex', 
          flexWrap: 'wrap',
          gap: '15px',
          alignItems: 'flex-end',
          boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
          maxWidth: '900px',
          width: '100%'
        }}>
          {/* Check In */}
          <div style={{ flex: 1, minWidth: '200px' }}>
            <label style={{ display: 'block', color: '#333', fontWeight: 'bold', marginBottom: '5px', textAlign: 'left' }}>Check In</label>
            <input 
              type="date" 
              className="form-control"
              value={search.checkIn}
              onChange={(e) => setSearch({...search, checkIn: e.target.value})}
              required
              style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }}
            />
          </div>

          {/* Check Out */}
          <div style={{ flex: 1, minWidth: '200px' }}>
            <label style={{ display: 'block', color: '#333', fontWeight: 'bold', marginBottom: '5px', textAlign: 'left' }}>Check Out</label>
            <input 
              type="date" 
              className="form-control"
              value={search.checkOut}
              onChange={(e) => setSearch({...search, checkOut: e.target.value})}
              required
              style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }}
            />
          </div>

          {/* Guests */}
          <div style={{ width: '100px' }}>
            <label style={{ display: 'block', color: '#333', fontWeight: 'bold', marginBottom: '5px', textAlign: 'left' }}>Guests</label>
            <select 
              value={search.adults}
              onChange={(e) => setSearch({...search, adults: e.target.value})}
              style={{ width: '100%', padding: '11px', borderRadius: '4px', border: '1px solid #ccc' }}
            >
              <option value="1">1 Person</option>
              <option value="2">2 People</option>
              <option value="3">3 People</option>
              <option value="4">4+ People</option>
            </select>
          </div>

          {/* Button */}
          <button type="submit" style={{ 
            backgroundColor: '#1976d2', 
            color: 'white', 
            border: 'none', 
            padding: '12px 30px', 
            fontSize: '1rem', 
            fontWeight: 'bold', 
            borderRadius: '4px', 
            cursor: 'pointer',
            flex: '0 0 auto'
          }}>
            Check Availability
          </button>
        </form>
      </div>

      {/* --- FEATURED ROOMS PREVIEW (Static for now) --- */}
      <div style={{ padding: '4rem 2rem', maxWidth: '1200px', margin: '0 auto' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '2rem', color: '#333' }}>Our Best Rooms</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
          {/* Card 1 */}
          <div style={{ borderRadius: '8px', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
            <img src="https://images.unsplash.com/photo-1611892440504-42a792e24d32?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80" alt="Room" style={{ width: '100%', height: '200px', objectFit: 'cover' }} />
            <div style={{ padding: '1.5rem' }}>
              <h3 style={{ margin: '0 0 10px 0' }}>Deluxe Suite</h3>
              <p style={{ color: '#666' }}>Spacious suite with city view and king size bed.</p>
              <div style={{ marginTop: '1rem', fontWeight: 'bold', color: '#1976d2' }}>$120 / Night</div>
            </div>
          </div>
          {/* Card 2 */}
          <div style={{ borderRadius: '8px', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
            <img src="https://images.unsplash.com/photo-1590490360182-c33d57733427?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80" alt="Room" style={{ width: '100%', height: '200px', objectFit: 'cover' }} />
            <div style={{ padding: '1.5rem' }}>
              <h3 style={{ margin: '0 0 10px 0' }}>Standard Room</h3>
              <p style={{ color: '#666' }}>Cozy room perfect for solo travelers or couples.</p>
              <div style={{ marginTop: '1rem', fontWeight: 'bold', color: '#1976d2' }}>$80 / Night</div>
            </div>
          </div>
          {/* Card 3 */}
          <div style={{ borderRadius: '8px', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
            <img src="https://images.unsplash.com/photo-1566665797739-1674de7a421a?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80" alt="Room" style={{ width: '100%', height: '200px', objectFit: 'cover' }} />
            <div style={{ padding: '1.5rem' }}>
              <h3 style={{ margin: '0 0 10px 0' }}>Family Room</h3>
              <p style={{ color: '#666' }}>Two queen beds with extra space for the whole family.</p>
              <div style={{ marginTop: '1rem', fontWeight: 'bold', color: '#1976d2' }}>$150 / Night</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;