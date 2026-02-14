import { supabase } from '../config/supabase.js';
import { isWithin7Days } from '../utils/date.js';

export default {
  getServices: async () => {
    const { data } = await supabase.from('services').select('*').eq('is_active', true);
    return data;
  },

  addToCart: async (userId, serviceId) => {
    const { data: cart } = await supabase
      .from('carts')
      .select('id')
      .eq('user_id', userId)
      .single();

    const cartId = cart?.id ||
      (await supabase.from('carts').insert({ user_id: userId }).select().single()).data.id;

    await supabase.from('cart_items').insert({ cart_id: cartId, service_id: serviceId });
    return { message: 'Added to cart' };
  },

  getCart: async (userId) => {
    // 1. Get user's cart
    const { data: cart } = await supabase
      .from('carts')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (!cart) return [];

    // 2. Get cart items with service details
    const { data } = await supabase
      .from('cart_items')
      .select(`
      id,
      services (
        id,
        name,
        price,
        duration_minutes,
        type
      )
    `)
      .eq('cart_id', cart.id);

    return data;
  },

  removeFromCart: async (userId, serviceId) => {
    // 1. Get user's cart
    const { data: cart } = await supabase
      .from('carts')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (!cart) {
      throw new Error('Cart not found');
    }

    // 2. Remove the service from cart_items
    const { error } = await supabase
      .from('cart_items')
      .delete()
      .eq('cart_id', cart.id)
      .eq('service_id', serviceId);

    if (error) {
      throw error;
    }

    return { message: 'Service removed from cart' };
  },

  bookAppointment: async (user, payload) => {
    if (!isWithin7Days(payload.appointment_date)) {
      throw new Error('Booking allowed only for next 7 days');
    }

    // 1. Get cart
    const { data: cart } = await supabase
      .from('carts')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!cart) {
      throw new Error('Cart is empty');
    }

    // 2. Get cart services
    const { data: cartItems } = await supabase
      .from('cart_items')
      .select(`
      service_id,
      services (
        duration_minutes
      )
    `)
      .eq('cart_id', cart.id);

    if (!cartItems || cartItems.length === 0) {
      throw new Error('Cart is empty');
    }

    // 3. Calculate total duration
    const totalDuration = cartItems.reduce(
      (sum, item) => sum + item.services.duration_minutes,
      0
    );

    // 4. Create appointment
    const { data: appointment } = await supabase
      .from('appointments')
      .insert({
        customer_id: user.id,
        customer_name: user.name,
        customer_phone: user.phone,
        customer_email: user.email,
        appointment_date: payload.appointment_date,
        start_time: payload.start_time,
        end_time: payload.end_time,
        total_duration_minutes: totalDuration
      })
      .select()
      .single();

    // 5. Link services to appointment
    const appointmentServices = cartItems.map(item => ({
      appointment_id: appointment.id,
      service_id: item.service_id
    }));

    await supabase
      .from('appointment_services')
      .insert(appointmentServices);

    // 6. Clear cart
    await supabase
      .from('cart_items')
      .delete()
      .eq('cart_id', cart.id);

    return {
      message: 'Appointment booked successfully',
      appointment
    };
  },

  myAppointments: async (userId) => {
    const { data } = await supabase
      .from('appointments')
      .select(`
      id,
      appointment_date,
      start_time,
      end_time,
      total_duration_minutes,
      status,
      rejection_reason,
      created_at,
      appointment_services (
        services (
          id,
          name,
          price,
          duration_minutes,
          type
        )
      )
    `)
      .eq('customer_id', userId)
      .order('created_at', { ascending: false });

    return data;
  }
};
