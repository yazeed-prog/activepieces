const CHAT_CONVERSATION_PATH_REGEX = /^\/chat\/([^/]+)/;

function isChatRoute(pathname: string): boolean {
  return pathname === '/chat' || pathname.startsWith('/chat/');
}

function conversationIdFromPathname(pathname: string): string | null {
  return CHAT_CONVERSATION_PATH_REGEX.exec(pathname)?.[1] ?? null;
}

export const chatRouteUtils = { isChatRoute, conversationIdFromPathname };
