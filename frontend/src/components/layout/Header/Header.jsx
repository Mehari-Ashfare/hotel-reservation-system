import React, { useState, useEffect } from 'react';
import { AppBar, Toolbar, Typography, IconButton, Menu, MenuItem, Box, Avatar } from '@mui/material';
import { AccountCircle, Menu as MenuIcon } from '@mui/icons-material';
import { useAuth } from '../../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../../services/api';

const Header = ({ title, onMenuClick }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState(null);
  const [staffInfo, setStaffInfo] = useState(null);

  // Normalize role safely
  const role = (user?.role || '').toLowerCase();

  useEffect(() => {
    // FIX: ONLY fetch staff info if the user is NOT a guest
    if (user && role !== 'guest' && role !== '') {
      const fetchStaffProfile = async () => {
        try {
          const response = await apiClient.get('/staff/profile');
          setStaffInfo(response.data.data || response.data);
        } catch (error) {
          // Silent fail is better here than an alert
          console.warn("Could not load staff profile (Ignore if Admin/Guest)");
        }
      };
      fetchStaffProfile();
    }
  }, [user, role]);

  const handleMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    handleClose();
    logout();
    navigate('/login');
  };

  const handleProfile = () => {
    handleClose();
    navigate('/profile');
  };

  // Determine Display Name
  const displayName = staffInfo 
    ? `${staffInfo.first_name} ${staffInfo.last_name}` 
    : (user?.name || user?.username || 'User');

  return (
    <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
      <Toolbar>
        <IconButton
          color="inherit"
          aria-label="open drawer"
          edge="start"
          onClick={onMenuClick}
          sx={{ mr: 2, display: { sm: 'none' } }}
        >
          <MenuIcon />
        </IconButton>

        <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
          {title || `Welcome, ${displayName}`}
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center' }}>
            {/* Visual Indicator for Guests */}
            {role === 'guest' && (
                <Typography variant="subtitle2" sx={{ mr: 2, backgroundColor: 'rgba(255,255,255,0.2)', padding: '2px 8px', borderRadius: '4px' }}>
                    GUEST PORTAL
                </Typography>
            )}
            
            <IconButton
              size="large"
              aria-label="account of current user"
              aria-controls="menu-appbar"
              aria-haspopup="true"
              onClick={handleMenu}
              color="inherit"
            >
              {user?.name ? (
                  <Avatar sx={{ width: 32, height: 32, bgcolor: role === 'guest' ? '#4caf50' : '#f50057' }}>
                      {user.name.charAt(0).toUpperCase()}
                  </Avatar>
              ) : (
                  <AccountCircle />
              )}
            </IconButton>
            <Menu
              id="menu-appbar"
              anchorEl={anchorEl}
              anchorOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
              keepMounted
              transformOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
              open={Boolean(anchorEl)}
              onClose={handleClose}
            >
              <MenuItem onClick={handleProfile}>My Profile</MenuItem>
              <MenuItem onClick={handleLogout}>Logout</MenuItem>
            </Menu>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Header;
