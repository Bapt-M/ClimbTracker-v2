import { useSession, signOut } from '../lib/auth-client';
import type { ClimbTrackerUser } from '../lib/auth-client';

export interface AuthUser {
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
  isPremium?: boolean;
}

export const useAuth = () => {
  const { data: session, isPending, error } = useSession();

  const user: AuthUser | null = session?.user
    ? {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        role: (session.user as ClimbTrackerUser).role || 'CLIMBER',
        image: session.user.image || undefined,
        bio: (session.user as ClimbTrackerUser).bio,
        firstName: (session.user as ClimbTrackerUser).firstName,
        lastName: (session.user as ClimbTrackerUser).lastName,
        age: (session.user as ClimbTrackerUser).age,
        height: (session.user as ClimbTrackerUser).height,
        wingspan: (session.user as ClimbTrackerUser).wingspan,
        profilePhoto: (session.user as ClimbTrackerUser).profilePhoto,
        additionalPhotos: (session.user as ClimbTrackerUser).additionalPhotos,
        isPremium: (session.user as ClimbTrackerUser).isPremium,
      }
    : null;

  const logout = async () => {
    await signOut();
  };

  return {
    user,
    session,
    isAuthenticated: !!session,
    isLoading: isPending,
    error: error?.message || null,
    logout,
  };
};
