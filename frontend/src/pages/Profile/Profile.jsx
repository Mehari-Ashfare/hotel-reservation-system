import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import AuthService from '../../services/authService'; 
import { 
  Paper, Typography, Box, Divider, Avatar, Grid, 
  Button, TextField, Tabs, Tab, Alert, CircularProgress 
} from '@mui/material';
import { Person, Edit, Lock, Save, AccountCircle } from '@mui/icons-material';
import toast from 'react-hot-toast';

const Profile = () => {
  const { user: contextUser } = useAuth(); // Keep context user for initial fallback
  const [profile, setProfile] = useState(null); // Stores full profile from DB
  const [loading, setLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0); // 0=Details, 1=Edit, 2=Password

  // Edit Form State
  const [editData, setEditData] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    address: ''
  });

  // Password Form State
  const [passData, setPassData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Fetch Full Profile on Mount
  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        setLoading(true);
        const response = await AuthService.getProfile();
        const data = response.data;
        setProfile(data);
        
        // Initialize edit form with existing data
        setEditData({
          first_name: data.first_name || '',
          last_name: data.last_name || '',
          phone: data.phone || '',
          address: data.address || ''
        });
      } catch (error) {
        console.error("Error loading profile", error);
        toast.error("Could not load full profile details");
      } finally {
        setLoading(false);
      }
    };

    fetchProfileData();
  }, []);

  // Handle Tab Change
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  // Handle Profile Update Submit
  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    try {
      const response = await AuthService.updateProfile(editData);
      setProfile(response.data); // Update the view with new data
      toast.success("Profile updated successfully!");
      setTabValue(0); // Switch back to view mode
    } catch (error) {
      toast.error(error.response?.data?.message || "Update failed");
    }
  };

  // Handle Password Change Submit
  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (passData.newPassword !== passData.confirmPassword) {
      return toast.error("New passwords do not match");
    }
    if (passData.newPassword.length < 6) {
      return toast.error("Password must be at least 6 characters");
    }

    try {
      await AuthService.changePassword(
        passData.currentPassword,
        passData.newPassword,
        passData.confirmPassword
      );
      toast.success("Password changed successfully");
      setPassData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setTabValue(0); // Switch back to view mode
    } catch (error) {
      toast.error(error.response?.data?.message || "Password change failed");
    }
  };

  if (loading) return <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress /></Box>;
  
  // Use profile from DB, fallback to context if needed (safety)
  const userData = profile || contextUser || {};
  
  // Determine user role styling
  const role = (userData.role || '').toLowerCase();
  const isGuest = role === 'guest';
  const roleColor = isGuest ? '#4caf50' : '#1976d2'; 
  const displayName = `${userData.first_name || ''} ${userData.last_name || ''}`.trim() || userData.email || 'User';
  const displayInitial = displayName.charAt(0).toUpperCase();

  return (
    <div style={{ padding: '20px' }}>
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 'bold', color: '#333' }}>
        My Profile
      </Typography>

      <Grid container spacing={4}>
        {/* Left Column: ID Card */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 4, textAlign: 'center', height: '100%' }}>
            <Avatar sx={{ 
              width: 120, height: 120, 
              bgcolor: roleColor, 
              margin: '0 auto',
              fontSize: '3rem',
              boxShadow: 3
            }}>
              {displayInitial}
            </Avatar>
            <Typography variant="h5" sx={{ mt: 2, fontWeight: 'bold' }}>
              {displayName}
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
              {userData.email}
            </Typography>
            
            <Box sx={{ 
              display: 'inline-block', 
              px: 2, py: 0.5, 
              bgcolor: roleColor + '20', 
              color: roleColor, 
              borderRadius: '16px',
              fontWeight: 'bold',
              textTransform: 'uppercase',
              fontSize: '0.8rem'
            }}>
              {role || 'Unknown'}
            </Box>

            <Divider sx={{ my: 3 }} />
            
            {isGuest ? (
                 <Typography variant="body2" color="text.secondary">
                   👋 Welcome back! Keep your contact details updated for a smooth check-in experience.
                 </Typography>
              ) : (
                 <Typography variant="body2" color="text.secondary">
                   💼 Staff Account: Access level granted based on assigned role permissions.
                 </Typography>
              )}
          </Paper>
        </Grid>

        {/* Right Column: Actions Tabs */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ width: '100%', minHeight: '400px' }}>
            <Tabs 
              value={tabValue} 
              onChange={handleTabChange} 
              indicatorColor="primary" 
              textColor="primary"
              variant="fullWidth"
              sx={{ borderBottom: 1, borderColor: 'divider' }}
            >
              <Tab icon={<AccountCircle />} label="Details" iconPosition="start"/>
              <Tab icon={<Edit />} label="Edit Profile" iconPosition="start"/>
              <Tab icon={<Lock />} label="Security" iconPosition="start"/>
            </Tabs>
            
            <Box sx={{ p: 4 }}>
              
              {/* TAB 0: VIEW DETAILS */}
              {tabValue === 0 && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <Typography variant="h6">Account Information</Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="caption" color="text.secondary">First Name</Typography>
                      <Typography variant="body1" sx={{ fontWeight: 500 }}>{userData.first_name || '-'}</Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="caption" color="text.secondary">Last Name</Typography>
                      <Typography variant="body1" sx={{ fontWeight: 500 }}>{userData.last_name || '-'}</Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="caption" color="text.secondary">Email Address</Typography>
                      <Typography variant="body1" sx={{ fontWeight: 500 }}>{userData.email}</Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="caption" color="text.secondary">Phone Number</Typography>
                      <Typography variant="body1" sx={{ fontWeight: 500 }}>{userData.phone || 'Not set'}</Typography>
                    </Grid>
                    {isGuest && (
                      <Grid item xs={12}>
                        <Typography variant="caption" color="text.secondary">Address</Typography>
                        <Typography variant="body1" sx={{ fontWeight: 500 }}>{userData.address || 'Not set'}</Typography>
                      </Grid>
                    )}
                    <Grid item xs={12}>
                      <Typography variant="caption" color="text.secondary">User ID</Typography>
                      <Typography variant="body1" sx={{ fontFamily: 'monospace' }}>#{userData.id || userData.user_id}</Typography>
                    </Grid>
                  </Grid>
                </Box>
              )}

              {/* TAB 1: EDIT FORM */}
              {tabValue === 1 && (
                <form onSubmit={handleUpdateProfile}>
                  <Typography variant="h6" sx={{ mb: 3 }}>Update Information</Typography>
                  <Grid container spacing={3}>
                    <Grid item xs={12} sm={6}>
                      <TextField 
                        fullWidth label="First Name" variant="outlined"
                        value={editData.first_name} 
                        onChange={(e) => setEditData({...editData, first_name: e.target.value})}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField 
                        fullWidth label="Last Name" variant="outlined"
                        value={editData.last_name} 
                        onChange={(e) => setEditData({...editData, last_name: e.target.value})}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField 
                        fullWidth label="Phone Number" variant="outlined"
                        value={editData.phone} 
                        onChange={(e) => setEditData({...editData, phone: e.target.value})}
                        placeholder="+1 234 567 8900"
                      />
                    </Grid>
                    {isGuest && (
                      <Grid item xs={12}>
                        <TextField 
                          fullWidth label="Home Address" variant="outlined"
                          multiline rows={2}
                          value={editData.address} 
                          onChange={(e) => setEditData({...editData, address: e.target.value})}
                        />
                      </Grid>
                    )}
                    <Grid item xs={12} sx={{ mt: 1, textAlign: 'right' }}>
                      <Button type="submit" variant="contained" startIcon={<Save />} size="large">
                        Save Changes
                      </Button>
                    </Grid>
                  </Grid>
                </form>
              )}

              {/* TAB 2: SECURITY FORM */}
              {tabValue === 2 && (
                <form onSubmit={handlePasswordChange}>
                  <Typography variant="h6" sx={{ mb: 2 }}>Change Password</Typography>
                  <Alert severity="info" sx={{ mb: 3 }}>
                    Please enter your current password to verify your identity before making changes.
                  </Alert>
                  
                  <Grid container spacing={3}>
                    <Grid item xs={12}>
                      <TextField 
                        fullWidth type="password" label="Current Password" required
                        value={passData.currentPassword}
                        onChange={(e) => setPassData({...passData, currentPassword: e.target.value})}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField 
                        fullWidth type="password" label="New Password" required
                        value={passData.newPassword}
                        onChange={(e) => setPassData({...passData, newPassword: e.target.value})}
                        helperText="Must be at least 6 characters long"
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField 
                        fullWidth type="password" label="Confirm New Password" required
                        value={passData.confirmPassword}
                        onChange={(e) => setPassData({...passData, confirmPassword: e.target.value})}
                      />
                    </Grid>
                    <Grid item xs={12} sx={{ mt: 1, textAlign: 'right' }}>
                      <Button type="submit" variant="contained" color="warning" startIcon={<Lock />} size="large">
                        Update Password
                      </Button>
                    </Grid>
                  </Grid>
                </form>
              )}

            </Box>
          </Paper>
        </Grid>
      </Grid>
    </div>
  );
};

export default Profile;





// import React, { useState, useEffect } from 'react';
// import { useAuth } from '../../context/AuthContext';
// import AuthService from '../../services/authService'; 
// import { 
//   Paper, Typography, Box, Divider, Avatar, Grid, 
//   Button, TextField, Tabs, Tab, Alert, CircularProgress 
// } from '@mui/material';
// import { Person, Edit, Lock, Save, AccountCircle } from '@mui/icons-material';
// import toast from 'react-hot-toast';

// const Profile = () => {
//   const { user: contextUser } = useAuth(); // Keep context user for initial fallback
//   const [profile, setProfile] = useState(null); // Stores full profile from DB
//   const [loading, setLoading] = useState(true);
//   const [tabValue, setTabValue] = useState(0); // 0=Details, 1=Edit, 2=Password

//   // Edit Form State
//   const [editData, setEditData] = useState({
//     first_name: '',
//     last_name: '',
//     phone: '',
//     address: ''
//   });

//   // Password Form State
//   const [passData, setPassData] = useState({
//     currentPassword: '',
//     newPassword: '',
//     confirmPassword: ''
//   });

//   // Fetch Full Profile on Mount
//   useEffect(() => {
//     const fetchProfileData = async () => {
//       try {
//         setLoading(true);
//         const response = await AuthService.getProfile();
//         const data = response.data;
//         setProfile(data);
        
//         // Initialize edit form with existing data
//         setEditData({
//           first_name: data.first_name || '',
//           last_name: data.last_name || '',
//           phone: data.phone || '',
//           address: data.address || ''
//         });
//       } catch (error) {
//         console.error("Error loading profile", error);
//         toast.error("Could not load full profile details");
//       } finally {
//         setLoading(false);
//       }
//     };

//     fetchProfileData();
//   }, []);

//   // Handle Tab Change
//   const handleTabChange = (event, newValue) => {
//     setTabValue(newValue);
//   };

//   // Handle Profile Update Submit
//   const handleUpdateProfile = async (e) => {
//     e.preventDefault();
//     try {
//       const response = await AuthService.updateProfile(editData);
//       setProfile(response.data); // Update the view with new data
//       toast.success("Profile updated successfully!");
//       setTabValue(0); // Switch back to view mode
//     } catch (error) {
//       toast.error(error.response?.data?.message || "Update failed");
//     }
//   };

//   // Handle Password Change Submit
//   const handlePasswordChange = async (e) => {
//     e.preventDefault();
//     if (passData.newPassword !== passData.confirmPassword) {
//       return toast.error("New passwords do not match");
//     }
//     if (passData.newPassword.length < 6) {
//       return toast.error("Password must be at least 6 characters");
//     }

//     try {
//       await AuthService.changePassword(
//         passData.currentPassword,
//         passData.newPassword,
//         passData.confirmPassword
//       );
//       toast.success("Password changed successfully");
//       setPassData({ currentPassword: '', newPassword: '', confirmPassword: '' });
//       setTabValue(0); // Switch back to view mode
//     } catch (error) {
//       toast.error(error.response?.data?.message || "Password change failed");
//     }
//   };

//   if (loading) return <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress /></Box>;
  
//   // Use profile from DB, fallback to context if needed (safety)
//   const userData = profile || contextUser || {};
  
//   // Determine user role styling
//   const role = (userData.role || '').toLowerCase();
//   const isGuest = role === 'guest';
//   const roleColor = isGuest ? '#4caf50' : '#1976d2'; 
//   const displayName = `${userData.first_name || ''} ${userData.last_name || ''}`.trim() || userData.email || 'User';
//   const displayInitial = displayName.charAt(0).toUpperCase();

//   return (
//     <div style={{ padding: '20px' }}>
//       <Typography variant="h4" sx={{ mb: 3, fontWeight: 'bold', color: '#333' }}>
//         My Profile
//       </Typography>

//       <Grid container spacing={4}>
//         {/* Left Column: ID Card */}
//         <Grid item xs={12} md={4}>
//           <Paper sx={{ p: 4, textAlign: 'center', height: '100%' }}>
//             <Avatar sx={{ 
//               width: 120, height: 120, 
//               bgcolor: roleColor, 
//               margin: '0 auto',
//               fontSize: '3rem',
//               boxShadow: 3
//             }}>
//               {displayInitial}
//             </Avatar>
//             <Typography variant="h5" sx={{ mt: 2, fontWeight: 'bold' }}>
//               {displayName}
//             </Typography>
//             <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
//               {userData.email}
//             </Typography>
            
//             <Box sx={{ 
//               display: 'inline-block', 
//               px: 2, py: 0.5, 
//               bgcolor: roleColor + '20', 
//               color: roleColor, 
//               borderRadius: '16px',
//               fontWeight: 'bold',
//               textTransform: 'uppercase',
//               fontSize: '0.8rem'
//             }}>
//               {role || 'Unknown'}
//             </Box>

//             <Divider sx={{ my: 3 }} />
            
//             {isGuest ? (
//                  <Typography variant="body2" color="text.secondary">
//                    👋 Welcome back! Keep your contact details updated for a smooth check-in experience.
//                  </Typography>
//               ) : (
//                  <Typography variant="body2" color="text.secondary">
//                    💼 Staff Account: Access level granted based on assigned role permissions.
//                  </Typography>
//               )}
//           </Paper>
//         </Grid>

//         {/* Right Column: Actions Tabs */}
//         <Grid item xs={12} md={8}>
//           <Paper sx={{ width: '100%', minHeight: '400px' }}>
//             <Tabs 
//               value={tabValue} 
//               onChange={handleTabChange} 
//               indicatorColor="primary" 
//               textColor="primary"
//               variant="fullWidth"
//               sx={{ borderBottom: 1, borderColor: 'divider' }}
//             >
//               <Tab icon={<AccountCircle />} label="Details" iconPosition="start"/>
//               <Tab icon={<Edit />} label="Edit Profile" iconPosition="start"/>
//               <Tab icon={<Lock />} label="Security" iconPosition="start"/>
//             </Tabs>
            
//             <Box sx={{ p: 4 }}>
              
//               {/* TAB 0: VIEW DETAILS */}
//               {tabValue === 0 && (
//                 <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
//                   <Typography variant="h6">Account Information</Typography>
//                   <Grid container spacing={2}>
//                     <Grid item xs={12} sm={6}>
//                       <Typography variant="caption" color="text.secondary">First Name</Typography>
//                       <Typography variant="body1" sx={{ fontWeight: 500 }}>{userData.first_name || '-'}</Typography>
//                     </Grid>
//                     <Grid item xs={12} sm={6}>
//                       <Typography variant="caption" color="text.secondary">Last Name</Typography>
//                       <Typography variant="body1" sx={{ fontWeight: 500 }}>{userData.last_name || '-'}</Typography>
//                     </Grid>
//                     <Grid item xs={12} sm={6}>
//                       <Typography variant="caption" color="text.secondary">Email Address</Typography>
//                       <Typography variant="body1" sx={{ fontWeight: 500 }}>{userData.email}</Typography>
//                     </Grid>
//                     <Grid item xs={12} sm={6}>
//                       <Typography variant="caption" color="text.secondary">Phone Number</Typography>
//                       <Typography variant="body1" sx={{ fontWeight: 500 }}>{userData.phone || 'Not set'}</Typography>
//                     </Grid>
//                     {isGuest && (
//                       <Grid item xs={12}>
//                         <Typography variant="caption" color="text.secondary">Address</Typography>
//                         <Typography variant="body1" sx={{ fontWeight: 500 }}>{userData.address || 'Not set'}</Typography>
//                       </Grid>
//                     )}
//                     <Grid item xs={12}>
//                       <Typography variant="caption" color="text.secondary">User ID</Typography>
//                       <Typography variant="body1" sx={{ fontFamily: 'monospace' }}>#{userData.id || userData.user_id}</Typography>
//                     </Grid>
//                   </Grid>
//                 </Box>
//               )}

//               {/* TAB 1: EDIT FORM */}
//               {tabValue === 1 && (
//                 <form onSubmit={handleUpdateProfile}>
//                   <Typography variant="h6" sx={{ mb: 3 }}>Update Information</Typography>
//                   <Grid container spacing={3}>
//                     <Grid item xs={12} sm={6}>
//                       <TextField 
//                         fullWidth label="First Name" variant="outlined"
//                         value={editData.first_name} 
//                         onChange={(e) => setEditData({...editData, first_name: e.target.value})}
//                       />
//                     </Grid>
//                     <Grid item xs={12} sm={6}>
//                       <TextField 
//                         fullWidth label="Last Name" variant="outlined"
//                         value={editData.last_name} 
//                         onChange={(e) => setEditData({...editData, last_name: e.target.value})}
//                       />
//                     </Grid>
//                     <Grid item xs={12}>
//                       <TextField 
//                         fullWidth label="Phone Number" variant="outlined"
//                         value={editData.phone} 
//                         onChange={(e) => setEditData({...editData, phone: e.target.value})}
//                         placeholder="+1 234 567 8900"
//                       />
//                     </Grid>
//                     {isGuest && (
//                       <Grid item xs={12}>
//                         <TextField 
//                           fullWidth label="Home Address" variant="outlined"
//                           multiline rows={2}
//                           value={editData.address} 
//                           onChange={(e) => setEditData({...editData, address: e.target.value})}
//                         />
//                       </Grid>
//                     )}
//                     <Grid item xs={12} sx={{ mt: 1, textAlign: 'right' }}>
//                       <Button type="submit" variant="contained" startIcon={<Save />} size="large">
//                         Save Changes
//                       </Button>
//                     </Grid>
//                   </Grid>
//                 </form>
//               )}

//               {/* TAB 2: SECURITY FORM */}
//               {tabValue === 2 && (
//                 <form onSubmit={handlePasswordChange}>
//                   <Typography variant="h6" sx={{ mb: 2 }}>Change Password</Typography>
//                   <Alert severity="info" sx={{ mb: 3 }}>
//                     Please enter your current password to verify your identity before making changes.
//                   </Alert>
                  
//                   <Grid container spacing={3}>
//                     <Grid item xs={12}>
//                       <TextField 
//                         fullWidth type="password" label="Current Password" required
//                         value={passData.currentPassword}
//                         onChange={(e) => setPassData({...passData, currentPassword: e.target.value})}
//                       />
//                     </Grid>
//                     <Grid item xs={12}>
//                       <TextField 
//                         fullWidth type="password" label="New Password" required
//                         value={passData.newPassword}
//                         onChange={(e) => setPassData({...passData, newPassword: e.target.value})}
//                         helperText="Must be at least 6 characters long"
//                       />
//                     </Grid>
//                     <Grid item xs={12}>
//                       <TextField 
//                         fullWidth type="password" label="Confirm New Password" required
//                         value={passData.confirmPassword}
//                         onChange={(e) => setPassData({...passData, confirmPassword: e.target.value})}
//                       />
//                     </Grid>
//                     <Grid item xs={12} sx={{ mt: 1, textAlign: 'right' }}>
//                       <Button type="submit" variant="contained" color="warning" startIcon={<Lock />} size="large">
//                         Update Password
//                       </Button>
//                     </Grid>
//                   </Grid>
//                 </form>
//               )}

//             </Box>
//           </Paper>
//         </Grid>
//       </Grid>
//     </div>
//   );
// };

// export default Profile;







// import React from 'react';
// import { useAuth } from '../../context/AuthContext';
// import { Paper, Typography, Box, Divider, Avatar, Grid } from '@mui/material';
// import { Person } from '@mui/icons-material';

// const Profile = () => {
//   const { user } = useAuth();
  
//   // Safety Check: If user is not loaded yet, don't crash
//   if (!user) return <div style={{ padding: '20px' }}>Loading profile...</div>;

//   // Determine user type (Case insensitive check)
//   const role = (user.role || '').toLowerCase();
//   const isGuest = role === 'guest';
//   const roleColor = isGuest ? '#4caf50' : '#1976d2'; 

//   // Safe Name Display (Prevents White Screen if name is missing)
//   const displayName = user.name || user.username || user.email || 'User';
//   const displayInitial = displayName.charAt(0).toUpperCase();

//   return (
//     <div style={{ padding: '20px' }}>
//       <Typography variant="h4" sx={{ mb: 3, fontWeight: 'bold', color: '#333' }}>
//         My Profile
//       </Typography>

//       <Paper sx={{ p: 4, maxWidth: '800px' }}>
//         <Grid container spacing={4} alignItems="center">
//           {/* Avatar Section */}
//           <Grid item xs={12} sm={4} sx={{ textAlign: 'center' }}>
//             <Avatar sx={{ 
//               width: 100, height: 100, 
//               bgcolor: roleColor, 
//               margin: '0 auto',
//               fontSize: '2.5rem'
//             }}>
//               {displayInitial}
//             </Avatar>
//             <Typography variant="h6" sx={{ mt: 2, fontWeight: 'bold' }}>
//               {displayName}
//             </Typography>
//             <Box sx={{ 
//               display: 'inline-block', 
//               px: 2, py: 0.5, mt: 1, 
//               bgcolor: roleColor + '20', 
//               color: roleColor, 
//               borderRadius: '16px',
//               fontWeight: 'bold',
//               textTransform: 'uppercase',
//               fontSize: '0.8rem'
//             }}>
//               {role || 'Unknown'}
//             </Box>
//           </Grid>

//           {/* Details Section */}
//           <Grid item xs={12} sm={8}>
//             <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
//               <div>
//                 <Typography variant="caption" color="text.secondary">Email Address</Typography>
//                 <Typography variant="body1">{user.email}</Typography>
//               </div>
              
//               <Divider />
              
//               <div>
//                 <Typography variant="caption" color="text.secondary">User ID</Typography>
//                 <Typography variant="body1">#{user.user_id || user.id || 'N/A'}</Typography>
//               </div>

//               <Divider />

//               {/* Extra info based on role */}
//               {isGuest ? (
//                  <Box sx={{ bgcolor: '#f9f9f9', p: 2, borderRadius: 1 }}>
//                     <Typography variant="body2" color="text.secondary">
//                       👋 Welcome! You can view your account details here.
//                     </Typography>
//                  </Box>
//               ) : (
//                  <Box sx={{ bgcolor: '#f1f8e9', p: 2, borderRadius: 1 }}>
//                     <Typography variant="body2" color="text.secondary">
//                       💼 Staff Account: Access level granted based on role.
//                     </Typography>
//                  </Box>
//               )}
//             </Box>
//           </Grid>
//         </Grid>
//       </Paper>
//     </div>
//   );
// };

// export default Profile;
