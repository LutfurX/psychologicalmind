import React from 'react';
import { signInWithGoogle, logout, auth } from '../lib/firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { LogIn, LogOut, User } from 'lucide-react';

interface AuthProps {
  onProfileClick?: () => void;
}

const Auth: React.FC<AuthProps> = ({ onProfileClick }) => {
  const [user, loading, error] = useAuthState(auth);

  if (loading) return <div className="text-sm text-muted-foreground">Loading...</div>;
  if (error) return <div className="text-sm text-destructive">Error: {error.message}</div>;

  return (
    <div className="flex items-center gap-4">
      {user ? (
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-end">
            <span 
              onClick={onProfileClick}
              className="text-sm font-medium cursor-pointer hover:text-indigo-600 transition-colors"
            >
              {user.displayName}
            </span>
          </div>
          {user.photoURL ? (
            <img 
              src={user.photoURL} 
              alt={user.displayName || 'User'} 
              onClick={onProfileClick}
              className="w-8 h-8 rounded-full border border-border cursor-pointer hover:border-indigo-600 transition-colors"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div 
              onClick={onProfileClick}
              className="w-8 h-8 rounded-full bg-muted flex items-center justify-center border border-border cursor-pointer hover:border-indigo-600 transition-colors"
            >
              <User size={16} className="text-muted-foreground" />
            </div>
          )}
        </div>
      ) : (
        <button 
          onClick={async () => {
            try {
              await signInWithGoogle();
            } catch (e) {
              // Error is handled in firebase.ts
            }
          }}
          className="flex items-center gap-2 px-4 py-2 bg-foreground text-background rounded-full text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <LogIn size={16} /> Login with Google
        </button>
      )}
    </div>
  );
};

export default Auth;
