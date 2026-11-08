import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import Login from './pages/Auth/Login';
import Register from './pages/Auth/Register';
import ForgotPassword from './pages/Auth/ForgotPassword'; // Ensure this file exists
import ResetPassword from './pages/Auth/ResetPassword';   // Ensure this file exists
import DashboardLayout from './components/layout/DashboardLayout/DashboardLayout';

// Pages
import Dashboard from './pages/Dashboard/Dashboard';
import Reports from './pages/Reports/Reports';
import AuditLogs from './pages/Admin/AuditLogs';
import StaffList from './pages/Admin/StaffList'; 
import Profile from './pages/Profile/Profile';

import GuestList from './pages/Guests/GuestList';
import AddGuest from './pages/Guests/AddGuest';
import EditGuest from './pages/Guests/EditGuest';

import RoomList from './pages/Rooms/RoomList';
import AddRoom from './pages/Rooms/AddRoom';
import EditRoom from './pages/Rooms/EditRoom';

import ReservationList from './pages/Reservations/ReservationList';
import BookRoom from './pages/Reservations/BookRoom'; // This is the Admin booking tool
import EditReservation from './pages/Reservations/EditReservation'; 

// Guest Portal
import GuestBooking from './pages/Guests/GuestBooking';
import GuestReservation from './pages/Guests/GuestReservation';

//
import PublicLayout from './layouts/PublicLayout'; // IMPORT THIS
import LandingPage from './pages/Public/LandingPage'; // IMPORT THIS

function App() {
  return (
    <AuthProvider>
      <Router>
        <Toaster position="top-right" />
        <Routes>
          {/* --- PUBLIC ROUTES (New!) --- */}
          <Route element={<PublicLayout />}>
            <Route path="/" element={<LandingPage />} />
            {/* We will add /rooms and /booking later */}
          </Route>
          
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password/:token" element={<ResetPassword />} />

          {/* Protected Routes */}
          <Route element={<DashboardLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/profile" element={<Profile />} />
            
            {/* Guest Management */}
            <Route path="/guests" element={<GuestList />} />
            <Route path="/guests/add" element={<AddGuest />} />
            <Route path="/guests/edit/:id" element={<EditGuest />} />
            
            {/* Guest Portal (For Customers) */}
            <Route path="/book-room" element={<GuestBooking />} />
            <Route path="/book-room/:roomId/confirm" element={<GuestReservation />} />
            
            {/* Room Management */}
            <Route path="/rooms" element={<RoomList />} />
            <Route path="/rooms/add" element={<AddRoom />} />
            <Route path="/rooms/edit/:id" element={<EditRoom />} />

            {/* Reservations */}
            <Route path="/reservations" element={<ReservationList />} />
            <Route path="/reservations/new" element={<BookRoom />} />
            <Route path="/reservations/edit/:id" element={<EditReservation />} />
            
            {/* Admin Tools */}
            <Route path="/reports" element={<Reports />} />
            <Route path="/audit" element={<AuditLogs />} />
            <Route path="/staff" element={<StaffList />} />
            
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;






// import React from 'react';
// import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
// import { Toaster } from 'react-hot-toast';
// import { AuthProvider } from './context/AuthContext';
// import Login from './pages/Auth/Login';
// import Register from './pages/Auth/Register';
// import ForgotPassword from './pages/Auth/ForgotPassword'; // Ensure this file exists
// import ResetPassword from './pages/Auth/ResetPassword';   // Ensure this file exists
// import DashboardLayout from './components/layout/DashboardLayout/DashboardLayout';

// // Pages
// import Dashboard from './pages/Dashboard/Dashboard';
// import Reports from './pages/Reports/Reports';
// import AuditLogs from './pages/Admin/AuditLogs';
// import StaffList from './pages/Admin/StaffList'; 
// import Profile from './pages/Profile/Profile';

// import GuestList from './pages/Guests/GuestList';
// import AddGuest from './pages/Guests/AddGuest';
// import EditGuest from './pages/Guests/EditGuest';

// import RoomList from './pages/Rooms/RoomList';
// import AddRoom from './pages/Rooms/AddRoom';
// import EditRoom from './pages/Rooms/EditRoom';

// import ReservationList from './pages/Reservations/ReservationList';
// import BookRoom from './pages/Reservations/BookRoom'; // This is the Admin booking tool
// import EditReservation from './pages/Reservations/EditReservation'; 

// // Guest Portal
// import GuestBooking from './pages/Guests/GuestBooking';
// import GuestReservation from './pages/Guests/GuestReservation';

// function App() {
//   return (
//     <AuthProvider>
//       <Router>
//         <Toaster position="top-right" />
//         <Routes>
//           {/* Public Routes */}
//           <Route path="/login" element={<Login />} />
//           <Route path="/register" element={<Register />} />
//           <Route path="/forgot-password" element={<ForgotPassword />} />
//           <Route path="/reset-password/:token" element={<ResetPassword />} />

//           {/* Protected Routes */}
//           <Route element={<DashboardLayout />}>
//             <Route path="/dashboard" element={<Dashboard />} />
//             <Route path="/profile" element={<Profile />} />
            
//             {/* Guest Management */}
//             <Route path="/guests" element={<GuestList />} />
//             <Route path="/guests/add" element={<AddGuest />} />
//             <Route path="/guests/edit/:id" element={<EditGuest />} />
            
//             {/* Guest Portal (For Customers) */}
//             <Route path="/book-room" element={<GuestBooking />} />
//             <Route path="/book-room/:roomId/confirm" element={<GuestReservation />} />
            
//             {/* Room Management */}
//             <Route path="/rooms" element={<RoomList />} />
//             <Route path="/rooms/add" element={<AddRoom />} />
//             <Route path="/rooms/edit/:id" element={<EditRoom />} />

//             {/* Reservations */}
//             <Route path="/reservations" element={<ReservationList />} />
//             <Route path="/reservations/new" element={<BookRoom />} />
//             <Route path="/reservations/edit/:id" element={<EditReservation />} />
            
//             {/* Admin Tools */}
//             <Route path="/reports" element={<Reports />} />
//             <Route path="/audit" element={<AuditLogs />} />
//             <Route path="/staff" element={<StaffList />} />
            
//             <Route path="/" element={<Navigate to="/dashboard" replace />} />
//           </Route>
//         </Routes>
//       </Router>
//     </AuthProvider>
//   );
// }

// export default App;