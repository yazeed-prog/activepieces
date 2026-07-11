import { create } from 'zustand';

export const useChatDockStore = create<ChatDockStore>((set) => ({
  docked: false,
  dockedConversationId: null,
  openDock: ({ conversationId }) =>
    set({ docked: true, dockedConversationId: conversationId }),
  closeDock: () => set({ docked: false }),
  openConversation: ({ conversationId }) =>
    set({ docked: true, dockedConversationId: conversationId }),
  requestNewChat: () => set({ docked: true, dockedConversationId: null }),
  setDockedConversationId: (conversationId) =>
    set({ dockedConversationId: conversationId }),
}));

type ChatDockStore = {
  docked: boolean;
  dockedConversationId: string | null;
  openDock: ({ conversationId }: { conversationId: string | null }) => void;
  closeDock: () => void;
  openConversation: ({ conversationId }: { conversationId: string }) => void;
  requestNewChat: () => void;
  setDockedConversationId: (conversationId: string | null) => void;
};
