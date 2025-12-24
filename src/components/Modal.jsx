import React, { useState, useEffect, useContext } from "react";
import PropTypes from "prop-types";
import ReactDOM from "react-dom";
import { itemStatus } from "../utils/itemStatus";
import { formatField, formatMoney } from "../utils/formatString";
import { 
  GoogleAuthProvider, 
  signInWithPopup,
  updateProfile 
} from "firebase/auth";
import { doc, setDoc, getDoc, updateDoc } from "firebase/firestore";
import { auth, db } from "../firebase/config";
import { ModalsContext } from "../contexts/ModalsContext";
import { ModalTypes } from "../utils/modalTypes";

// =============================================================================
// BID INCREMENT CONFIGURATION
// =============================================================================
// For a $1M starting price auction, these are professional increments
const BID_INCREMENTS = [
  { label: '+$1,000', value: 1000 },
  { label: '+$5,000', value: 5000 },
  { label: '+$10,000', value: 10000 },
  { label: '+$25,000', value: 25000 },
  { label: '+$50,000', value: 50000 },
];

// =============================================================================
// GOOGLE ICON SVG COMPONENT
// =============================================================================
const GoogleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
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
// ITEM MODAL (Bidding Interface) - WITH FIXED INCREMENTS
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

  // Load secondary image
  useEffect(() => {
    if (activeItem.secondaryImage === undefined) return;
    import(`../assets/${activeItem.secondaryImage}.png`).then((src) => {
      setSecondaryImageSrc(src.default);
    });
  }, [activeItem.secondaryImage]);

  // Calculate current bid
  useEffect(() => {
    const status = itemStatus(activeItem);
    setCurrentBid(status.amount);
  }, [activeItem]);

  // Check if user is approved to bid
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
    // Validation checks
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
    
    // Check if auction ended
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
        {/* Item Description */}
        <p className="mb-3">{activeItem.detail}</p>
        
        {/* Item Image */}
        {secondaryImageSrc && (
          <img 
            src={secondaryImageSrc} 
            className="img-fluid mb-4" 
            alt={activeItem.title}
            style={{ borderRadius: '2px' }}
          />
        )}

        {/* Current Bid Display */}
        <div className="current-bid-container mb-4">
          <div className="current-bid-label">CURRENT BID</div>
          <div className="current-bid-amount">
            {formatMoney(activeItem.currency, currentBid)}
          </div>
        </div>

        {/* Approval Status Warning */}
        {!isCheckingApproval && !isApproved && auth.currentUser && (
          <div className="approval-warning mb-4">
            <div className="approval-warning-text">
              ⚠️ Your registration is pending approval.
              <br />
              <a 
                href="https://zyborn.com/bidder-verification" 
                target="_blank" 
                rel="noopener noreferrer"
                style={{ color: '#F6931B', textDecoration: 'underline' }}
              >
                Complete verification form →
              </a>
            </div>
          </div>
        )}

        {/* Bid Increment Buttons */}
        <div className="mb-3">
          <label className="form-label">SELECT BID INCREMENT</label>
          <div className="bid-buttons">
            {BID_INCREMENTS.map((inc) => (
              <button
                key={inc.value}
                className={`btn-bid-increment ${selectedIncrement?.value === inc.value ? 'selected' : ''}`}
                onClick={() => handleSelectIncrement(inc)}
                disabled={isSubmitting || !isApproved}
              >
                {inc.label}
              </button>
            ))}
          </div>
        </div>

        {/* Preview New Bid Amount */}
        {selectedIncrement && (
          <div className="text-center mb-3">
            <span className="font-mono" style={{ color: '#BDBDBD' }}>
              Your bid: {formatMoney(activeItem.currency, currentBid + selectedIncrement.value)}
            </span>
          </div>
        )}

        {/* Feedback Message */}
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
// SIGN UP MODAL - WITH GOOGLE SIGN-IN
// =============================================================================
const SignUpModal = () => {
  const { closeModal } = useContext(ModalsContext);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError("");

    const provider = new GoogleAuthProvider();
    
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Check if user document exists
      const userDocRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        // Create new user document
        await setDoc(userDocRef, {
          name: user.displayName || "Anonymous",
          email: user.email,
          photoURL: user.photoURL || "",
          admin: "",
          approvedToBid: false,  // Requires manual approval
          createdAt: new Date().toISOString(),
          provider: "google"
        });
        console.log("New user created:", user.uid);
      }

      setSuccess(true);
      
      // Close modal after brief delay
      setTimeout(() => {
        closeModal();
        setSuccess(false);
      }, 1500);

    } catch (error) {
      console.error("Google sign-in error:", error);
      
      // User-friendly error messages
      if (error.code === "auth/popup-closed-by-user") {
        setError("Sign-in cancelled. Please try again.");
      } else if (error.code === "auth/popup-blocked") {
        setError("Popup blocked. Please allow popups for this site.");
      } else {
        setError("Sign-in failed. Please try again.");
      }
    }

    setLoading(false);
  };

  return (
    <Modal type={ModalTypes.SIGN_UP} title="Register to Bid">
      <div className="modal-body">
        {success ? (
          // Success State
          <div className="text-center py-4">
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>✓</div>
            <h4 style={{ color: '#28a745' }}>Registration Successful!</h4>
            <p className="text-muted">
              {auth.currentUser?.displayName ? (
                <>Welcome, {auth.currentUser.displayName}!</>
              ) : (
                <>Your account has been created.</>
              )}
            </p>
            <p style={{ fontSize: '14px', color: '#BDBDBD' }}>
              To place bids, please complete the verification form.
            </p>
          </div>
        ) : (
          // Sign In State
          <>
            <p className="mb-4" style={{ color: '#BDBDBD' }}>
              Sign in with your Google account to register for the auction.
              Your bidding will be enabled after identity verification.
            </p>

            {/* Google Sign-In Button */}
            <button
              className="btn-google mb-3"
              onClick={handleGoogleSignIn}
              disabled={loading}
            >
              <GoogleIcon />
              <span>{loading ? "Signing in..." : "Continue with Google"}</span>
            </button>

            {/* Error Message */}
            {error && (
              <div className="alert alert-danger mb-3">
                {error}
              </div>
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
                  href="https://zyborn.com/bidder-verification" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  style={{ color: '#F6931B' }}
                >
                  bidder verification form
                </a>{' '}
                to enable bidding. This typically takes 1-2 business hours.
              </p>
            </div>
          </>
        )}
      </div>

      {!success && (
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
