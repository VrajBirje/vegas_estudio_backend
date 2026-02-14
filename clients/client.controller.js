import service from './client.service.js';

export default {
  getServices: async (req, res) => {
    res.json(await service.getServices());
  },

  addToCart: async (req, res) => {
    res.json(await service.addToCart(req.user.id, req.body.serviceId));
  },

  getCart: async (req, res) => {
    res.json(await service.getCart(req.user.id));
  },

  bookAppointment: async (req, res) => {
    res.json(await service.bookAppointment(req.user, req.body));
  },

  myAppointments: async (req, res) => {
    res.json(await service.myAppointments(req.user.id));
  }
};
