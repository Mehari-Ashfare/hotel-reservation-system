import React, { useState, useEffect } from 'react';
import apiClient from '../../services/api';
import { Grid, Card, CardContent, Typography, Button, Box, Chip, Alert } from '@mui/material';
import { useNavigate } from 'react-router-dom';

const GuestBooking = () => {
  const [rooms, setRooms] = useState([]);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const formatDate = (date) => date.toISOString().split('T')[0];

        // FIX: Changed 'checkIn'/'checkOut' to 'start_date'/'end_date' to match Backend
        const response = await apiClient.get('/rooms/available', {
            params: { 
              start_date: formatDate(today), 
              end_date: formatDate(tomorrow) 
            }
        });
        
        const roomData = response.data.data || response.data || [];
        setRooms(roomData);
        
        if (roomData.length === 0) {
            setError("No available rooms found for today.");
        }
      } catch (err) {
        console.error("Error loading rooms", err);
        setError(`Error loading rooms: ${err.response?.data?.message || err.message}`);
      }
    };
    fetchRooms();
  }, []);

  const handleBook = (roomId) => {
    // FIX: Navigate to the new confirmation/payment page
    navigate(`/book-room/${roomId}/confirm`);
  };

  return (
    <div style={{ padding: '20px' }}>
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 'bold' }}>
        Book Your Stay
      </Typography>
      
      {error && <Alert severity="warning" sx={{ mb: 3 }}>{error}</Alert>}

      {rooms.length === 0 && !error ? (
        <Typography>Loading available rooms...</Typography>
      ) : (
        <Grid container spacing={3}>
          {rooms.map((room) => (
            <Grid item xs={12} sm={6} md={4} key={room.room_id}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <Box sx={{ height: 140, backgroundColor: '#e3f2fd', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Typography variant="h3" color="primary"></Typography>
                </Box>
                <CardContent sx={{ flexGrow: 1 }}>
                  <Typography gutterBottom variant="h5" component="div">
                    {room.type_name || `Room ${room.room_number}`}
                  </Typography>
                  <Chip label={room.status} color="success" size="small" sx={{ mb: 2 }} />
                  <Typography variant="body2" color="text.secondary">
                     Room Number: {room.room_number}<br/>
                     Capacity: {room.capacity || 2} Guests
                  </Typography>
                  <Typography variant="h6" color="primary" sx={{ mt: 2 }}>
                    ETB {room.price_per_night} / night
                  </Typography>
                </CardContent>
                <Box sx={{ p: 2 }}>
                  <Button variant="contained" fullWidth onClick={() => handleBook(room.room_id)}>
                    Book Now
                  </Button>
                </Box>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </div>
  );
};

export default GuestBooking;