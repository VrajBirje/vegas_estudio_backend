import { supabase } from '../config/supabase.js';
import { APPOINTMENT_STATUS } from '../constants/appointmentStatus.js';

export default {
  getAppointments: async () => {
    const { data, error } = await supabase
      .from('appointments')
      .select(`
      id,
      customer_name,
      customer_phone,
      customer_email,
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
      .order('appointment_date', { ascending: true })
      .order('start_time', { ascending: true });

    if (error) throw error;
    return data;
  },

  addService: async (payload) => {
    const { data, error } = await supabase
      .from('services')
      .insert(payload)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  updateService: async (id, payload) => {
    const { data, error } = await supabase
      .from('services')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  deleteService: async (id) => {
    const { error } = await supabase
      .from('services')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { message: 'Service deleted' };
  },

  blockSlot: async (payload) => {
    const { data, error } = await supabase
      .from('blocked_slots')
      .insert(payload)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  deleteBlockedSlot: async (id) => {
    const { error } = await supabase
      .from('blocked_slots')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { message: 'Blocked slot removed' };
  },

  getBlockedSlots: async () => {
    const { data, error } = await supabase
      .from('blocked_slots')
      .select(`
      id,
      block_date,
      start_time,
      end_time,
      is_full_day,
      reason,
      created_at
    `)
      .order('block_date', { ascending: true })
      .order('start_time', { ascending: true });

    if (error) throw error;
    return data;
  },

  toggleBooking: async (enabled) => {
    const { data, error } = await supabase
      .from('settings')
      .update({ booking_enabled: enabled })
      .eq('id', 1)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  getBookingStatus: async () => {
    const { data, error } = await supabase
      .from('settings')
      .select('booking_enabled')
      .eq('id', 1)
      .single();

    if (error) throw error;
    return data.booking_enabled;
  },

  updateAppointmentStatus: async (appointmentId, status, reason) => {
    if (!Object.values(APPOINTMENT_STATUS).includes(status)) {
      throw new Error('Invalid appointment status');
    }

    // Fetch current status
    const { data: appointment } = await supabase
      .from('appointments')
      .select('status')
      .eq('id', appointmentId)
      .single();

    if (!appointment) {
      throw new Error('Appointment not found');
    }

    const currentStatus = appointment.status;

    // Status transition validation
    if (currentStatus === APPOINTMENT_STATUS.PENDING) {
      if (
        status !== APPOINTMENT_STATUS.CONFIRMED &&
        status !== APPOINTMENT_STATUS.REJECTED
      ) {
        throw new Error('Invalid status transition');
      }
    }

    if (currentStatus === APPOINTMENT_STATUS.CONFIRMED) {
      if (status !== APPOINTMENT_STATUS.CANCELLED) {
        throw new Error('Invalid status transition');
      }
    }

    if (currentStatus === APPOINTMENT_STATUS.REJECTED) {
      throw new Error('Rejected appointment cannot be updated');
    }

    if (
      status === APPOINTMENT_STATUS.REJECTED &&
      (!reason || reason.trim() === '')
    ) {
      throw new Error('Rejection reason is required');
    }

    const { data } = await supabase
      .from('appointments')
      .update({
        status,
        rejection_reason:
          status === APPOINTMENT_STATUS.REJECTED ? reason : null
      })
      .eq('id', appointmentId)
      .select()
      .single();

    return {
      message: 'Appointment status updated',
      appointment: data
    };
  }
};
