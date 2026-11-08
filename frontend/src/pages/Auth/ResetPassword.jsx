import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AuthService from '../../services/authService';
import { Container, Card, CardContent, TextField, Button, Typography, Alert } from '@mui/material';

const ResetPassword = () => {
  const { token } = useParams(); // Get token from URL
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({ newPassword: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.newPassword !== formData.confirmPassword) return setError("Passwords do not match");
    
    setLoading(true);
    setError('');

    try {
      const res = await AuthService.resetPassword(token, formData.newPassword, formData.confirmPassword);
      setSuccess(res.message);
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Reset failed. Token may be invalid or expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="xs" sx={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Card sx={{ width: '100%', boxShadow: 3 }}>
        <CardContent sx={{ padding: 4 }}>
          <Typography variant="h5" textAlign="center" fontWeight="bold" gutterBottom>Reset Password</Typography>
          
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

          <form onSubmit={handleSubmit}>
            <TextField 
              fullWidth label="New Password" type="password" required margin="normal"
              value={formData.newPassword} 
              onChange={(e) => setFormData({...formData, newPassword: e.target.value})}
            />
            <TextField 
              fullWidth label="Confirm Password" type="password" required margin="normal"
              value={formData.confirmPassword} 
              onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
            />
            <Button type="submit" fullWidth variant="contained" size="large" sx={{ mt: 2 }} disabled={loading}>
              {loading ? 'Reseting...' : 'Set New Password'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </Container>
  );
};

export default ResetPassword;



// import React, { useState } from 'react';
// import { useNavigate, useParams } from 'react-router-dom';
// import AuthService from '../../services/authService';
// import { Container, Card, CardContent, TextField, Button, Typography, Alert } from '@mui/material';

// const ResetPassword = () => {
//   const { token } = useParams(); // Get token from URL
//   const navigate = useNavigate();
  
//   const [formData, setFormData] = useState({ newPassword: '', confirmPassword: '' });
//   const [error, setError] = useState('');
//   const [success, setSuccess] = useState('');
//   const [loading, setLoading] = useState(false);

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     if (formData.newPassword !== formData.confirmPassword) return setError("Passwords do not match");
    
//     setLoading(true);
//     setError('');

//     try {
//       const res = await AuthService.resetPassword(token, formData.newPassword, formData.confirmPassword);
//       setSuccess(res.message);
//       setTimeout(() => navigate('/login'), 3000);
//     } catch (err) {
//       setError(err.response?.data?.message || 'Reset failed. Token may be invalid or expired.');
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <Container maxWidth="xs" sx={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
//       <Card sx={{ width: '100%', boxShadow: 3 }}>
//         <CardContent sx={{ padding: 4 }}>
//           <Typography variant="h5" textAlign="center" fontWeight="bold" gutterBottom>Reset Password</Typography>
          
//           {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
//           {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

//           <form onSubmit={handleSubmit}>
//             <TextField 
//               fullWidth label="New Password" type="password" required margin="normal"
//               value={formData.newPassword} 
//               onChange={(e) => setFormData({...formData, newPassword: e.target.value})}
//             />
//             <TextField 
//               fullWidth label="Confirm Password" type="password" required margin="normal"
//               value={formData.confirmPassword} 
//               onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
//             />
//             <Button type="submit" fullWidth variant="contained" size="large" sx={{ mt: 2 }} disabled={loading}>
//               {loading ? 'Reseting...' : 'Set New Password'}
//             </Button>
//           </form>
//         </CardContent>
//       </Card>
//     </Container>
//   );
// };

// export default ResetPassword;