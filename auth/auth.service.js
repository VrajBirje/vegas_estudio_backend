import jwt from 'jsonwebtoken';
import { supabase } from '../config/supabase.js';
import { hashPassword, comparePassword } from '../utils/password.js';

export default {
  register: async ({ name, email, phone, password, confirmPassword }) => {
    if (password !== confirmPassword) {
      throw new Error('Passwords do not match');
    }

    const password_hash = await hashPassword(password);

    const { data, error } = await supabase
      .from('users')
      .insert({
        name,
        email,
        phone,
        password_hash
      })
      .select()
      .single();

    if (error) throw new Error(error.message);

    return { message: 'User registered successfully' };
  },

  login: async ({ identifier, password }) => {
    const { data: user } = await supabase
      .from('users')
      .select('*')
      .or(`email.eq.${identifier},phone.eq.${identifier}`)
      .single();

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
