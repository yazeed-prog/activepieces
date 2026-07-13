import { describe, expect, it } from 'vitest';

import { chatDockUrl } from '@/features/chat/lib/chat-dock-url';

describe('chatDockUrl.read', () => {
  it('returns null when the param is absent', () => {
    const searchParams = new URLSearchParams('status=SUCCEEDED');
    expect(chatDockUrl.read({ searchParams })).toBeNull();
  });

  it('returns null when the param is empty', () => {
    const searchParams = new URLSearchParams('chat=');
    expect(chatDockUrl.read({ searchParams })).toBeNull();
  });

  it('maps "new" to a null conversation id', () => {
    const searchParams = new URLSearchParams('chat=new');
    expect(chatDockUrl.read({ searchParams })).toEqual({
      conversationId: null,
    });
  });

  it('returns the conversation id', () => {
    const searchParams = new URLSearchParams('chat=conv_123');
    expect(chatDockUrl.read({ searchParams })).toEqual({
      conversationId: 'conv_123',
    });
  });
});

describe('chatDockUrl.write', () => {
  it('adds the param when docked with a conversation', () => {
    const next = chatDockUrl.write({
      searchParams: new URLSearchParams(),
      docked: true,
      dockedConversationId: 'conv_123',
    });
    expect(next?.get('chat')).toBe('conv_123');
  });

  it('writes "new" when docked without a conversation', () => {
    const next = chatDockUrl.write({
      searchParams: new URLSearchParams(),
      docked: true,
      dockedConversationId: null,
    });
    expect(next?.get('chat')).toBe('new');
  });

  it('removes the param when not docked', () => {
    const next = chatDockUrl.write({
      searchParams: new URLSearchParams('chat=conv_123'),
      docked: false,
      dockedConversationId: null,
    });
    expect(next?.has('chat')).toBe(false);
  });

  it('returns null when already in sync while docked', () => {
    const next = chatDockUrl.write({
      searchParams: new URLSearchParams('chat=conv_123'),
      docked: true,
      dockedConversationId: 'conv_123',
    });
    expect(next).toBeNull();
  });

  it('returns null when already in sync while undocked', () => {
    const next = chatDockUrl.write({
      searchParams: new URLSearchParams('status=SUCCEEDED'),
      docked: false,
      dockedConversationId: null,
    });
    expect(next).toBeNull();
  });

  it('updates the param when the conversation changes', () => {
    const next = chatDockUrl.write({
      searchParams: new URLSearchParams('chat=new'),
      docked: true,
      dockedConversationId: 'conv_123',
    });
    expect(next?.get('chat')).toBe('conv_123');
  });

  it('preserves unrelated params and does not mutate the input', () => {
    const searchParams = new URLSearchParams('status=SUCCEEDED&search=slack');
    const next = chatDockUrl.write({
      searchParams,
      docked: true,
      dockedConversationId: 'conv_123',
    });
    expect(next?.get('status')).toBe('SUCCEEDED');
    expect(next?.get('search')).toBe('slack');
    expect(searchParams.has('chat')).toBe(false);
  });
});
