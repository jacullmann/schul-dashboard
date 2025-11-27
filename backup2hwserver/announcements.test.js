import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import routes from './routes.js';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { initModels } from './models.js';

// Mock dependencies
const supabase = {};
const cloudinary = {};
const sgClient = {};
const geminiModel = {};

let mongoServer;
let app;
let models;
let adminUser, regularUser;
let adminToken, regularToken;
let announcementId;

// Utility to sign JWTs for tests
const signToken = (user) => {
    return jwt.sign({ sub: user._id, email: user.email }, 'test-secret', { expiresIn: '1h' });
};

beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
    models = initModels(mongoose);

    app = express();
    app.use(express.json());
    app.use(cookieParser());

    // Setup routes
    routes(app, {
        mongoose,
        models,
        supabase,
        cloudinary,
        sgClient,
        geminiModel,
        jwtSecret: 'test-secret',
        // Mock csurf middleware for tests
        csurf: (req, res, next) => next(),
    });

    // Create users for tests
    adminUser = await models.User.create({ email: 'admin@test.com', passwordHash: 'hashedpassword', isAdmin: true, emailVerified: true });
    regularUser = await models.User.create({ email: 'user@test.com', passwordHash: 'hashedpassword', emailVerified: true });

    // Generate tokens
    adminToken = signToken(adminUser);
    regularToken = signToken(regularUser);
});

afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
});

describe('Announcements API', () => {
    it('GET /api/announcements - should return a list of announcements', async () => {
        await models.Announcement.create({ content: 'Test Announcement' });
        const res = await request(app)
            .get('/api/announcements')
            .set('Cookie', `token=${regularToken}`);
        expect(res.statusCode).toEqual(200);
        expect(res.body).toBeInstanceOf(Array);
        expect(res.body.length).toBeGreaterThan(0);
    });

    it('POST /api/announcements - admin should be able to create an announcement', async () => {
        const res = await request(app)
            .post('/api/announcements')
            .set('Cookie', `token=${adminToken}`)
            .send({ content: 'New Admin Announcement', color: 'info', showAsPopup: true });

        expect(res.statusCode).toEqual(201);
        expect(res.body).toHaveProperty('content', 'New Admin Announcement');
        announcementId = res.body._id; // Save for later tests
    });

    it('POST /api/announcements - regular user should not be able to create an announcement', async () => {
        const res = await request(app)
            .post('/api/announcements')
            .set('Cookie', `token=${regularToken}`)
            .send({ content: 'Unauthorized Announcement' });

        expect(res.statusCode).toEqual(403);
    });

    it('DELETE /api/announcements/:id - admin should be able to delete any announcement', async () => {
        const res = await request(app)
            .delete(`/api/announcements/${announcementId}`)
            .set('Cookie', `token=${adminToken}`);

        expect(res.statusCode).toEqual(200);
        expect(res.body).toEqual({ ok: true });
    });

    it('DELETE /api/announcements/:id - regular user should not be able to delete an announcement they did not create', async () => {
        const newAnnouncement = await models.Announcement.create({ content: 'Another Announcement', createdBy: adminUser._id });
        const res = await request(app)
            .delete(`/api/announcements/${newAnnouncement._id}`)
            .set('Cookie', `token=${regularToken}`);

        expect(res.statusCode).toEqual(403);
    });

    it('DELETE /api/announcements/:id - regular user should be able to delete their own announcement if they were an admin', async () => {
        // This simulates a user who was an admin, created an announcement, and then was demoted.
        const formerAdmin = await models.User.create({ email: 'formeradmin@test.com', passwordHash: 'hashedpassword', isAdmin: false, emailVerified: true });
        const formerAdminToken = signToken(formerAdmin);
        const announcement = await models.Announcement.create({ content: 'Test Announcement by Former Admin', createdBy: formerAdmin._id });

        const res = await request(app)
            .delete(`/api/announcements/${announcement._id}`)
            .set('Cookie', `token=${formerAdminToken}`);

        expect(res.statusCode).toEqual(200);
    });
});
