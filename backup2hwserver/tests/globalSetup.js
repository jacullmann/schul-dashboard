import { MongoMemoryServer } from 'mongodb-memory-server';

export default async function () {
  const mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  process.env.MONGO_URL = uri;
  process.env.MONGODB_URI = uri;
  process.env.JWT_SECRET = 'test-secret';
  process.env.SENDGRID_API_KEY = 'test-key'; // Set the SendGrid API key
  global.__MONGOD__ = mongod;
}
