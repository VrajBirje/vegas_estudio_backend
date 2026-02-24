import nodemailer from 'nodemailer';

// configure once using environment variables
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD
  }
});

// simple wrapper
export const sendEmail = async ({ to, subject, text, html }) => {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    console.warn('Gmail credentials not configured, skipping sendEmail');
    return;
  }

  try {
    const info = await transporter.sendMail({
      from: process.env.GMAIL_USER,
      to,
      subject,
      text,
      html
    });

    console.log(`email sent to ${to}: ${info.messageId}`);
    return info;
  } catch (err) {
    console.error('sendEmail error (ignored)', err.message);
    // ✅ DO NOT throw
  }
};

// helpers for common notifications
export const sendWelcomeEmail = ({ name, email }) => {
  const subject = 'Welcome to Vegas Appointment System';
  const html = `
    <h2>Hello ${name || 'there'}!</h2>
    <p>Thank you for registering with our appointment booking system. We're glad to have you on board.</p>
    <p>Now you can book services and manage your appointments easily.</p>
    <p>Cheers,<br/>Vegas Team</p>
  `;
  return sendEmail({ to: email, subject, html });
};

export const sendLoginNotification = ({ name, email }) => {
  const subject = 'Successful Login Notification';
  const html = `
    <h2>Hi ${name || 'there'},</h2>
    <p>This is a quick note to let you know that you have successfully logged into your Vegas account.</p>
    <p>If this wasn't you, please contact support immediately.</p>
    <p>Thank you,<br/>Vegas Team</p>
  `;
  return sendEmail({ to: email, subject, html });
};

export const sendBookingConfirmation = ({ name, email, appointment }) => {
  const subject = 'Appointment Request Received';
  const html = `
    <h2>Hi ${name || 'there'},</h2>
    <p>Your appointment request has been received with the following details:</p>
    <ul>
      <li><strong>Date:</strong> ${appointment.appointment_date}</li>
      <li><strong>Start time:</strong> ${appointment.start_time}</li>
      <li><strong>End time:</strong> ${appointment.end_time}</li>
    </ul>
    <p>We will notify you once the appointment is confirmed.</p>
    <p>Thank you for choosing us!<br/>Vegas Team</p>
  `;
  return sendEmail({ to: email, subject, html });
};

export const sendAppointmentStatusEmail = ({ appointment }) => {
  const { customer_name, customer_email, status, rejection_reason } = appointment;
  let subject;
  let html;

  if (status === 'confirmed') {
    subject = 'Your Appointment Has Been Confirmed';
    html = `
      <h2>Hello ${customer_name || 'there'},</h2>
      <p>Your appointment has been <strong>confirmed</strong>!</p>
      <p>Details:</p>
      <ul>
        <li><strong>Date:</strong> ${appointment.appointment_date}</li>
        <li><strong>Start:</strong> ${appointment.start_time}</li>
        <li><strong>End:</strong> ${appointment.end_time}</li>
      </ul>
      <p>We look forward to serving you.</p>
      <p>Best regards,<br/>Vegas Team</p>
    `;
  } else if (status === 'rejected') {
    subject = 'Your Appointment Request Was Rejected';
    html = `
      <h2>Hello ${customer_name || 'there'},</h2>
      <p>Unfortunately, your appointment request has been <strong>rejected</strong>.</p>
      <p>Reason: ${rejection_reason || 'Not specified'}</p>
      <p>Please try booking a different slot or contact support.</p>
      <p>Regards,<br/>Vegas Team</p>
    `;
  } else if (status === 'cancelled') {
    subject = 'Your Appointment Has Been Cancelled';
    html = `
      <h2>Hello ${customer_name || 'there'},</h2>
      <p>Your appointment has been cancelled.</p>
      <p>If you have questions, please reach out.</p>
      <p>Regards,<br/>Vegas Team</p>
    `;
  } else {
    // other statuses can be ignored or not mailed
    return;
  }

  return sendEmail({ to: customer_email, subject, html });
};

export const sendAdminNotification = ({ appointment, user }) => {
  const subject = 'New Appointment Request Submitted';
  const html = `
    <h2>New appointment pending approval</h2>
    <p>User <strong>${user.name}</strong> (${user.email}) has requested an appointment:</p>
    <ul>
      <li><strong>Date:</strong> ${appointment.appointment_date}</li>
      <li><strong>Start:</strong> ${appointment.start_time}</li>
      <li><strong>End:</strong> ${appointment.end_time}</li>
    </ul>
    <p>Please log in to the admin panel to confirm or reject the request.</p>
  `;
  return sendEmail({ to: process.env.ADMIN_EMAIL, subject, html });
};
