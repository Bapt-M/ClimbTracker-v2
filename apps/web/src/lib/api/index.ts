const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Base fetch wrapper with credentials
async function fetchAPI<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'An error occurred' }));
    throw new Error(error.message || `HTTP error! status: ${response.status}`);
  }

  return response.json();
}

// Route types
export interface Route {
  id: string;
  name: string;
  difficulty: string;
  holdColorHex: string;
  holdColorCategory: string;
  sector: string;
  routeTypes?: string[];
  description?: string;
  tips?: string;
  openerId: string;
  opener?: {
    id: string;
    name: string;
    email: string;
    image?: string;
  };
  mainPhoto: string;
  openingVideo?: string;
  status: 'PENDING' | 'ACTIVE' | 'ARCHIVED';
  openedAt: string;
  closedAt?: string;
  createdAt: string;
  updatedAt: string;
  validationsCount?: number;
  commentsCount?: number;
}

export interface RouteFilters {
  difficulty?: string | string[];
  holdColorCategory?: string | string[];
  sector?: string | string[];
  routeTypes?: string | string[];
  status?: string | string[];
  search?: string;
  page?: number;
  limit?: number;
  sortField?: 'createdAt' | 'openedAt' | 'name' | 'difficulty';
  sortOrder?: 'ASC' | 'DESC';
  openedAtFrom?: string;
  openedAtTo?: string;
}

export interface PaginatedRoutes {
  data: Route[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface RouteCreateInput {
  name: string;
  difficulty: string;
  holdColorHex: string;
  holdColorCategory: string;
  sector: string;
  routeTypes?: string[];
  description?: string;
  tips?: string;
  mainPhoto: string;
  openingVideo?: string;
  openedAt?: string;
}

export interface RouteUpdateInput {
  name?: string;
  difficulty?: string;
  holdColorHex?: string;
  holdColorCategory?: string;
  sector?: string;
  routeTypes?: string[];
  description?: string;
  tips?: string;
  mainPhoto?: string;
  openingVideo?: string;
  openedAt?: string;
}

// Validation types
export interface Validation {
  id: string;
  userId: string;
  routeId: string;
  status: 'FLASHED' | 'COMPLETED' | 'PROJECT' | 'ATTEMPTED';
  attempts?: number;
  isFavorite: boolean;
  personalNote?: string;
  validatedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface ValidationCreateInput {
  routeId: string;
  status: 'FLASHED' | 'COMPLETED' | 'PROJECT' | 'ATTEMPTED';
  attempts?: number;
  isFavorite?: boolean;
  personalNote?: string;
}

// Comment types
export interface Comment {
  id: string;
  content: string;
  userId: string;
  routeId: string;
  user?: {
    id: string;
    name: string;
    image?: string;
  };
  mediaUrl?: string;
  mediaType?: 'IMAGE' | 'VIDEO';
  createdAt: string;
  updatedAt: string;
}

// User types
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'CLIMBER' | 'OPENER' | 'ADMIN';
  image?: string;
  bio?: string;
  firstName?: string;
  lastName?: string;
  age?: number;
  height?: number;
  wingspan?: number;
  profilePhoto?: string;
  additionalPhotos?: string[];
  createdAt: string;
  updatedAt: string;
}

// Leaderboard types
export interface LeaderboardUser {
  rank: number;
  userId: string;
  name: string;
  avatar?: string;
  points: number;
  totalValidations: number;
  validatedGrade?: string;
  flashRate: number;
}

export interface LeaderboardResponse {
  users: LeaderboardUser[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalUsers: number;
    hasMore: boolean;
  };
}

export interface LeaderboardFilters {
  tab?: 'global' | 'friends';
  page?: number;
  limit?: number;
}

export interface ValidationDetail {
  routeId: string;
  routeName: string;
  difficulty: string;
  sector: string;
  attempts: number;
  isFlashed: boolean;
  validatedAt: string;
  basePoints: number;
  routeDifficultyFactor: number;
  attemptsMultiplier: number;
  totalPoints: number;
}

export interface UserValidationDetails {
  totalPoints: number;
  validations: ValidationDetail[];
}

// User stats types
export interface UserStats {
  totalValidations: number;
  totalComments: number;
  totalPoints: number;
  maxDifficulty: string | null;
  validationsByDifficulty: { difficulty: string; count: number }[];
  recentValidations: {
    id: string;
    validatedAt: string;
    route: {
      id: string;
      name: string;
      difficulty: string;
      sector: string;
    };
  }[];
}

export interface UserPublicProfile extends User {
  // Extended profile fields
}

// Friendship types
export enum FriendshipStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
}

export interface Friendship {
  id: string;
  requesterId: string;
  addresseeId: string;
  status: FriendshipStatus | 'pending' | 'accepted' | 'rejected';
  createdAt: string;
  updatedAt: string;
}

export interface FriendshipWithUser {
  id: string;
  user: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
  };
  status: FriendshipStatus;
  createdAt: string;
}

export interface UserSearchResult {
  id: string;
  name: string;
  email: string;
  friendshipStatus: FriendshipStatus | null;
  isRequester?: boolean;
}

// Build query string from filters
function buildQueryString(params: Record<string, any>): string {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null) return;

    if (Array.isArray(value)) {
      value.forEach(v => searchParams.append(key, v));
    } else {
      searchParams.append(key, String(value));
    }
  });

  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : '';
}

// Routes API
export const routesAPI = {
  getRoutes: async (filters: RouteFilters = {}): Promise<PaginatedRoutes> => {
    const queryString = buildQueryString(filters);
    const response = await fetchAPI<{ data: PaginatedRoutes }>(`/api/routes${queryString}`);
    return response.data;
  },

  getRouteById: async (id: string): Promise<Route> => {
    const response = await fetchAPI<{ data: { route: Route } }>(`/api/routes/${id}`);
    return response.data.route;
  },

  createRoute: async (data: RouteCreateInput): Promise<Route> => {
    const response = await fetchAPI<{ data: { route: Route } }>('/api/routes', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.data.route;
  },

  updateRoute: async (id: string, data: RouteUpdateInput): Promise<Route> => {
    const response = await fetchAPI<{ data: { route: Route } }>(`/api/routes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return response.data.route;
  },

  deleteRoute: async (id: string): Promise<void> => {
    await fetchAPI(`/api/routes/${id}`, { method: 'DELETE' });
  },

  updateRouteStatus: async (id: string, status: 'PENDING' | 'ACTIVE' | 'ARCHIVED'): Promise<Route> => {
    const response = await fetchAPI<{ data: { route: Route } }>(`/api/routes/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
    return response.data.route;
  },

  getRoutesStats: async (): Promise<any> => {
    const response = await fetchAPI<{ data: { stats: any } }>('/api/routes/stats');
    return response.data.stats;
  },
};

// Validations API
export const validationsAPI = {
  getUserValidations: async (): Promise<Validation[]> => {
    // This endpoint returns a flat array directly
    const response = await fetchAPI<Validation[]>('/api/validations/user');
    return response;
  },

  getRouteValidations: async (routeId: string): Promise<Validation[]> => {
    const response = await fetchAPI<{ success: boolean; data: { validations: Validation[] } }>(`/api/validations/route/${routeId}`);
    return response.data?.validations || [];
  },

  createValidation: async (data: ValidationCreateInput): Promise<Validation> => {
    const response = await fetchAPI<{ success: boolean; data: { validation: Validation } }>('/api/validations', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.data.validation;
  },

  updateValidation: async (id: string, data: Partial<ValidationCreateInput>): Promise<Validation> => {
    const response = await fetchAPI<{ success: boolean; data: { validation: Validation } }>(`/api/validations/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return response.data.validation;
  },

  deleteValidation: async (id: string): Promise<void> => {
    await fetchAPI(`/api/validations/${id}`, { method: 'DELETE' });
  },

  toggleFavorite: async (validationId: string): Promise<Validation> => {
    const response = await fetchAPI<{ success: boolean; data: { validation: Validation } }>(`/api/validations/${validationId}/favorite`, {
      method: 'POST',
    });
    return response.data.validation;
  },
};

// Comments API
export const commentsAPI = {
  getRouteComments: async (routeId: string): Promise<Comment[]> => {
    const response = await fetchAPI<{ success: boolean; data: { comments: Comment[] } }>(`/api/comments/route/${routeId}`);
    return response.data?.comments || [];
  },

  createComment: async (routeId: string, content: string, mediaUrl?: string, mediaType?: 'IMAGE' | 'VIDEO'): Promise<Comment> => {
    const response = await fetchAPI<{ success: boolean; data: { comment: Comment } }>('/api/comments', {
      method: 'POST',
      body: JSON.stringify({ routeId, content, mediaUrl, mediaType }),
    });
    return response.data.comment;
  },

  deleteComment: async (id: string): Promise<void> => {
    await fetchAPI(`/api/comments/${id}`, { method: 'DELETE' });
  },
};

// Users API
export const usersAPI = {
  getCurrentUser: async (): Promise<User> => {
    const response = await fetchAPI<{ success: boolean; data: { user: User } }>('/api/users/me');
    return response.data.user;
  },

  getUserById: async (id: string): Promise<User> => {
    const response = await fetchAPI<{ success: boolean; data: { user: User } }>(`/api/users/${id}`);
    return response.data.user;
  },

  updateProfile: async (data: Partial<User>): Promise<User> => {
    const response = await fetchAPI<{ success: boolean; data: { user: User } }>('/api/users/me', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return response.data.user;
  },

  getUserStats: async (userId: string): Promise<UserStats> => {
    const response = await fetchAPI<UserStats>(`/api/users/${userId}/stats`);
    return response;
  },

  updateUser: async (userId: string, data: Partial<User>): Promise<User> => {
    const response = await fetchAPI<User>(`/api/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return response;
  },

  searchUsers: async (query: string): Promise<User[]> => {
    const response = await fetchAPI<User[]>(`/api/users/search?q=${encodeURIComponent(query)}`);
    return response;
  },
};

// Leaderboard API
export const leaderboardAPI = {
  getLeaderboard: async (filters?: LeaderboardFilters): Promise<LeaderboardResponse> => {
    const endpoint = filters?.tab === 'friends' ? '/api/leaderboard/friends' : '/api/leaderboard';
    const params = {
      period: 'all',
      limit: filters?.limit || 50,
    };
    const queryString = buildQueryString(params);
    const response = await fetchAPI<{ data: { leaderboard: any[]; currentUser: any } }>(`${endpoint}${queryString}`);

    console.log('[leaderboardAPI] Raw response:', response.data?.leaderboard?.[0]);

    // Transform API response to match expected format
    const users: LeaderboardUser[] = (response.data?.leaderboard || []).map((entry: any) => ({
      rank: entry.rank,
      userId: entry.userId,
      name: entry.name,
      avatar: entry.image,
      points: entry.totalPoints ?? entry.totalValidations * 10, // Use real points if available
      totalValidations: entry.totalValidations,
      validatedGrade: entry.maxDifficulty || undefined,
      flashRate: entry.totalFlashed && entry.totalValidations ? (entry.totalFlashed / entry.totalValidations) * 100 : 0,
    }));

    return {
      users,
      pagination: {
        currentPage: filters?.page || 1,
        totalPages: 1,
        totalUsers: users.length,
        hasMore: false,
      },
    };
  },

  getCurrentUserRank: async (): Promise<LeaderboardUser | null> => {
    try {
      // Get current user rank from the main leaderboard endpoint
      const response = await fetchAPI<{ data: { leaderboard: any[]; currentUser: any } }>('/api/leaderboard?limit=100');
      const currentUser = response.data?.currentUser;
      if (!currentUser) return null;

      // Try to get user info from session
      const sessionResponse = await fetch(`${API_URL}/api/auth/get-session`, {
        credentials: 'include',
      });
      const sessionData = await sessionResponse.json();
      const user = sessionData?.user;

      return {
        rank: currentUser.rank,
        userId: user?.id || '',
        name: user?.name || '',
        points: currentUser.totalPoints ?? currentUser.totalValidations * 10,
        totalValidations: currentUser.totalValidations,
        validatedGrade: currentUser.maxDifficulty || undefined,
        flashRate: 0,
      };
    } catch {
      return null;
    }
  },

  getUserValidationDetails: async (userId: string): Promise<UserValidationDetails> => {
    const response = await fetchAPI<{ data: UserValidationDetails }>(`/api/leaderboard/user/${userId}/details`);
    return response.data;
  },
};

// Friendships API
export const friendshipsAPI = {
  getFriends: async (): Promise<FriendshipWithUser[]> => {
    const response = await fetchAPI<{ success: boolean; data: { friends: any[] } }>('/api/friendships');
    return (response.data?.friends || []).map((f: any) => ({
      id: f.friendshipId,
      user: {
        id: f.friend?.id,
        name: f.friend?.name,
        email: f.friend?.email || '',
        avatar: f.friend?.image,
      },
      status: FriendshipStatus.ACCEPTED,
      createdAt: f.acceptedAt,
    }));
  },

  getPendingRequests: async (): Promise<FriendshipWithUser[]> => {
    const response = await fetchAPI<{ success: boolean; data: { received: any[]; sent: any[] } }>('/api/friendships/pending');
    // Return received requests (these are what the user needs to act on)
    return (response.data?.received || []).map((r: any) => ({
      id: r.id,
      user: {
        id: r.user?.id,
        name: r.user?.name,
        email: r.user?.email || '',
        avatar: r.user?.image,
      },
      status: FriendshipStatus.PENDING,
      createdAt: r.createdAt,
    }));
  },

  searchUsers: async (query: string): Promise<UserSearchResult[]> => {
    const response = await fetchAPI<{ success: boolean; data: { users: any[] } }>(`/api/friendships/search?q=${encodeURIComponent(query)}`);
    return (response.data?.users || []).map((u: any) => ({
      id: u.id,
      name: u.name,
      email: u.email || '',
      friendshipStatus: u.friendshipStatus,
      isRequester: u.isRequester,
    }));
  },

  sendFriendRequest: async (userId: string): Promise<Friendship> => {
    const response = await fetchAPI<{ success: boolean; data: { friendship: Friendship } }>('/api/friendships', {
      method: 'POST',
      body: JSON.stringify({ userId }),
    });
    return response.data.friendship;
  },

  acceptFriendRequest: async (id: string): Promise<Friendship> => {
    const response = await fetchAPI<{ success: boolean; data: { friendship: Friendship } }>(`/api/friendships/${id}/accept`, {
      method: 'PUT',
    });
    return response.data.friendship;
  },

  rejectFriendRequest: async (id: string): Promise<void> => {
    await fetchAPI(`/api/friendships/${id}/reject`, { method: 'PUT' });
  },

  removeFriend: async (id: string): Promise<void> => {
    await fetchAPI(`/api/friendships/${id}`, { method: 'DELETE' });
  },
};
