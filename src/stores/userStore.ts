// 用户状态管理
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { User, PossessionAccount, BaseStore, AsyncState } from './types';
import { createPersistMiddleware } from './utils/persistence';
import { createSyncMiddleware } from './utils/sync';

interface UserState extends BaseStore {
  // 当前用户
  currentUser: User | null;
  
  // 附身账号列表
  possessionAccounts: PossessionAccount[];
  
  // 当前活跃的附身账号
  activePossessionAccount: PossessionAccount | null;
  
  // 在线用户列表
  onlineUsers: User[];
  
  // 操作状态
  loginState: AsyncState;
  switchAccountState: AsyncState;
}

interface UserActions {
  // 用户认证
  login: (credentials: { username: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (updates: Partial<User>) => Promise<void>;
  
  // 附身账号管理
  addPossessionAccount: (account: Omit<PossessionAccount, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  removePossessionAccount: (accountId: string) => Promise<void>;
  switchPossessionAccount: (accountId: string) => Promise<void>;
  updatePossessionAccount: (accountId: string, updates: Partial<PossessionAccount>) => Promise<void>;
  
  // 用户状态管理
  setUserStatus: (status: User['status']) => Promise<void>;
  updateOnlineUsers: (users: User[]) => void;
  
  // 重置状态
  resetUserState: () => void;
  
  // 选择器（性能优化）
  getCurrentUser: () => User | null;
  getPossessionAccounts: () => PossessionAccount[];
  getActivePossessionAccount: () => PossessionAccount | null;
  isUserOnline: (userId: string) => boolean;
}

type UserStore = UserState & UserActions;

// 初始状态
const initialState: UserState = {
  currentUser: null,
  possessionAccounts: [],
  activePossessionAccount: null,
  onlineUsers: [],
  loginState: { loading: false, error: null, success: false },
  switchAccountState: { loading: false, error: null, success: false },
  isLoading: false,
  error: null,
  lastUpdated: 0,
};

// API 模拟服务
class UserApiService {
  static async login(credentials: { username: string; password: string }): Promise<User> {
    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return {
      id: 'user_' + Math.random().toString(36).substr(2, 9),
      username: credentials.username,
      nickname: credentials.username,
      avatar: `https://api.dicebear.com/6.x/avataaars/svg?seed=${credentials.username}`,
      status: 'online',
      lastSeenAt: Date.now(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
  }

  static async updateProfile(userId: string, updates: Partial<User>): Promise<User> {
    await new Promise(resolve => setTimeout(resolve, 500));
    throw new Error('User not found');
  }

  static async fetchPossessionAccounts(userId: string): Promise<PossessionAccount[]> {
    await new Promise(resolve => setTimeout(resolve, 300));
    return [
      {
        id: 'account_1',
        userId,
        accountName: 'WeChat_Bot',
        accountType: 'wechat',
        isActive: true,
        permissions: ['send_message', 'read_message'],
        createdAt: Date.now() - 86400000,
        updatedAt: Date.now(),
      },
      {
        id: 'account_2',
        userId,
        accountName: 'Telegram_Helper',
        accountType: 'telegram',
        isActive: false,
        permissions: ['send_message'],
        createdAt: Date.now() - 172800000,
        updatedAt: Date.now(),
      },
    ];
  }
}

// 创建store
export const useUserStore = create<UserStore>()(
  subscribeWithSelector(
    createSyncMiddleware('userStore', ['currentUser', 'possessionAccounts'])(
      createPersistMiddleware(
        {
          name: 'im-user-store',
          storage: 'localStorage',
          version: 2,
          partialize: (state) => ({
            currentUser: state.currentUser,
            possessionAccounts: state.possessionAccounts,
            activePossessionAccount: state.activePossessionAccount,
          }),
        },
        (set, get) => ({
          ...initialState,

          // 用户认证
          login: async (credentials) => {
            set((state) => ({
              ...state,
              loginState: { loading: true, error: null, success: false },
              isLoading: true,
            }));

            try {
              const user = await UserApiService.login(credentials);
              const possessionAccounts = await UserApiService.fetchPossessionAccounts(user.id);
              
              set((state) => ({
                ...state,
                currentUser: user,
                possessionAccounts,
                activePossessionAccount: possessionAccounts.find(acc => acc.isActive) || null,
                loginState: { loading: false, error: null, success: true },
                isLoading: false,
                lastUpdated: Date.now(),
              }));
            } catch (error) {
              set((state) => ({
                ...state,
                loginState: { 
                  loading: false, 
                  error: error instanceof Error ? error.message : 'Login failed', 
                  success: false 
                },
                isLoading: false,
                error: error instanceof Error ? error.message : 'Login failed',
              }));
            }
          },

          logout: async () => {
            set((state) => ({
              ...initialState,
              lastUpdated: Date.now(),
            }));
          },

          updateProfile: async (updates) => {
            const currentUser = get().currentUser;
            if (!currentUser) throw new Error('No current user');

            set((state) => ({
              ...state,
              isLoading: true,
            }));

            try {
              const updatedUser = await UserApiService.updateProfile(currentUser.id, updates);
              
              set((state) => ({
                ...state,
                currentUser: updatedUser,
                isLoading: false,
                lastUpdated: Date.now(),
              }));
            } catch (error) {
              set((state) => ({
                ...state,
                isLoading: false,
                error: error instanceof Error ? error.message : 'Update failed',
              }));
            }
          },

          // 附身账号管理
          addPossessionAccount: async (accountData) => {
            const currentUser = get().currentUser;
            if (!currentUser) throw new Error('No current user');

            const newAccount: PossessionAccount = {
              ...accountData,
              id: 'account_' + Math.random().toString(36).substr(2, 9),
              userId: currentUser.id,
              createdAt: Date.now(),
              updatedAt: Date.now(),
            };

            set((state) => ({
              ...state,
              possessionAccounts: [...state.possessionAccounts, newAccount],
              lastUpdated: Date.now(),
            }));
          },

          removePossessionAccount: async (accountId) => {
            set((state) => ({
              ...state,
              possessionAccounts: state.possessionAccounts.filter(acc => acc.id !== accountId),
              activePossessionAccount: state.activePossessionAccount?.id === accountId 
                ? null 
                : state.activePossessionAccount,
              lastUpdated: Date.now(),
            }));
          },

          switchPossessionAccount: async (accountId) => {
            set((state) => ({
              ...state,
              switchAccountState: { loading: true, error: null, success: false },
            }));

            try {
              // 模拟切换延迟
              await new Promise(resolve => setTimeout(resolve, 500));
              
              const account = get().possessionAccounts.find(acc => acc.id === accountId);
              if (!account) throw new Error('Account not found');

              set((state) => ({
                ...state,
                activePossessionAccount: account,
                possessionAccounts: state.possessionAccounts.map(acc => ({
                  ...acc,
                  isActive: acc.id === accountId
                })),
                switchAccountState: { loading: false, error: null, success: true },
                lastUpdated: Date.now(),
              }));
            } catch (error) {
              set((state) => ({
                ...state,
                switchAccountState: { 
                  loading: false, 
                  error: error instanceof Error ? error.message : 'Switch failed', 
                  success: false 
                },
                error: error instanceof Error ? error.message : 'Switch failed',
              }));
            }
          },

          updatePossessionAccount: async (accountId, updates) => {
            set((state) => ({
              ...state,
              possessionAccounts: state.possessionAccounts.map(acc => 
                acc.id === accountId 
                  ? { ...acc, ...updates, updatedAt: Date.now() }
                  : acc
              ),
              activePossessionAccount: state.activePossessionAccount?.id === accountId
                ? { ...state.activePossessionAccount, ...updates, updatedAt: Date.now() }
                : state.activePossessionAccount,
              lastUpdated: Date.now(),
            }));
          },

          // 用户状态管理
          setUserStatus: async (status) => {
            const currentUser = get().currentUser;
            if (!currentUser) return;

            set((state) => ({
              ...state,
              currentUser: {
                ...currentUser,
                status,
                lastSeenAt: Date.now(),
                updatedAt: Date.now(),
              },
              lastUpdated: Date.now(),
            }));
          },

          updateOnlineUsers: (users) => {
            set((state) => ({
              ...state,
              onlineUsers: users,
              lastUpdated: Date.now(),
            }));
          },

          // 重置状态
          resetUserState: () => {
            set(() => ({
              ...initialState,
              lastUpdated: Date.now(),
            }));
          },

          // 选择器（性能优化）
          getCurrentUser: () => get().currentUser,
          
          getPossessionAccounts: () => get().possessionAccounts,
          
          getActivePossessionAccount: () => get().activePossessionAccount,
          
          isUserOnline: (userId) => {
            return get().onlineUsers.some(user => user.id === userId && user.status === 'online');
          },
        })
      )
    )
  )
);

// 性能优化的选择器
export const userSelectors = {
  // 基础选择器
  currentUser: (state: UserStore) => state.currentUser,
  possessionAccounts: (state: UserStore) => state.possessionAccounts,
  activePossessionAccount: (state: UserStore) => state.activePossessionAccount,
  onlineUsers: (state: UserStore) => state.onlineUsers,
  
  // 计算选择器
  isLoggedIn: (state: UserStore) => !!state.currentUser,
  hasActivePossession: (state: UserStore) => !!state.activePossessionAccount,
  possessionAccountsCount: (state: UserStore) => state.possessionAccounts.length,
  onlineUsersCount: (state: UserStore) => state.onlineUsers.length,
  
  // 状态选择器
  isLoading: (state: UserStore) => state.isLoading || state.loginState.loading || state.switchAccountState.loading,
  hasError: (state: UserStore) => !!state.error || !!state.loginState.error || !!state.switchAccountState.error,
  
  // 权限选择器
  hasPermission: (permission: string) => (state: UserStore) => {
    return state.activePossessionAccount?.permissions.includes(permission) ?? false;
  },
  
  // 过滤选择器
  getPossessionAccountsByType: (type: PossessionAccount['accountType']) => (state: UserStore) => {
    return state.possessionAccounts.filter(acc => acc.accountType === type);
  },
};

// 导出 hooks
export const useCurrentUser = () => useUserStore(userSelectors.currentUser);
export const usePossessionAccounts = () => useUserStore(userSelectors.possessionAccounts);
export const useActivePossessionAccount = () => useUserStore(userSelectors.activePossessionAccount);
export const useOnlineUsers = () => useUserStore(userSelectors.onlineUsers);
export const useIsLoggedIn = () => useUserStore(userSelectors.isLoggedIn);