import { Test, TestingModule } from '@nestjs/testing';
import { TodosService } from './todos.service';
import { SupabaseService } from '../common/supabase/supabase.service';
import { InternalServerErrorException, NotFoundException } from '@nestjs/common';
import * as encryptionUtil from '../common/utils/encryption.util';

jest.mock('../common/utils/encryption.util', () => ({
  encryptData: jest.fn().mockResolvedValue('encrypted-data'),
  decryptData: jest.fn().mockResolvedValue('decrypted-data'),
}));

describe('TodosService', () => {
  let service: TodosService;
  let supabaseService: SupabaseService;

  const mockSupabaseClient: any = {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn().mockReturnThis(),
    single: jest.fn().mockReturnThis(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TodosService,
        {
          provide: SupabaseService,
          useValue: {
            getClient: jest.fn().mockReturnValue(mockSupabaseClient),
          },
        },
      ],
    }).compile();

    service = module.get<TodosService>(TodosService);
    supabaseService = module.get<SupabaseService>(SupabaseService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getTodos', () => {
    it('should return empty array if no todos', async () => {
      mockSupabaseClient.order = jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({ data: null })
      });
      const result = await service.getTodos('user-1');
      expect(result).toEqual([]);
    });

    it('should decrypt and return todos', async () => {
      const mockTodos = [
        {
          id: 'todo-1',
          encrypted_title: 'enc-title',
          encrypted_description: null,
          completed: false,
          position: 'a',
          created_at: 'date',
          updated_at: 'date',
        },
      ];
      mockSupabaseClient.order = jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({ data: mockTodos })
      });

      const result = await service.getTodos('user-1');

      expect(encryptionUtil.decryptData).toHaveBeenCalledWith('enc-title', 'user-1');
      expect(result[0].id).toBe('todo-1');
      expect(result[0].title).toBe('decrypted-data');
      expect(result[0].description).toBe('');
    });
  });

  describe('deleteTodo', () => {
    it('should throw NotFoundException if todo not found', async () => {
      mockSupabaseClient.eq = jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
              maybeSingle: jest.fn().mockResolvedValue({ data: null })
          })
      });

      await expect(service.deleteTodo('user-1', 'todo-1')).rejects.toThrow(NotFoundException);
    });

    it('should delete todo and log activity', async () => {
      mockSupabaseClient.eq = jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
              maybeSingle: jest.fn().mockResolvedValue({ data: { id: 'todo-1' } })
          })
      });

      const chainMock = {
          eq: jest.fn().mockResolvedValue({ error: null })
      };
      const doubleEqMock = {
          eq: jest.fn().mockReturnValue(chainMock)
      };

      mockSupabaseClient.delete = jest.fn().mockReturnValue(doubleEqMock);
      mockSupabaseClient.insert = jest.fn().mockResolvedValue({ error: null });

      const result = await service.deleteTodo('user-1', 'todo-1');

      expect(result.ok).toBe(true);
      expect(mockSupabaseClient.delete).toHaveBeenCalled();
    });
  });
});