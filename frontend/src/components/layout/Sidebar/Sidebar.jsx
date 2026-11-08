import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Toolbar, Divider } from '@mui/material';
import { 
  Dashboard, People, Hotel, CalendarToday, Assessment, Security, Badge, Person, BedroomParent
} from '@mui/icons-material';
import { useAuth } from '../../../context/AuthContext'; 

const drawerWidth = 240;

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth(); 

  // Normalize role to lowercase to avoid "Guest" vs "guest" issues
  const role = (user?.role || '').toLowerCase();

  let menuItems = [];

  // --- LOGIC: SPLIT MENUS BASED ON ROLE ---

  if (role === 'guest') {
    // 1. GUEST MENU (Restricted View)
    // They only see booking capabilities and their own profile
    menuItems = [
       { text: 'Book a Room', icon: <BedroomParent />, path: '/book-room' }, // New Page for Guests
       { text: 'My Profile',  icon: <Person />,        path: '/profile' }
    ];
  } else {
    // 2. STAFF MENU (Receptionist & Admin)
    // They see the operational tools
    menuItems = [
      { text: 'Dashboard',    icon: <Dashboard />,     path: '/dashboard' },
      { text: 'Guests',       icon: <People />,        path: '/guests' },
      { text: 'Rooms',        icon: <Hotel />,         path: '/rooms' }, // This is for Managing rooms
      { text: 'Reservations', icon: <CalendarToday />, path: '/reservations' },
      { text: 'My Profile',   icon: <Person />,        path: '/profile' },
    ];

    // 3. ADMIN EXTRAS
    if (role === 'admin') {
      menuItems.push({ text: 'Reports',    icon: <Assessment />, path: '/reports' });
      menuItems.push({ text: 'Staff',      icon: <Badge />,      path: '/staff' }); 
      menuItems.push({ text: 'Audit Logs', icon: <Security />,   path: '/audit' });
    }
  }

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        '& .MuiDrawer-paper': { width: drawerWidth, boxSizing: 'border-box' },
      }}
    >
      <Toolbar sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', py: 2, color: 'primary.main' }}>
        <div style={{ fontWeight: 'bold', fontSize: '1.2rem' }}>
            {role === 'guest' ? 'GUEST PORTAL' : 'HOTEL ADMIN'}
        </div>
        <div style={{ fontSize: '0.7rem', color: '#999', marginTop: '4px', textTransform: 'uppercase' }}>
            {role}
        </div>
      </Toolbar>
      <Divider />
      <List>
        {menuItems.map((item) => (
          <ListItem key={item.text} disablePadding>
            <ListItemButton 
              onClick={() => navigate(item.path)}
              selected={location.pathname.startsWith(item.path)}
            >
              <ListItemIcon color={location.pathname.startsWith(item.path) ? "primary" : "inherit"}>
                {item.icon}
              </ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Drawer>
  );
};

export default Sidebar;
