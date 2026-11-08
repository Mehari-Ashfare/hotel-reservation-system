import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { 
  Container, Paper, Typography, Grid, TextField, Button, Box, Divider, 
  CircularProgress, Alert, MenuItem, Card, CardContent 
} from '@mui/material';
import { CreditCard, ArrowBack } from '@mui/icons-material';

const GuestReservation = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  
  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  
  // Form State
  const [dates, setDates] = useState({
    checkIn: '',
    checkOut: ''
  });
  
  const [numGuests, setNumGuests] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState('credit_card'); // Default to credit card

  // Database Enum Options
  const paymentMethods = [
    { value: 'cash', label: 'Cash (Pay at Hotel)' },
    { value: 'credit_card', label: 'Credit Card' },
    { value: 'debit_card', label: 'Debit Card' },
    { value: 'online_payment', label: 'Online Transfer' }
  ];

  // Load Room Details
  useEffect(() => {
    const fetchRoom = async () => {
      try {
        const response = await apiClient.get(`/rooms/${roomId}`);
        setRoom(response.data.data || response.data);
      } catch (err) {
        setError('Could not load room details.');
      } finally {
        setLoading(false);
      }
    };
    fetchRoom();
  }, [roomId]);

  // Calculate Math
  const calculateTotal = () => {
    const price = Number(room?.price_per_night || room?.price || 0);
    if (!dates.checkIn || !dates.checkOut || price === 0) return { nights: 0, total: 0 };

    const start = new Date(dates.checkIn);
    const end = new Date(dates.checkOut);
    const diffTime = end - start;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
    
    return {
        nights: diffDays > 0 ? diffDays : 0,
        total: diffDays > 0 ? diffDays * price : 0
    };
  };

  const { nights, total } = calculateTotal();
  const nightlyPrice = Number(room?.price_per_night || room?.price || 0);

  const handleBookAndPay = async () => {
    setError('');
    
    if (!dates.checkIn || !dates.checkOut) {
      setError('Please select check-in and check-out dates.');
      return;
    }

    if (total <= 0) {
      setError('Invalid date range.');
      return;
    }

    setSubmitting(true);

    try {
      const profileRes = await apiClient.get('/auth/me');
      const guestId = profileRes.data.data.guest?.id;

      if (!guestId) throw new Error("Could not identify guest profile.");

      // 1. Create Reservation
      const resResponse = await apiClient.post('/reservations', {
        room_id: roomId,
        guest_id: guestId,
        check_in_date: dates.checkIn,
        check_out_date: dates.checkOut,
        number_of_guests: numGuests,
        total_amount: total,
        status: 'confirmed' 
      });

      const reservationId = resResponse.data.data.reservation_id;

      // 2. Process Payment
      await apiClient.post('/payments', {
        reservation_id: reservationId,
        amount: total,
        payment_method: paymentMethod,
        payment_status: 'completed'
      });

      alert("Payment Successful! Your room is booked.");
      navigate('/reservations');

    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || err.message || "Booking failed.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <Box p={4} textAlign="center"><CircularProgress /></Box>;
  if (!room) return <Box p={4}><Alert severity="error">Room not found</Alert></Box>;

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <Button startIcon={<ArrowBack />} onClick={() => navigate('/book-room')} sx={{ mr: 2 }}>
            Back
        </Button>
        <Typography variant="h5" fontWeight="bold">
            Confirm Booking - {room.type_name || `Room ${room.room_number}`}
        </Typography>
      </Box>

      <Paper sx={{ p: 4, borderRadius: 2, boxShadow: 3 }}>
        
        {/* SECTION 1: DATES & GUESTS (Input Row) */}
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold', color: '#1a237e' }}>
            1. Stay Details
        </Typography>
        <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} sm={4}>
                <TextField
                  label="Check-in Date"
                  type="date"
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                  value={dates.checkIn}
                  onChange={(e) => setDates({ ...dates, checkIn: e.target.value })}
                />
            </Grid>
            <Grid item xs={12} sm={4}>
                <TextField
                  label="Check-out Date"
                  type="date"
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                  value={dates.checkOut}
                  onChange={(e) => setDates({ ...dates, checkOut: e.target.value })}
                />
            </Grid>
            <Grid item xs={12} sm={4}>
                <TextField
                  select
                  label="Guests"
                  fullWidth
                  value={numGuests}
                  onChange={(e) => setNumGuests(e.target.value)}
                >
                  {[1, 2, 3, 4].map((num) => (
                    <MenuItem key={num} value={num}>{num} Guest{num > 1 ? 's' : ''}</MenuItem>
                  ))}
                </TextField>
            </Grid>
        </Grid>

        <Divider sx={{ mb: 4 }} />

        {/* SECTION 2: ADMIN-STYLE SUMMARY BOXES */}
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold', color: '#1a237e' }}>
            2. Payment Summary
        </Typography>

        {/* This creates the 3-box layout from your screenshot */}
        <Grid container spacing={2} sx={{ mb: 4 }}>
            <Grid item xs={12} sm={4}>
                <Box sx={{ p: 2, bgcolor: '#f5f5f5', borderRadius: 2, textAlign: 'center' }}>
                    <Typography variant="body2" color="text.secondary">Price Per Night</Typography>
                    <Typography variant="h6" fontWeight="bold">${nightlyPrice.toFixed(2)}</Typography>
                </Box>
            </Grid>
            <Grid item xs={12} sm={4}>
                <Box sx={{ p: 2, bgcolor: '#f5f5f5', borderRadius: 2, textAlign: 'center' }}>
                    <Typography variant="body2" color="text.secondary">Total Nights</Typography>
                    <Typography variant="h6" fontWeight="bold" color={nights > 0 ? "primary" : "text.secondary"}>
                        {nights} Nights
                    </Typography>
                </Box>
            </Grid>
            <Grid item xs={12} sm={4}>
                <Box sx={{ p: 2, bgcolor: '#fff3e0', borderRadius: 2, textAlign: 'center', border: '1px solid #ffcc80' }}>
                    <Typography variant="body2" color="error" fontWeight="bold">Total Cost</Typography>
                    <Typography variant="h5" fontWeight="bold" color="error">
                        ${total.toFixed(2)}
                    </Typography>
                </Box>
            </Grid>
        </Grid>

        {/* SECTION 3: PAYMENT METHOD (Dropdown Style) */}
        <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
                <TextField
                    label="Total Amount ($)"
                    fullWidth
                    value={total > 0 ? total : ''}
                    InputProps={{ readOnly: true }} // Guest can't change the price
                    helperText="Amount to be paid now"
                />
            </Grid>
            <Grid item xs={12} sm={6}>
                <TextField
                    select
                    label="Payment Method"
                    fullWidth
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                >
                    {paymentMethods.map((option) => (
                        <MenuItem key={option.value} value={option.value}>
                            {option.label}
                        </MenuItem>
                    ))}
                </TextField>
            </Grid>
        </Grid>

        {/* Mock Credit Card Input - Only shows if Credit Card is selected */}
        {paymentMethod === 'credit_card' && (
            <Box sx={{ mt: 3 }}>
                <TextField 
                    label="Card Number (Mock)" 
                    fullWidth 
                    placeholder="0000 0000 0000 0000" 
                    InputProps={{ startAdornment: <CreditCard sx={{ color: 'action.active', mr: 1 }} /> }}
                />
            </Box>
        )}

        {/* Error Message */}
        {error && <Alert severity="error" sx={{ mt: 3 }}>{error}</Alert>}

        {/* Footer Actions */}
        <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
            <Button variant="outlined" onClick={() => navigate('/book-room')}>
                Cancel
            </Button>
            <Button 
                variant="contained" 
                size="large"
                onClick={handleBookAndPay}
                disabled={submitting || total <= 0}
                sx={{ px: 5, fontWeight: 'bold' }}
            >
                {submitting ? 'Processing...' : `Pay $${total.toFixed(2)}`}
            </Button>
        </Box>

      </Paper>
    </Container>
  );
};

export default GuestReservation;
