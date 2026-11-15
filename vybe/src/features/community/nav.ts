import { createContext, useContext } from 'react';

export type Tab = 'discover' | 'search' | 'feed' | 'clips' | 'chats' | 'games' | 'people' | 'profile';
export interface CommunityNav {
  tab: Tab;
  setTab: (t: Tab) => void;
  openMember: (id: string) => void;
  openChat: (id: string) => void;
  challenge: (id: string) => void;
  editProfile: () => void;
}
export const NavCtx = createContext<CommunityNav | null>(null);
export function useNav(): CommunityNav {
  const n = useContext(NavCtx);
  if (!n) throw new Error('NavCtx missing');
  return n;
}
