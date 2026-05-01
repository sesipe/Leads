import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User, signInWithEmailAndPassword } from 'firebase/auth';
import { auth, db, loginWithGoogle as firebaseLogin, logout as firebaseLogout } from '../../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { UserProfile } from '../../types';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  isAdmin: boolean;
  isOperator: boolean;
  loading: boolean;
  loginWithGoogle: () => Promise<void>;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({ 
  user: null, 
  profile: null,
  isAdmin: false, 
  isOperator: false,
  loading: true,
  loginWithGoogle: async () => {},
  loginWithEmail: async () => {},
  logout: async () => {}
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isOperator, setIsOperator] = useState(false);
  const [loading, setLoading] = useState(true);

  const loginWithGoogle = async () => {
    await firebaseLogin();
  };

  const loginWithEmail = async (email: string, pass: string) => {
    await signInWithEmailAndPassword(auth, email, pass);
  };

  const logout = async () => {
    await firebaseLogout();
  };

  useEffect(() => {
    return onAuthStateChanged(auth, async (currentUser) => {
      setLoading(true);
      setUser(currentUser);
      
      if (currentUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
          const masterAdmins = ['maykon.euro@gmail.com', 'tablet.diretoriaeducacao@gmail.com'];
          const isMaster = masterAdmins.includes(currentUser.email?.toLowerCase() || '');

          if (userDoc.exists()) {
            const data = userDoc.data() as UserProfile;
            setProfile(data);
            setIsAdmin(data.role === 'admin' || isMaster);
            setIsOperator(data.role === 'operator');
          } else if (isMaster) {
            // Se for admin master mas não tem perfil ainda, tratamos como admin
            setIsAdmin(true);
            setProfile({
              uid: currentUser.uid,
              email: currentUser.email || '',
              role: 'admin',
              name: currentUser.displayName || 'Admin Master'
            });
          } else {
            setProfile(null);
            setIsAdmin(false);
            setIsOperator(false);
          }
        } catch (err) {
          console.error("Erro ao carregar perfil:", err);
          setIsAdmin(false);
          setIsOperator(false);
        }
      } else {
        setProfile(null);
        setIsAdmin(false);
        setIsOperator(false);
      }
      setLoading(false);
    });
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, isAdmin, isOperator, loading, loginWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
