import { describe, expect, it } from 'bun:test';
import { toChatMessage } from './chatbot.llm';
import type { ChatbotMessage } from '../../db/schema';

function msg(
  role: ChatbotMessage['role'],
  content: string
): ChatbotMessage {
  return {
    id: 'm1',
    sessionId: 's1',
    role,
    content,
    authorStaffId: null,
    createdAt: new Date('2026-06-04T10:00:00Z'),
  };
}

describe('toChatMessage', () => {
  it('mappe un message visiteur sur le rôle user', () => {
    expect(toChatMessage(msg('visitor', 'Bonjour'))).toEqual({
      role: 'user',
      content: 'Bonjour',
    });
  });

  it('mappe un message bot sur le rôle assistant', () => {
    expect(toChatMessage(msg('bot', 'Salut !'))).toEqual({
      role: 'assistant',
      content: 'Salut !',
    });
  });

  it('mappe un message staff sur le rôle assistant', () => {
    expect(toChatMessage(msg('staff', 'Je prends la main'))).toEqual({
      role: 'assistant',
      content: 'Je prends la main',
    });
  });

  it('exclut les messages système (renvoie null)', () => {
    expect(toChatMessage(msg('system', 'Conversation reprise'))).toBeNull();
  });
});
