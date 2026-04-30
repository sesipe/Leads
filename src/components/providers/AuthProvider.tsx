import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, db, loginWithGoogle as firebaseLogin, logout as firebaseLogout } from '../../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

interface AuthContextType {
  user: User | null;
  isAdmin: boolean;
  loading: boolean;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({ 
  user: null, 
  isAdmin: false, 
  loading: true,
  loginWithGoogle: async () => {},
  logout: async () => {}
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const loginWithGoogle = async () => {
    await firebaseLogin();
  };

  const logout = async () => {
    await firebaseLogout();
  };

  useEffect(() => {
    return onAuthStateChanged(auth, async (currentUser) => {
      setLoading(true);
      setUser(currentUser);
      if (currentUser) {
        console.log("Usuário autenticado:", currentUser.email, currentUser.uid);
        try {
          const isEmailAdmin = [
            'maykon.euro@gmail.com',
            'tablet.diretoriaeducacao@gmail.com'
          ].includes(currentUser.email?.toLowerCase() || '');
          
          if (isEmailAdmin) {
            console.log("Acesso garantido via lista de e-mails.");
            setIsAdmin(true);
          } else {
            console.log("Verificando coleção 'admins' no Firestore...");
            const adminDoc = await getDoc(doc(db, 'admins', currentUser.uid));
            setIsAdmin(adminDoc.exists());
            console.log("Resultado da verificação Firestore:", adminDoc.exists());
          }
        } catch (err) {
          console.error("Erro ao validar admin:", err);
          // Mesmo com erro no Firestore, se o e-mail estiver na lista hardcoded, permitimos
          const isEmailAdmin = [
            'maykon.euro@gmail.com',
            'tablet.diretoriaeducacao@gmail.com'
          ].includes(currentUser.email?.toLowerCase() || '');
          setIsAdmin(isEmailAdmin);
        }
      } else {
        setIsAdmin(false);
      }
      setLoading(false);
    });
  }, []);

  return (
    <AuthContext.Provider value={{ user, isAdmin, loading, loginWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
