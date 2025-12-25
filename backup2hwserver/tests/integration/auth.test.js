import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import supertest from 'supertest';
import mongoose from 'mongoose';
import app from '../../app.js';
import { createUser } from '../helpers/factory.js';
import sgClient from '@sendgrid/mail';

const User = mongoose.model('HwUser');
const request = supertest(app);

describe('Auth Routes', () => {
  beforeAll(async () => {
    await mongoose.connect(process.env.MONGO_URL);
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    await User.deleteMany({});
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user', async () => {
      sgClient.send.mockResolvedValue([{}, {}]);
      const response = await request.post('/api/auth/register').send({
        email: 'auth-test@example.com',
        password: 'password123',
      });
      expect(response.status).toBe(201);
      expect(response.body.message).toBe('Registriert. Bitte E-Mail prüfen.');
    });

    it('should handle email sending failure', async () => {
      sgClient.send.mockRejectedValue(new Error('SendGrid error'));
      const response = await request.post('/api/auth/register').send({
        email: 'auth-fail@example.com',
        password: 'password123',
      });
      expect(response.status).toBe(201);
      expect(response.body.message).toMatch(/^Registriert. E-Mail konnte nicht versendet werden/);
    });

    it('should not register a user with an existing email', async () => {
      await createUser({ email: 'auth-dupe@example.com', password: 'password123' });
      const response = await request.post('/api/auth/register').send({
        email: 'auth-dupe@example.com',
        password: 'password123',
      });
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('E-Mail bereits registriert');
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login a user with correct credentials', async () => {
      await createUser({ email: 'auth-login@example.com', password: 'password123' });
      const response = await request.post('/api/auth/login').send({
        email: 'auth-login@example.com',
        password: 'password123',
      });
      expect(response.status).toBe(200);
      expect(response.body.token).toBeDefined();
    });

    it('should not login a user with incorrect credentials', async () => {
      await createUser({ email: 'auth-bad-login@example.com', password: 'password123' });
      const response = await request.post('/api/auth/login').send({
        email: 'auth-bad-login@example.com',
        password: 'wrongpassword',
      });
      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Ungültige Zugangsdaten');
    });
  });
});
