import { supabase } from '../config/supabase.js';
import { isWithin7Days } from '../utils/date.js';

export default {
  getServices: async () => {
    const { data } = await supabase.from('services').select('*').eq('is_active', true);
    return data;
  },

  addToCart: async (userId, serviceId) => {
    // 1. Get or create cart
    const { data: cart, error: cartError } = await supabase
      .from('carts')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (cartError && cartError.code !== 'PGRST116') {
      throw cartError;
    }

    let cartId = cart?.id;

    if (!cartId) {
      const { data: newCart, error } = await supabase
        .from('carts')
        .insert({ user_id: userId })
        .select()
        .single();

      if (error) throw error;
      cartId = newCart.id;
    }

    // 2. Check if service already exists in cart
    const { data: existingItem } = await supabase
      .from('cart_items')
      .select('id')
      .eq('cart_id', cartId)
      .eq('service_id', serviceId)
      .maybeSingle();

    if (existingItem) {
      return {
        message: 'Service already in cart',
        alreadyExists: true
      };
    }

    // 3. Insert service into cart
    const { error: insertError } = await supabase
      .from('cart_items')
      .insert({
        cart_id: cartId,
        service_id: serviceId
      });

    // 4. Handle unique constraint violation gracefully
    if (insertError?.code === '23505') {
      return {
        message: 'Service already in cart',
        alreadyExists: true
      };
    }

    if (insertError) throw insertError;

    return {
      message: 'Added to cart',
      added: true
    };
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

    // send confirmation to user and notification to admin
    try {
      const { sendBookingConfirmation, sendAdminNotification } = await import('../utils/email.js');
      sendBookingConfirmation({ name: user.name, email: user.email, appointment });
      sendAdminNotification({ appointment, user });
    } catch (e) {
      console.error('booking email error', e);
    }

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
