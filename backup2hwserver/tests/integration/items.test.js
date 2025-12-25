import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import supertest from 'supertest';
import mongoose from 'mongoose';
import app from '../../app.js';
import { createUser, createItem, generateToken } from '../helpers/factory.js';

const User = mongoose.model('HwUser');
const Item = mongoose.model('HwItem');
const request = supertest(app);

describe('Item Routes', () => {
  let user;
  let token;

  beforeAll(async () => {
    await mongoose.connect(process.env.MONGO_URL);
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    await User.deleteMany({});
    await Item.deleteMany({});
    user = await createUser({ email: 'test@example.com', password: 'password123' });
    token = generateToken(user);
  });

  describe('POST /api/items', () => {
    it('should create a new item', async () => {
      const response = await request
        .post('/api/items')
        .set('Authorization', `Bearer ${token}`)
        .send({
          type: 'HAUSAUFGABE',
          title: 'Test Item',
          subject: 'Test Subject',
          dueDate: new Date(),
        });
      expect(response.status).toBe(201);
      expect(response.body.ok).toBe(true);
    });
  });

  describe('GET /api/items', () => {
    it('should get a list of items', async () => {
      await createItem({ type: 'HAUSAUFGABE', title: 'Test Item', subject: 'Test Subject', dueDate: new Date() });
      const response = await request
        .get('/api/items?type=HAUSAUFGABE')
        .set('Authorization', `Bearer ${token}`);
      expect(response.status).toBe(200);
      expect(response.body.length).toBe(1);
    });
  });

  describe('PATCH /api/items/:id', () => {
    it('should update an item', async () => {
      const item = await createItem({ type: 'HAUSAUFGABE', title: 'Test Item', subject: 'Test Subject', dueDate: new Date(), createdBy: user._id });
      const response = await request
        .patch(`/api/items/${item._id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Updated Title' });
      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);
    });
  });

  describe('DELETE /api/items/:id', () => {
    it('should delete an item', async () => {
      const item = await createItem({ type: 'HAUSAUFGABE', title: 'Test Item', subject: 'Test Subject', dueDate: new Date(), createdBy: user._id });
      const response = await request
        .delete(`/api/items/${item._id}`)
        .set('Authorization', `Bearer ${token}`);
      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);
    });
  });
});
