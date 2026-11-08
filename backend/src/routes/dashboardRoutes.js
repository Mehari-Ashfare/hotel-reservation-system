import { Router } from 'express';
import DashboardController from '../controllers/dashboardController.js';
import AuthMiddleware from '../middleware/authMiddleware.js';

const router = Router();

// Protect these routes - only logged in users can see stats
router.get('/summary', AuthMiddleware.authenticate, DashboardController.getSummary);
router.get('/revenue-chart', AuthMiddleware.authenticate, DashboardController.getRevenueChart);

export default router;



// import { Router } from 'express';
// import DashboardController from '../controllers/dashboardController.js';
// import AuthMiddleware from '../middleware/authMiddleware.js';
// import ErrorMiddleware from '../middleware/errorMiddleware.js';

// const router = Router();

// // Only authenticated staff can see the dashboard stats
// router.use(AuthMiddleware.authenticate);

// router.get(
//   '/', 
//   ErrorMiddleware.asyncHandler(DashboardController.getSummary)
// );

// export default router;
