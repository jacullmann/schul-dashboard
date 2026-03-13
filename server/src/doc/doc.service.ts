import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../common/supabase/supabase.service';
import sanitizeHtml from 'sanitize-html';

export interface DocState {
  content: string;
  version: number;
  lastEditedBy: string | null;
  lastEditedAt: string | null;
}

const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    'h1',
    'h2',
    'h3',
    'h4',
    'p',
    'ul',
    'ol',
    'li',
    'strong',
    'em',
    'u',
    's',
    'br',
    'span',
    'div',
    'input',
  ],
  allowedAttributes: {
    '*': ['style', 'class', 'data-*'],
    input: ['type', 'checked', 'disabled'],
    span: ['style'],
  },
  allowedStyles: {
    '*': {
      color: [/.*/],
      'background-color': [/.*/],
      'font-weight': [/.*/],
      'font-style': [/.*/],
      'text-decoration': [/.*/],
    },
  },
};

@Injectable()
export class DocService {
  private docState: DocState = {
    content: '',
    version: 0,
    lastEditedBy: null,
    lastEditedAt: null,
  };

  private loaded = false;

  constructor(private readonly supabaseService: SupabaseService) {}

  getDocState(): DocState {
    return this.docState;
  }

  async loadFromDb(): Promise<void> {
    if (this.loaded) return;
    const sb = this.supabaseService.getClient();
    try {
      const { data } = await sb.from('shared_doc').select('*').maybeSingle();
      if (data) {
        this.docState = {
          content: data.content ?? '',
          version: data.version ?? 0,
          lastEditedBy: data.last_edited_by,
          lastEditedAt: data.last_edited_at,
        };
      } else {
        await sb.from('shared_doc').upsert({
          id: 'singleton',
          content: '',
          version: 0,
          last_edited_by: null,
          last_edited_at: null,
        });
      }
      this.loaded = true;
    } catch (err) {
      console.error('[Doc] DB load error:', err);
    }
  }

  async persistToDb(): Promise<void> {
    const sb = this.supabaseService.getClient();
    try {
      await sb.from('shared_doc').upsert({
        id: 'singleton',
        content: this.docState.content,
        version: this.docState.version,
        last_edited_by: this.docState.lastEditedBy,
        last_edited_at: this.docState.lastEditedAt,
      });
    } catch (err) {
      console.error('[Doc] DB write error:', err);
    }
  }

  applyUpdate(
    content: string,
    clientVersion: number,
    email: string,
  ): { conflict: boolean; state: DocState } {
    if (clientVersion < this.docState.version) {
      return {
        conflict: true,
        state: { ...this.docState },
      };
    }

    this.docState.content = sanitizeHtml(content, SANITIZE_OPTIONS);
    this.docState.version += 1;
    this.docState.lastEditedBy = email;
    this.docState.lastEditedAt = new Date().toISOString();

    return { conflict: false, state: { ...this.docState } };
  }

  async getHistory() {
    const sb = this.supabaseService.getClient();
    const { data } = await sb.from('shared_doc').select('*').maybeSingle();
    return data ?? { content: '', version: 0 };
  }
}
