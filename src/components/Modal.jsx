import React, { useState, useEffect, useContext } from "react";
import PropTypes from "prop-types";
import ReactDOM from "react-dom";
import { useNavigate } from "react-router-dom";
import { itemStatus } from "../utils/itemStatus";
import { formatField, formatMoney } from "../utils/formatString";
import { 
  GoogleAuthProvider, 
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  updateProfile 
} from "firebase/auth";
import { doc, setDoc, getDoc, updateDoc } from "firebase/firestore";
import { auth, db } from "../firebase/config";
import { ModalsContext } from "../contexts/ModalsContext";
import { ModalTypes } from "../utils/modalTypes";

// =============================================================================
// BID INCREMENT CONFIGURATION
// =============================================================================
const BID_INCREMENT = { label: '+$50,000', value: 50000 };

// =============================================================================
// ICON COMPONENTS
// =============================================================================
const GoogleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
);

const EmailIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
  </svg>
);

// =============================================================================
// BASE MODAL COMPONENT
// =============================================================================
const Modal = ({ type, title, children }) => {
  const { closeModal, currentModal } = useContext(ModalsContext);

  if (type !== currentModal) return null;

  return ReactDOM.createPortal(
    <div
      className="modal fade show"
      style={{ display: "block", backgroundColor: "rgba(0,0,0,0.8)" }}
      onClick={closeModal}
    >
      <div
        className="modal-dialog modal-dialog-centered modal-dialog-scrollable"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">{title}</h5>
            <button className="btn-close" onClick={closeModal} />
          </div>
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
};

Modal.propTypes = {
  type: PropTypes.string,
  title: PropTypes.string,
  children: PropTypes.node
};

// =============================================================================
// ITEM MODAL (Bidding Interface)
// =============================================================================
const ItemModal = () => {
  const { activeItem, openModal, closeModal } = useContext(ModalsContext);
  const [secondaryImageSrc, setSecondaryImageSrc] = useState("");
  const [selectedIncrement, setSelectedIncrement] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState({ message: "", type: "" });
  const [currentBid, setCurrentBid] = useState(0);
  const [isApproved, setIsApproved] = useState(false);
  const [isCheckingApproval, setIsCheckingApproval] = useState(true);

  useEffect(() => {
    if (activeItem.secondaryImage === undefined) return;
    import(`../assets/${activeItem.secondaryImage}.png`).then((src) => {
      setSecondaryImageSrc(src.default);
    });
  }, [activeItem.secondaryImage]);

  useEffect(() => {
    const status = itemStatus(activeItem);
    setCurrentBid(status.amount);
  }, [activeItem]);

  useEffect(() => {
    const checkApproval = async () => {
      setIsCheckingApproval(true);
      if (auth.currentUser) {
        try {
          const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
          if (userDoc.exists()) {
            setIsApproved(userDoc.data().approvedToBid === true);
          }
        } catch (error) {
          console.error("Error checking approval:", error);
        }
      }
      setIsCheckingApproval(false);
    };
    checkApproval();
  }, []);

  const delayedClose = () => {
    setTimeout(() => {
      closeModal();
      setFeedback({ message: "", type: "" });
      setSelectedIncrement(null);
    }, 1500);
  };

  const handleSelectIncrement = (increment) => {
    setSelectedIncrement(increment);
    setFeedback({ message: "", type: "" });
  };

  const handleSubmitBid = async () => {
    if (!auth.currentUser) {
      setFeedback({ message: "Please sign in first", type: "error" });
      setTimeout(() => openModal(ModalTypes.SIGN_UP), 1000);
      return;
    }

    if (!auth.currentUser.displayName) {
      setFeedback({ message: "Please complete registration first", type: "error" });
      setTimeout(() => openModal(ModalTypes.SIGN_UP), 1000);
      return;
    }

    if (!isApproved) {
      setFeedback({ 
        message: "Your bidding registration is pending approval. Please complete the verification form.", 
        type: "warning" 
      });
      return;
    }

    if (!selectedIncrement) {
      setFeedback({ message: "Please select a bid increment", type: "error" });
      return;
    }

    const nowTime = new Date().getTime();
    
    if (activeItem.endTime - nowTime < 0) {
      setFeedback({ message: "This auction has ended", type: "error" });
      delayedClose();
      return;
    }

    setIsSubmitting(true);

    try {
      const status = itemStatus(activeItem);
      const bidAmount = status.amount + selectedIncrement.value;

      await updateDoc(doc(db, "auction", "items"), {
        [formatField(activeItem.id, status.bids + 1)]: {
          amount: bidAmount,
          uid: auth.currentUser.uid,
          timestamp: new Date().toISOString()
        },
      });

      setFeedback({ 
        message: `Bid placed: ${formatMoney(activeItem.currency, bidAmount)}`, 
        type: "success" 
      });
      delayedClose();
    } catch (error) {
      console.error("Bid error:", error);
      setFeedback({ 
        message: error.code === "permission-denied" 
          ? "You need to be approved to bid" 
          : "Error placing bid. Please try again.", 
        type: "error" 
      });
    }
    
    setIsSubmitting(false);
  };

  return (
    <Modal type={ModalTypes.ITEM} title={activeItem.title}>
      <div className="modal-body">
        <p className="mb-3">{activeItem.detail}</p>
        
        {secondaryImageSrc && (
          <img 
            src={secondaryImageSrc} 
            className="img-fluid mb-4" 
            alt={activeItem.title}
            style={{ borderRadius: '2px' }}
          />
        )}

        <div className="current-bid-container mb-4">
          <div className="current-bid-label">CURRENT BID</div>
          <div className="current-bid-amount">
            {formatMoney(activeItem.currency, currentBid)}
          </div>
        </div>

        {!isCheckingApproval && !isApproved && auth.currentUser && (
          <div className="approval-warning mb-4">
            <div className="approval-warning-text">
              ⚠️ Your registration is pending approval.
              <br />
              <a 
                href="/bidder-verification" 
                target="_blank" 
                rel="noopener noreferrer"
                style={{ color: '#F6931B', textDecoration: 'underline' }}
              >
                Complete verification form →
              </a>
            </div>
          </div>
        )}

        <div className="mb-3">
          <label className="form-label">BID INCREMENT</label>
          <div className="bid-buttons">
            <button
              className={`btn-bid-increment single ${selectedIncrement ? 'selected' : ''}`}
              onClick={() => handleSelectIncrement(BID_INCREMENT)}
              disabled={isSubmitting || !isApproved}
            >
              {BID_INCREMENT.label}
            </button>
          </div>
        </div>

        {selectedIncrement && (
          <div className="text-center mb-3">
            <span className="font-mono" style={{ color: '#BDBDBD' }}>
              Your bid: {formatMoney(activeItem.currency, currentBid + selectedIncrement.value)}
            </span>
          </div>
        )}

        {feedback.message && (
          <div className={`alert alert-${feedback.type === 'success' ? 'success' : feedback.type === 'warning' ? 'warning' : 'danger'} mb-3`}>
            {feedback.message}
          </div>
        )}
      </div>

      <div className="modal-footer">
        <button 
          type="button" 
          className="btn btn-secondary" 
          onClick={closeModal}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="btn btn-primary"
          onClick={handleSubmitBid}
          disabled={isSubmitting || !selectedIncrement || !isApproved}
        >
          {isSubmitting ? "Placing bid..." : "PLACE BID"}
        </button>
      </div>
    </Modal>
  );
};

// =============================================================================
// SIGN UP MODAL - WITH GOOGLE + EMAIL/PASSWORD + TABS
// =============================================================================
const SignUpModal = () => {
  const { closeModal, openModal } = useContext(ModalsContext);
  
  // UI State
  const [activeTab, setActiveTab] = useState("google"); // "google" or "email"
  const [mode, setMode] = useState("signin"); // "signin", "signup", "forgot", "verify"
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  
  // Form State
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");

  // Reset form when switching tabs
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setMode("signin");
    setError("");
    setSuccess("");
    setEmail("");
    setPassword("");
    setName("");
  };

  // ===== GOOGLE SIGN-IN =====
  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError("");

    const provider = new GoogleAuthProvider();
    
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      const userDocRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        await setDoc(userDocRef, {
          name: user.displayName || "Anonymous",
          email: user.email,
          photoURL: user.photoURL || "",
          admin: "",
          approvedToBid: false,
          createdAt: new Date().toISOString(),
          provider: "google"
        });
      }

      setSuccess("Signed in successfully!");
      setTimeout(() => closeModal(), 1500);

    } catch (error) {
      console.error("Google sign-in error:", error);
      if (error.code === "auth/popup-closed-by-user") {
        setError("Sign-in cancelled.");
      } else if (error.code === "auth/popup-blocked") {
        setError("Popup blocked. Please allow popups.");
      } else {
        setError("Sign-in failed. Please try again.");
      }
    }
    setLoading(false);
  };

  // ===== EMAIL SIGN UP =====
  const handleEmailSignUp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      setLoading(false);
      return;
    }

    try {
      console.log("Creating user account...");
      const result = await createUserWithEmailAndPassword(auth, email, password);
      const user = result.user;
      console.log("User created:", user.uid);

      // Update display name
      try {
        await updateProfile(user, { displayName: name });
        console.log("Profile updated with name:", name);
      } catch (profileError) {
        console.warn("Profile update failed:", profileError);
        // Continue anyway - not critical
      }

      // Create Firestore document
      try {
        await setDoc(doc(db, "users", user.uid), {
          name: name,
          email: user.email,
          photoURL: "",
          admin: "",
          approvedToBid: false,
          emailVerified: false,
          createdAt: new Date().toISOString(),
          provider: "email"
        });
        console.log("Firestore document created");
      } catch (firestoreError) {
        console.warn("Firestore document creation failed:", firestoreError);
        // Continue anyway - user can still sign in
      }

      // Send verification email (uses Firebase's built-in template)
      try {
        await sendEmailVerification(user);
        console.log("Verification email sent");
        setSuccess("Account created! Check your email for verification link.");
      } catch (emailError) {
        console.warn("Verification email failed:", emailError);
        setSuccess("Account created! Click 'Resend' below if you don't receive the verification email.");
      }

      // Always show verification screen on success
      setMode("verify");

    } catch (error) {
      console.error("Email sign-up error:", error);
      if (error.code === "auth/email-already-in-use") {
        setError("Email already registered. Please sign in.");
      } else if (error.code === "auth/invalid-email") {
        setError("Invalid email address.");
      } else if (error.code === "auth/weak-password") {
        setError("Password is too weak.");
      } else {
        setError("Registration failed: " + error.message);
      }
    }
    setLoading(false);
  };

  // ===== RESEND VERIFICATION EMAIL =====
  const handleResendVerification = async () => {
    setLoading(true);
    setError("");
    
    try {
      const user = auth.currentUser;
      if (user) {
        await sendEmailVerification(user);
        setSuccess("Verification email sent! Check your inbox and spam folder.");
      } else {
        setError("Please sign in first to resend verification.");
      }
    } catch (error) {
      console.error("Resend verification error:", error);
      if (error.code === "auth/too-many-requests") {
        setError("Too many requests. Please wait a few minutes.");
      } else {
        setError("Failed to send verification email. Please try again later.");
      }
    }
    setLoading(false);
  };

  // ===== EMAIL SIGN IN =====
  const handleEmailSignIn = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      const user = result.user;

      // Check if user doc exists, create if not (for admin account)
      const userDocRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        await setDoc(userDocRef, {
          name: user.displayName || user.email.split("@")[0],
          email: user.email,
          photoURL: "",
          admin: "",
          approvedToBid: false,
          emailVerified: user.emailVerified,
          createdAt: new Date().toISOString(),
          provider: "email"
        });
      }

      setSuccess("Signed in successfully!");
      setTimeout(() => closeModal(), 1500);

    } catch (error) {
      console.error("Email sign-in error:", error);
      if (error.code === "auth/user-not-found") {
        setError("No account found. Please sign up.");
      } else if (error.code === "auth/wrong-password") {
        setError("Incorrect password.");
      } else if (error.code === "auth/invalid-email") {
        setError("Invalid email address.");
      } else if (error.code === "auth/invalid-credential") {
        setError("Invalid email or password.");
      } else {
        setError("Sign-in failed. Please try again.");
      }
    }
    setLoading(false);
  };

  // ===== PASSWORD RESET =====
  const handlePasswordReset = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await sendPasswordResetEmail(auth, email);
      setSuccess("Password reset email sent! Check your inbox.");
    } catch (error) {
      console.error("Password reset error:", error);
      if (error.code === "auth/user-not-found") {
        setError("No account found with this email.");
      } else if (error.code === "auth/invalid-email") {
        setError("Invalid email address.");
      } else {
        setError("Failed to send reset email. Please try again.");
      }
    }
    setLoading(false);
  };

  // ===== RENDER =====
  return (
    <Modal type={ModalTypes.SIGN_UP} title={mode === "forgot" ? "Reset Password" : "Sign In / Register"}>
      <div className="modal-body">
        
        {/* Success Message */}
        {success && (
          <div className="alert alert-success mb-3">
            ✓ {success}
          </div>
        )}

        {/* Verification Sent Screen */}
        {mode === "verify" && (
          <div className="text-center py-4">
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>✅</div>
            <h4>Account Created!</h4>
            
            {success && (
              <div className="alert alert-success mb-3" style={{ textAlign: 'left' }}>
                {success}
              </div>
            )}
            
            <p style={{ color: '#BDBDBD' }}>
              We've sent a verification link to <strong>{email}</strong>
            </p>
            <p style={{ fontSize: '14px', color: '#6F6F6F' }}>
              Click the link in the email to verify your account, then return here to sign in.
            </p>
            <p style={{ fontSize: '13px', color: '#6F6F6F', marginTop: '16px' }}>
              <strong>Didn't receive the email?</strong><br />
              Check your spam folder, or click below to resend.
            </p>
            
            {error && <div className="alert alert-danger mb-3">{error}</div>}
            
            <button 
              className="btn btn-primary mb-2"
              onClick={handleResendVerification}
              disabled={loading}
              style={{ width: '100%' }}
            >
              {loading ? "Sending..." : "RESEND VERIFICATION EMAIL"}
            </button>
            
            <button 
              className="btn btn-secondary"
              onClick={() => { setMode("signin"); setSuccess(""); setError(""); }}
              style={{ width: '100%' }}
            >
              ← Back to Sign In
            </button>
          </div>
        )}

        {/* Password Reset Screen */}
        {mode === "forgot" && !success && (
          <form onSubmit={handlePasswordReset}>
            <p style={{ color: '#BDBDBD', marginBottom: '20px' }}>
              Enter your email and we'll send you a reset link.
            </p>
            
            <div className="mb-3">
              <input
                type="email"
                className="form-control"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            {error && <div className="alert alert-danger mb-3">{error}</div>}

            <button 
              type="submit" 
              className="btn btn-primary w-100 mb-3"
              disabled={loading}
            >
              {loading ? "Sending..." : "Send Reset Link"}
            </button>

            <button 
              type="button"
              className="btn btn-link w-100"
              onClick={() => { setMode("signin"); setError(""); setSuccess(""); }}
              style={{ color: '#BDBDBD' }}
            >
              ← Back to Sign In
            </button>
          </form>
        )}

        {/* Main Sign In / Sign Up Screen */}
        {mode !== "verify" && mode !== "forgot" && !success && (
          <>
            {/* Tab Buttons */}
            <div className="auth-tabs mb-4">
              <button
                className={`auth-tab ${activeTab === "google" ? "active" : ""}`}
                onClick={() => handleTabChange("google")}
              >
                <GoogleIcon /> Google
              </button>
              <button
                className={`auth-tab ${activeTab === "email" ? "active" : ""}`}
                onClick={() => handleTabChange("email")}
              >
                <EmailIcon /> Email
              </button>
            </div>

            {/* Google Tab Content */}
            {activeTab === "google" && (
              <>
                <p style={{ color: '#BDBDBD', marginBottom: '20px' }}>
                  Sign in with your Google account. Quick and secure.
                </p>
                
                <button
                  className="btn-google mb-3"
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                >
                  <GoogleIcon />
                  <span>{loading ? "Signing in..." : "Continue with Google"}</span>
                </button>

                {error && <div className="alert alert-danger mb-3">{error}</div>}
              </>
            )}

            {/* Email Tab Content */}
            {activeTab === "email" && (
              <>
                {/* Sign In / Sign Up Toggle */}
                <div className="auth-mode-toggle mb-3">
                  <button
                    className={`auth-mode-btn ${mode === "signin" ? "active" : ""}`}
                    onClick={() => { setMode("signin"); setError(""); }}
                  >
                    Sign In
                  </button>
                  <button
                    className={`auth-mode-btn ${mode === "signup" ? "active" : ""}`}
                    onClick={() => { setMode("signup"); setError(""); }}
                  >
                    Create Account
                  </button>
                </div>

                {/* Sign Up Form */}
                {mode === "signup" && (
                  <form onSubmit={handleEmailSignUp}>
                    <div className="mb-3">
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Full name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                      />
                    </div>
                    <div className="mb-3">
                      <input
                        type="email"
                        className="form-control"
                        placeholder="Email address"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>
                    <div className="mb-3">
                      <input
                        type="password"
                        className="form-control"
                        placeholder="Password (min 8 characters)"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        minLength={8}
                        required
                      />
                    </div>

                    {error && <div className="alert alert-danger mb-3">{error}</div>}

                    <button 
                      type="submit" 
                      className="btn btn-primary w-100"
                      disabled={loading}
                    >
                      {loading ? "Creating account..." : "Create Account"}
                    </button>
                  </form>
                )}

                {/* Sign In Form */}
                {mode === "signin" && (
                  <form onSubmit={handleEmailSignIn}>
                    <div className="mb-3">
                      <input
                        type="email"
                        className="form-control"
                        placeholder="Email address"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>
                    <div className="mb-3">
                      <input
                        type="password"
                        className="form-control"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                    </div>

                    {error && <div className="alert alert-danger mb-3">{error}</div>}

                    <button 
                      type="submit" 
                      className="btn btn-primary w-100 mb-2"
                      disabled={loading}
                    >
                      {loading ? "Signing in..." : "Sign In"}
                    </button>

                    <button 
                      type="button"
                      className="btn btn-link w-100"
                      onClick={() => { setMode("forgot"); setError(""); }}
                      style={{ color: '#F6931B', fontSize: '14px' }}
                    >
                      Forgot password?
                    </button>
                  </form>
                )}
              </>
            )}

            {/* Info Box */}
            <div 
              className="mt-4 p-3" 
              style={{ 
                backgroundColor: 'rgba(246, 147, 27, 0.1)', 
                border: '1px solid #F6931B',
                borderRadius: '2px'
              }}
            >
              <h6 style={{ color: '#F6931B', marginBottom: '8px' }}>
                VERIFICATION REQUIRED
              </h6>
              <p style={{ fontSize: '14px', color: '#BDBDBD', marginBottom: '0' }}>
                After registration, complete the{' '}
                <a 
                  href="/bidder-verification" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  style={{ color: '#F6931B' }}
                >
                  bidder verification form
                </a>{' '}
                to enable bidding.
              </p>
            </div>
          </>
        )}
      </div>

      {mode !== "verify" && !success && (
        <div className="modal-footer">
          <button 
            type="button" 
            className="btn btn-secondary" 
            onClick={closeModal}
          >
            Cancel
          </button>
        </div>
      )}
    </Modal>
  );
};

export { ItemModal, SignUpModal };
