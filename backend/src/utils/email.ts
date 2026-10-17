import nodemailer from 'nodemailer';
import { logger } from './logger';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

const createTransporter = () => {
  if (!process.env.SMTP_HOST) {
    // Use ethereal for development
    logger.warn('⚠️  SMTP not configured. Emails will be logged to console.');
    return null;
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

export const sendEmail = async (options: EmailOptions): Promise<void> => {
  const transporter = createTransporter();

  if (!transporter) {
    logger.info('Email delivery disabled: configure SMTP to send account emails');
    return;
  }

  try {
    await transporter.sendMail({
      from: `"Coders" <${process.env.SMTP_FROM || 'noreply@coders.dev'}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    });
    logger.info(`Email sent to ${options.to}`);
  } catch (err) {
    logger.error('Failed to send email:', err);
    throw new Error('Email delivery unavailable');
  }
};
