import jwt from 'jsonwebtoken';
import { supabase } from '../config/supabase.js';
import { hashPassword, comparePassword } from '../utils/password.js';

export default {
  register: async ({ name, email, phone, password, confirmPassword }) => {
    if (password !== confirmPassword) {
      throw new Error('Passwords do not match');
    }

    const password_hash = await hashPassword(password);

    let data, error;
    try {
      ({ data, error } = await supabase
        .from('users')
        .insert({
          name,
          email,
          phone,
          password_hash
        })
        .select()
        .single());
    } catch (err) {
      // this branch only executes if the SDK throws (rare); log and wrap
      console.error('Supabase request threw an exception during registration:', err);
      throw new Error('Unable to reach Supabase service');
    }

    if (error) {
      // Supabase returned an error object (e.g. network failure or constraint issue)
      console.error('Supabase returned error during registration:', error);
      // propagate the original error so middleware can inspect it if needed
      throw error;
    }

    // send welcome email (fire-and-forget)
    try {
      const { sendWelcomeEmail } = await import('../utils/email.js');
      sendWelcomeEmail({ name, email });
    } catch (e) {
      console.error('Failed to send welcome email', e);
    }

    return { message: 'User registered successfully' };
  },

  login: async ({ identifier, password }) => {
    let user, loginError;
    try {
      const result = await supabase
        .from('users')
        .select('*')
        .or(`email.eq.${identifier},phone.eq.${identifier}`)
        .single();
      user = result.data;
      loginError = result.error;
    } catch (err) {
      console.error('Supabase query threw during login:', err);
      throw new Error('Unable to reach Supabase service');
    }

    if (loginError) {
      console.error('Supabase returned error during login:', loginError);
      throw loginError;
    }

    if (!user) throw new Error('Invalid credentials');

    const valid = await comparePassword(password, user.password_hash);
    if (!valid) throw new Error('Invalid credentials');

    const token = jwt.sign(
      {
        id: user.id,
        role: 'client',
        name: user.name,
        email: user.email,
        phone: user.phone
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    // notify user of successful login
    try {
      const { sendLoginNotification } = await import('../utils/email.js');
      sendLoginNotification({ name: user.name, email: user.email });
    } catch (e) {
      console.error('Failed to send login notification', e);
    }

    return { token, user: { id: user.id, name: user.name, email: user.email, phone: user.phone }, role: 'client' };
  },

  // 🔐 ADMIN LOGIN (ENV BASED)
  adminLogin: async ({ email, password }) => {
    if (
      email !== process.env.ADMIN_EMAIL ||
      password !== process.env.ADMIN_PASSWORD
    ) {
      throw new Error('Invalid admin credentials');
    }

    const token = jwt.sign(
      {
        role: 'admin',
        email
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    return {
      token,
      user: {id: 'admin', name: 'Admin', email , phone: "9999999999"},
      role: 'admin'
    };
  }
};
