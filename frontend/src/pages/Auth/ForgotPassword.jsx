import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import AuthService from '../../services/authService';
import { Container, Card, CardContent, TextField, Button, Typography, Box, Alert } from '@mui/material';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const res = await AuthService.forgotPassword(email);
      setMessage(res.message);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send reset link');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="xs" sx={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Card sx={{ width: '100%', boxShadow: 3 }}>
        <CardContent sx={{ padding: 4, textAlign: 'center' }}>
          <Typography variant="h5" fontWeight="bold" gutterBottom>Forgot Password?</Typography>
          <Typography variant="body2" color="text.secondary" mb={3}>
            Enter your email and we'll send you a link to reset your password.
          </Typography>

          {message && <Alert severity="success" sx={{ mb: 2 }}>{message}</Alert>}
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          <form onSubmit={handleSubmit}>
            <TextField 
              fullWidth label="Email Address" type="email" required 
              value={email} onChange={(e) => setEmail(e.target.value)} 
              margin="normal"
            />
            <Button type="submit" fullWidth variant="contained" size="large" sx={{ mt: 2 }} disabled={loading}>
              {loading ? 'Sending...' : 'Send Reset Link'}
            </Button>
          </form>

          <Box mt={2}>
            <Link to="/login" style={{ textDecoration: 'none', fontSize: '0.9rem' }}>Back to Login</Link>
          </Box>
        </CardContent>
      </Card>
    </Container>
  );
};

export default ForgotPassword;






// import React, { useState } from 'react';
// import { Link } from 'react-router-dom';
// import AuthService from '../../services/authService';
// import { Container, Card, CardContent, TextField, Button, Typography, Box, Alert } from '@mui/material';

// const ForgotPassword = () => {
//   const [email, setEmail] = useState('');
//   const [message, setMessage] = useState('');
//   const [error, setError] = useState('');
//   const [loading, setLoading] = useState(false);

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     setLoading(true);
//     setError('');
//     setMessage('');

//     try {
//       const res = await AuthService.forgotPassword(email);
//       setMessage(res.message);
//     } catch (err) {
//       setError(err.response?.data?.message || 'Failed to send reset link');
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <Container maxWidth="xs" sx={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
//       <Card sx={{ width: '100%', boxShadow: 3 }}>
//         <CardContent sx={{ padding: 4, textAlign: 'center' }}>
//           <Typography variant="h5" fontWeight="bold" gutterBottom>Forgot Password?</Typography>
//           <Typography variant="body2" color="text.secondary" mb={3}>
//             Enter your email and we'll send you a link to reset your password.
//           </Typography>

//           {message && <Alert severity="success" sx={{ mb: 2 }}>{message}</Alert>}
//           {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

//           <form onSubmit={handleSubmit}>
//             <TextField 
//               fullWidth label="Email Address" type="email" required 
//               value={email} onChange={(e) => setEmail(e.target.value)} 
//               margin="normal"
//             />
//             <Button type="submit" fullWidth variant="contained" size="large" sx={{ mt: 2 }} disabled={loading}>
//               {loading ? 'Sending...' : 'Send Reset Link'}
//             </Button>
//           </form>

//           <Box mt={2}>
//             <Link to="/login" style={{ textDecoration: 'none', fontSize: '0.9rem' }}>Back to Login</Link>
//           </Box>
//         </CardContent>
//       </Card>
//     </Container>
//   );
// };

// export default ForgotPassword;