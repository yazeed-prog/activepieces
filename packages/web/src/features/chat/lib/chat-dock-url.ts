function read({
  searchParams,
}: {
  searchParams: URLSearchParams;
}): ChatDockUrlState | null {
  const value = searchParams.get(CHAT_DOCK_PARAM);
  if (value === null || value === '') {
    return null;
  }
  return {
    conversationId: value === CHAT_DOCK_NEW_CHAT_VALUE ? null : value,
  };
}

function write({
  searchParams,
  docked,
  dockedConversationId,
}: {
  searchParams: URLSearchParams;
  docked: boolean;
  dockedConversationId: string | null;
}): URLSearchParams | null {
  const current = searchParams.get(CHAT_DOCK_PARAM);
  const desired = docked
    ? dockedConversationId ?? CHAT_DOCK_NEW_CHAT_VALUE
    : null;
  if (current === desired) {
    return null;
  }
  const next = new URLSearchParams(searchParams);
  if (desired === null) {
    next.delete(CHAT_DOCK_PARAM);
  } else {
    next.set(CHAT_DOCK_PARAM, desired);
  }
  return next;
}

export const chatDockUrl = { read, write };

const CHAT_DOCK_PARAM = 'chat';
const CHAT_DOCK_NEW_CHAT_VALUE = 'new';

type ChatDockUrlState = {
  conversationId: string | null;
};
