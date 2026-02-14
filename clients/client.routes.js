import express from 'express';
import auth from '../middlewares/auth.middleware.js';
import controller from './client.controller.js';

const router = express.Router();

router.get('/services', controller.getServices);

router.post('/cart/add', auth, controller.addToCart);
router.get('/cart', auth, controller.getCart);
router.delete('/cart/remove/:serviceId', auth, controller.removeFromCart);

router.post('/appointments/book', auth, controller.bookAppointment);
router.get('/appointments/my', auth, controller.myAppointments);

export default router;
