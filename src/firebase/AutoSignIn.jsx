import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { getDoc, doc } from "firebase/firestore";
import { auth, db } from "./config";

/**
 * Auth State Hook - Tracks user authentication state
 * NO ANONYMOUS AUTH - Users must explicitly sign in via Google or Email
 */
export const AutoSignIn = () => {
  const [user, setUser] = useState(null);
  const [admin, setAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        console.debug(`User signed in: ${currentUser.email || currentUser.uid}`);
        setUser(currentUser);

        // Check if user is admin
        try {
          const userDocRef = doc(db, "users", currentUser.uid);
          const docSnap = await getDoc(userDocRef);
          if (docSnap.exists() && docSnap.data().admin) {
            console.debug("User is admin");
            setAdmin(true);
          } else {
            setAdmin(false);
          }
        } catch (error) {
          console.error("Error checking admin status:", error);
          setAdmin(false);
        }
      } else {
        // User is not signed in - DO NOT auto-sign in anonymously
        console.debug("No user signed in");
        setUser(null);
        setAdmin(false);
      }
      setLoading(false);
    });

    // Clean up listener on unmount
    return () => unsubscribe();
  }, []);

  return { user, admin, loading };
};
