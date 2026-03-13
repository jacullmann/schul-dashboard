import { Test, TestingModule } from '@nestjs/testing';
import { SystemController } from './system.controller';
import * as csrfMiddleware from '../common/middleware/csrf.middleware';

// Mock generation
jest.mock('../common/middleware/csrf.middleware', () => ({
  generateCsrfToken: jest.fn().mockReturnValue('mocked-csrf-token'),
}));

describe('SystemController', () => {
  let controller: SystemController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SystemController],
    }).compile();

    controller = module.get<SystemController>(SystemController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getServerStatus', () => {
    it('should return status good', () => {
      const result = controller.getServerStatus();
      expect(result.status).toBe('good');
      expect(result.timestamp).toBeDefined();
      expect(result.env).toBe(process.env.NODE_ENV);
    });
  });

  describe('initCsrf', () => {
    it('should set cookie and return csrf token', () => {
      const res = {
        cookie: jest.fn(),
        json: jest.fn(),
      } as any;

      controller.initCsrf(res);

      expect(res.cookie).toHaveBeenCalledWith('csrf_token', 'mocked-csrf-token', expect.any(Object));
      expect(res.json).toHaveBeenCalledWith({ ok: true, csrfToken: 'mocked-csrf-token' });
    });
  });
});