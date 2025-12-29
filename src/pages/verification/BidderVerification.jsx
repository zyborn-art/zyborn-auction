import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { auth, db } from "../../firebase/config";
import { onAuthStateChanged } from "firebase/auth";
import "./BidderVerification.css";

// Google Calendar Appointment Link
const CALENDAR_BOOKING_URL = "https://calendar.app.google/U7j2f59ypKM1g7pR8";

const BidderVerification = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [existingRequest, setExistingRequest] = useState(null);
  const [error, setError] = useState("");
  
  const [formData, setFormData] = useState({
    fullName: "",
    dateOfBirth: "",
    nationality: "",
    phone: "",
  });

  // Check auth state and existing verification
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      
      if (currentUser) {
        // Pre-fill name from Google account
        setFormData(prev => ({
          ...prev,
          fullName: currentUser.displayName || ""
        }));
        
        // Check if user already submitted verification
        try {
          const verificationDoc = await getDoc(doc(db, "verificationRequests", currentUser.uid));
          if (verificationDoc.exists()) {
            setExistingRequest(verificationDoc.data());
          }
        } catch (err) {
          console.error("Error checking existing verification:", err);
        }
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!user) {
      setError("Please sign in first");
      return;
    }

    // Validation
    if (!formData.fullName || !formData.dateOfBirth || !formData.nationality || !formData.phone) {
      setError("Please fill in all fields");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      // Store verification request in Firestore
      await setDoc(doc(db, "verificationRequests", user.uid), {
        userId: user.uid,
        email: user.email,
        fullName: formData.fullName,
        dateOfBirth: formData.dateOfBirth,
        nationality: formData.nationality,
        phone: formData.phone,
        status: "pending",
        submittedAt: new Date().toISOString(),
        callBooked: false,
        verified: false
      });

      // Update user document to show verification submitted
      // Using setDoc with merge to preserve existing fields like 'admin'
      await setDoc(doc(db, "users", user.uid), {
        verificationSubmitted: true,
        verificationStatus: "pending"
      }, { merge: true });

      setSubmitted(true);
      
    } catch (err) {
      console.error("Submission error:", err);
      setError("Failed to submit. Please try again.");
    }

    setSubmitting(false);
  };

  const handleBookCall = () => {
    window.open(CALENDAR_BOOKING_URL, "_blank");
  };

  // Loading state
  if (loading) {
    return (
      <div className="verification-container">
        <div className="verification-card">
          <div className="loading-spinner">Loading...</div>
        </div>
      </div>
    );
  }

  // Not signed in
  if (!user) {
    return (
      <div className="verification-container">
        <div className="verification-card">
          <div className="verification-header">
            <span className="verification-label">BIDDER VERIFICATION</span>
            <h1>Sign In Required</h1>
          </div>
          <div className="verification-body">
            <p className="info-text">
              You must be registered and signed in to complete bidder verification.
            </p>
            <button 
              className="btn-primary-full"
              onClick={() => navigate("/")}
            >
              GO TO AUCTION →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Already submitted - show status
  if (existingRequest && !submitted) {
    return (
      <div className="verification-container">
        <div className="verification-card">
          <div className="verification-header">
            <span className="verification-label">VERIFICATION STATUS</span>
            <h1>Application {existingRequest.status === "approved" ? "Approved" : "Pending"}</h1>
          </div>
          <div className="verification-body">
            {existingRequest.status === "approved" ? (
              <>
                <div className="success-icon">✓</div>
                <p className="success-text">
                  Your verification has been approved! You can now place bids.
                </p>
                <button 
                  className="btn-primary-full"
                  onClick={() => navigate("/")}
                >
                  START BIDDING →
                </button>
              </>
            ) : (
              <>
                <div className="pending-icon">⏳</div>
                <p className="info-text">
                  Your verification is under review. We'll notify you once approved.
                </p>
                
                {!existingRequest.callBooked && (
                  <div className="book-call-section">
                    <h3>Book Your Verification Call</h3>
                    <p>Complete a 10-minute video call to verify your identity.</p>
                    <button 
                      className="btn-primary-full"
                      onClick={handleBookCall}
                    >
                      📅 BOOK VIDEO CALL
                    </button>
                  </div>
                )}
                
                <button 
                  className="btn-secondary-full"
                  onClick={() => navigate("/")}
                >
                  ← BACK TO AUCTION
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Form submitted - show success
  if (submitted) {
    return (
      <div className="verification-container">
        <div className="verification-card">
          <div className="verification-header">
            <span className="verification-label">STEP 1 COMPLETE</span>
            <h1>Information Submitted</h1>
          </div>
          <div className="verification-body">
            <div className="success-icon">✓</div>
            <p className="success-text">
              Thank you, {formData.fullName}! Your details have been recorded.
            </p>
            
            <div className="step-two-section">
              <span className="step-label">STEP 2: IDENTITY VERIFICATION</span>
              <h2>Book Your Video Call</h2>
              <p>
                Complete a brief 10-minute video call where we'll verify your identity.
                Please have your ID document ready.
              </p>
              <button 
                className="btn-primary-full"
                onClick={handleBookCall}
              >
                📅 BOOK VIDEO CALL NOW
              </button>
              <p className="fine-print">
                You'll be redirected to Google Calendar to select a time slot.
              </p>
            </div>
            
            <div className="divider"></div>
            
            <button 
              className="btn-secondary-full"
              onClick={() => navigate("/")}
            >
              ← BACK TO AUCTION
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show form
  return (
    <div className="verification-container">
      <div className="verification-card">
        <div className="verification-header">
          <span className="verification-label">BIDDER VERIFICATION</span>
          <h1>Complete Your Registration</h1>
          <p className="subtitle">
            Signed in as: <strong>{user.email}</strong>
          </p>
        </div>
        
        <div className="verification-body">
          <div className="info-box">
            <h4>Why verification?</h4>
            <p>
              For auctions starting at $1M USD, we require identity verification 
              to ensure a secure bidding environment for all participants.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="verification-form">
            <div className="form-group">
              <label htmlFor="fullName">Full Legal Name *</label>
              <input
                type="text"
                id="fullName"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                placeholder="As shown on your ID"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="dateOfBirth">Date of Birth *</label>
              <input
                type="date"
                id="dateOfBirth"
                name="dateOfBirth"
                value={formData.dateOfBirth}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="nationality">Nationality *</label>
              <input
                type="text"
                id="nationality"
                name="nationality"
                value={formData.nationality}
                onChange={handleChange}
                placeholder="e.g., United Kingdom"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="phone">Phone Number *</label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="+44 7XXX XXX XXX"
                required
              />
            </div>

            {error && (
              <div className="error-message">
                {error}
              </div>
            )}

            <button 
              type="submit" 
              className="btn-primary-full"
              disabled={submitting}
            >
              {submitting ? "SUBMITTING..." : "CONTINUE TO STEP 2 →"}
            </button>
          </form>

          <p className="fine-print">
            By submitting, you agree to our verification process. 
            Your information is secured and only used for bidder verification.
          </p>
        </div>
      </div>
    </div>
  );
};

export default BidderVerification;
