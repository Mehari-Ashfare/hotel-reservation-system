import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import apiClient from '../../services/api';
import { Container, Card, CardContent, TextField, Button, Typography, Box, Alert, Grid, MenuItem } from '@mui/material';

const Register = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    sex: '',
    address: '',
    nationality: '',
    id_type: '',
    id_number: '',
    date_of_birth: '',
    password: '',
    confirmPassword: ''
  });

  const [error, setError] = useState(null);
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess('');

    // Frontend Basic Checks
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      // Send all new fields to backend
      const response = await apiClient.post('/auth/register', {
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email,
        phone: formData.phone,
        sex: formData.sex,
        address: formData.address,
        nationality: formData.nationality,
        id_type: formData.id_type,
        id_number: formData.id_number,
        date_of_birth: formData.date_of_birth, // Format: YYYY-MM-DD from date input
        password: formData.password
      });

      if (response.data.success) {
        setSuccess("Account created! Redirecting to login...");
        setTimeout(() => navigate('/login'), 2000);
      }
    } catch (err) {
      console.error("Registration Error:", err);
      
      const backendErrors = err.response?.data?.errors;
      const backendMessage = err.response?.data?.message;

      if (backendErrors && Array.isArray(backendErrors)) {
        setError(
          <ul style={{ margin: 0, paddingLeft: '20px', textAlign: 'left' }}>
            {backendErrors.map((errItem, index) => {
              const text = typeof errItem === 'string' 
                ? errItem 
                : (errItem.msg || errItem.message || JSON.stringify(errItem));
              return <li key={index}>{text}</li>;
            })}
          </ul>
        );
      } else if (backendMessage) {
        setError(backendMessage);
      } else {
        setError("Registration failed. Please check your connection and try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="md" sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', py: 4 }}>
      <Card sx={{ width: '100%', boxShadow: 3 }}>
        <CardContent sx={{ padding: 4 }}>
          <Box sx={{ textAlign: 'center', marginBottom: 3 }}>
            <Typography variant="h5" component="h1" fontWeight="bold" color="primary">
              Create Guest Account
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Join us to book your stay easily
            </Typography>
          </Box>

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

          <form onSubmit={handleSubmit}>
            <Grid container spacing={2}>
              
              {/* --- Personal Information --- */}
              <Grid item xs={12}>
                <Typography variant="subtitle2" sx={{ color: '#666', borderBottom: '1px solid #eee', pb: 1 }}>
                  Personal Information
                </Typography>
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField label="First Name" name="first_name" fullWidth required onChange={handleChange} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField label="Last Name" name="last_name" fullWidth required onChange={handleChange} />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField label="Email Address" name="email" type="email" fullWidth required onChange={handleChange} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField label="Phone Number" name="phone" fullWidth required onChange={handleChange} />
              </Grid>
              <Grid item xs={12} sm={3}>
                <TextField select label="Sex" name="sex" fullWidth required value={formData.sex} onChange={handleChange}>
                  <MenuItem value="M">Male</MenuItem>
                  <MenuItem value="F">Female</MenuItem>
                  <MenuItem value="Other">Other</MenuItem>
                </TextField>
              </Grid>

              <Grid item xs={12}>
                <TextField label="Address" name="address" fullWidth multiline rows={2} onChange={handleChange} />
              </Grid>

              {/* --- Identification (Optional during Signup) --- */}
              <Grid item xs={12} sx={{ mt: 2 }}>
                <Typography variant="subtitle2" sx={{ color: '#666', borderBottom: '1px solid #eee', pb: 1 }}>
                  Identification Details (Optional)
                </Typography>
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField label="Date of Birth" name="date_of_birth" type="date" fullWidth InputLabelProps={{ shrink: true }} onChange={handleChange} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField label="Nationality" name="nationality" fullWidth onChange={handleChange} />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField select label="ID Type" name="id_type" fullWidth value={formData.id_type} onChange={handleChange}>
                  <MenuItem value="">None</MenuItem>
                  <MenuItem value="passport">Passport</MenuItem>
                  <MenuItem value="national_id">National ID</MenuItem>
                  <MenuItem value="driving_license">Driving License</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField label="ID Number" name="id_number" fullWidth onChange={handleChange} />
              </Grid>

              {/* --- Security --- */}
              <Grid item xs={12} sx={{ mt: 2 }}>
                <Typography variant="subtitle2" sx={{ color: '#666', borderBottom: '1px solid #eee', pb: 1 }}>
                  Security
                </Typography>
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField 
                    label="Password" name="password" type="password" fullWidth required 
                    helperText="Min 6 chars, 1 uppercase, 1 number" onChange={handleChange} 
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField label="Confirm Password" name="confirmPassword" type="password" fullWidth required onChange={handleChange} />
              </Grid>

            </Grid>

            <Button type="submit" fullWidth variant="contained" size="large" sx={{ mt: 4 }} disabled={loading}>
              {loading ? 'Creating Account...' : 'Sign Up'}
            </Button>
          </form>

          <Box sx={{ mt: 2, textAlign: 'center' }}>
            <Typography variant="body2">
              Already have an account? <Link to="/login" style={{ textDecoration: 'none', fontWeight: 'bold' }}>Login here</Link>
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Container>
  );
};

export default Register;




// import React, { useState } from 'react';
// import { useNavigate, Link } from 'react-router-dom';
// import apiClient from '../../services/api';
// import { Container, Card, CardContent, TextField, Button, Typography, Box, Alert } from '@mui/material';

// const Register = () => {
//   const navigate = useNavigate();
//   const [formData, setFormData] = useState({
//     name: '',
//     email: '',
//     phone: '',
//     password: '',
//     confirmPassword: ''
//   });

//   // Updated to allow JSX (lists) or Strings
//   const [error, setError] = useState(null);
//   const [success, setSuccess] = useState('');
//   const [loading, setLoading] = useState(false);

//   const handleChange = (e) => {
//     setFormData({ ...formData, [e.target.name]: e.target.value });
//   };

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     setError(null);
//     setSuccess('');

//     // Frontend Basic Checks
//     if (formData.password !== formData.confirmPassword) {
//       setError("Passwords do not match");
//       return;
//     }

//     setLoading(true);
//     try {
//       const response = await apiClient.post('/auth/register', {
//         name: formData.name,
//         email: formData.email,
//         phone: formData.phone,
//         password: formData.password
//       });

//       if (response.data.success) {
//         setSuccess("Account created! Redirecting to login...");
//         setTimeout(() => navigate('/login'), 2000);
//       }
//     } catch (err) {
//       console.error("Registration Error:", err);
      
//       // --- FIX: Handle Detailed Backend Errors ---
//       const backendErrors = err.response?.data?.errors; // This is the list from backend
//       const backendMessage = err.response?.data?.message; // This is the generic message

//       if (backendErrors && Array.isArray(backendErrors)) {
//         // If we have a list of errors, format them as a bulleted list
//         setError(
//           <ul style={{ margin: 0, paddingLeft: '20px', textAlign: 'left' }}>
//             {backendErrors.map((errItem, index) => {
//               // Extract text safely: handle string, .msg, or .message
//               const text = typeof errItem === 'string' 
//                 ? errItem 
//                 : (errItem.msg || errItem.message || JSON.stringify(errItem));
              
//               return <li key={index}>{text}</li>;
//             })}
//           </ul>
//         );
//       } else if (backendMessage) {
//         // Fallback to simple message
//         setError(backendMessage);
//       } else {
//         // Fallback to generic error
//         setError("Registration failed. Please check your connection and try again.");
//       }
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <Container maxWidth="xs" sx={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
//       <Card sx={{ width: '100%', boxShadow: 3 }}>
//         <CardContent sx={{ padding: 4 }}>
//           <Box sx={{ textAlign: 'center', marginBottom: 3 }}>
//             <Typography variant="h5" component="h1" fontWeight="bold" color="primary">
//               Create Account
//             </Typography>
//             <Typography variant="body2" color="text.secondary">
//               Join us to book your stay
//             </Typography>
//           </Box>

//           {/* Alert can now render the List OR the String */}
//           {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
//           {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

//           <form onSubmit={handleSubmit}>
//             <TextField label="Full Name" name="name" fullWidth margin="normal" required onChange={handleChange} />
//             <TextField label="Email Address" name="email" type="email" fullWidth margin="normal" required onChange={handleChange} />
//             <TextField label="Phone Number" name="phone" fullWidth margin="normal" onChange={handleChange} />
            
//             <TextField 
//                 label="Password" 
//                 name="password" 
//                 type="password" 
//                 fullWidth 
//                 margin="normal" 
//                 required 
//                 helperText="Must have 1 uppercase, 1 number, min 6 chars"
//                 onChange={handleChange} 
//             />
            
//             <TextField label="Confirm Password" name="confirmPassword" type="password" fullWidth margin="normal" required onChange={handleChange} />

//             <Button type="submit" fullWidth variant="contained" size="large" sx={{ mt: 3 }} disabled={loading}>
//               {loading ? 'Creating Account...' : 'Sign Up'}
//             </Button>
//           </form>

//           <Box sx={{ mt: 2, textAlign: 'center' }}>
//             <Typography variant="body2">
//               Already have an account? <Link to="/login" style={{ textDecoration: 'none', fontWeight: 'bold' }}>Login here</Link>
//             </Typography>
//           </Box>
//         </CardContent>
//       </Card>
//     </Container>
//   );
// };

// export default Register;