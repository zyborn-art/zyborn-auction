import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { doc, setDoc, getDoc, updateDoc } from "firebase/firestore";
import { auth, db } from "../../firebase/config";
import { onAuthStateChanged } from "firebase/auth";
import "./BidderVerification.css";

// Google Calendar Appointment Link
const CALENDAR_BOOKING_URL = "https://calendar.app.google/U7j2f59ypKM1g7pR8";

// Terms & Conditions Content
const TERMS_CONTENT = `# Terms & Conditions

These Terms and Conditions ("Terms") govern all use of the ZYBORN website and auction services (collectively, the "Services"). By purchasing artwork or using the zyborn.com auction platform, you agree to be bound by these Terms.

------

## 1. Definitions

- **"ZYBORN" / "We" / "Us"** – zyborn.com, trading as ZYBORN.
- **"Client"** – any person purchasing artwork through our website, or third-party sales channels.
- **"User"** – any person using the zyborn.com auction platform.
- **"Buyer"** – a User who places a successful bid on a Lot.
- **"Seller" / "Consignor"** – a User who lists property for sale through the auction platform.
- **"Lot"** – any item offered for auction.
- **"Hammer Price"** – the highest Bid accepted at the close of auction.
- **"Buyer's Premium"** – a X% fee charged on top of the Hammer Price, subject to VAT where applicable.
- **"Total Purchase Price"** – Hammer Price + Buyer's Premium + VAT (where applicable) + shipping or storage charges.

## 2. Scope of Services

ZYBORN operates in one capacity:

1. **Auctions** – Timed and live online auctions through the zyborn.com platform.

These Terms apply to all areas. Where provisions relate only to auctions, this will be clearly stated.

## 3. Eligibility

- Clients and Users must be at least 18 years old.
- Registration for the auction platform requires identity verification (photo ID, proof of address) and valid payment details.
- ZYBORN reserves the right to refuse, suspend, or terminate any account or sale at its discretion.

## 4. Pricing, Fees & Buyer's Premium

- **Private Sales:** Prices are as marked and may be subject to VAT.
- **Auctions:** VAT is charged where applicable.
- Fees are non-refundable.

## 5. Bidding & Auction Rules

- All Bids are final, binding, and cannot be withdrawn.
- Bidding increments are determined by ZYBORN and displayed during the auction.
- Auctions may use anti-sniping/extended bidding at ZYBORN's discretion.
- ZYBORN reserves the right to:
  - Refuse any Bid.
  - Withdraw any Lot.
  - Cancel or re-open auctions in the event of error, fraud, or technical failure.

## 6. Payment Terms

- **Private Sales:** Payment is due immediately upon invoice, unless otherwise agreed.
- **Auctions:**
  - Full payment is due 5 days upon invoice received by email, unless otherwise agreed.
  - Accepted methods: credit/debit card, bank transfer, Stripe, Adyen, or other approved gateways.
  - Late payment may incur interest charges and account suspension.
  - Deposits or pre-authorisation holds may be required for high-value Lots.

## 7. Title & Risk

- Title to purchased artwork passes to the Buyer/Client only upon receipt of full cleared funds.
- Risk passes to the Buyer/Client upon collection, delivery, or transfer to storage, whichever occurs first.
- Buyers are responsible for insurance from that point forward.

## 8. Delivery, Shipping & Storage

- Delivery, collection, and storage options will be made available through ZYBORN.
- Costs are borne by the Buyer/Client unless otherwise agreed.
- ZYBORN is not responsible for delays, loss, or damage in transit.

## 9. Seller Terms (Auctions Only)

- Seller warrant they hold full title and right to sell the property.
- Reserves, and fees are agreed in writing prior to sale.
- Unsold Lots may be subject to withdrawal.

## 10. Lot Descriptions & Authenticity

- **Auctions:** Lots are sold strictly "as is, where is."
- Descriptions, images, and condition reports are statements of opinion only and not warranties.
- The descriptions, images, and condition reports accurately reflect the actual state of the items, and ZYBORN provides a full guarantee in this regard.

## 11. Defaults

- **Buyer Default:** If a Buyer fails to pay, ZYBORN may cancel the sale, resell the Lot, and recover losses, including fees and damages.

## 12. Limitation of Liability

- ZYBORN shall not be liable for:
  - Technical errors, internet failures, or missed Bids.
  - Indirect or consequential losses.

## 13. Intellectual Property

- All images, text, and content on ZYBORN platforms are owned by ZYBORN or licensed to us.
- Users may not reproduce or exploit content without written consent.

## 14. Privacy & Data Protection

- ZYBRON complies with GDPR data laws.
- Data is collected for transactions, KYC, AML, and marketing (with consent).
- Full details are available in our Privacy Policy.

## 15. AML & Compliance

- ZYBORN complies with Anti-Money Laundering (AML) regulations.
- We may request further documents at any stage.
- We reserve the right to cancel transactions if compliance checks fail.

## 16. Force Majeure

- ZYBORN is not responsible for delays or failures caused by events beyond reasonable control (including strikes, pandemics, or government restrictions).

## 18. Amendments

- ZYBORN may update these Terms at any time. Updates will be published on the Platform and are binding upon publication.`;

// Privacy Policy Content
const PRIVACY_CONTENT = `# Privacy Policy

This Privacy Policy explains how zyborn.com ("ZYBORN", "we", "us", "our") collects, uses, and protects your personal information when you interact with our website (**zyborn.com**), and auction services. By visiting our website, purchasing artwork, or registering for auctions, you agree to this Privacy Policy.

------

## 1. Information We Collect

We collect personal information in the following ways:

**From Clients:**

- Name, address, email, phone number.
- Payment details for transactions.
- Purchase history.

**From Auction Users:**

- Identity documents (photo ID, proof of address) for KYC/AML checks.
- Payment card or bank details.
- Bidding history, bids placed, and items won.
- Preferences regarding delivery, storage, and marketing.

**Automatically (All Users):**

- Device and browser information.
- Tracking data for analytics, fraud prevention, and marketing.

## 2. How We Use Your Information

We process your data to:

- Fulfil purchases, consignments, and auction transactions.
- Verify identity and comply with Anti-Money Laundering (AML) regulations.
- Process payments securely.
- Arrange delivery, collection, or storage.
- Send transactional emails (e.g. outbid alerts, payment reminders, invoices).
- Communicate marketing offers (if you've opted in).
- Improve and secure our services.

## 3. Sharing Your Information

We may share your data with trusted third parties only where necessary:

- Payment processors (Stripe, Adyen, or equivalent).
- Identity verification providers for KYC/AML compliance.
- Couriers and storage partners for logistics.
- Email and marketing platforms (Mailchimp, Klaviyo).
- Professional advisers (lawyers, auditors, insurers).
- Authorities/regulators where legally required.

*We will never sell your personal data.*

## 4. Legal Basis for Processing

- **Contractual necessity** – to provide services and fulfil purchases.
- **Legitimate interests** – to secure our platform, prevent fraud, and grow our business.
- **Consent** – for marketing communications (you can withdraw at any time).

## 5. Data Retention

- Identity and transaction records: kept for minimum 5 years (legal requirement).
- Marketing data: retained until you unsubscribe.
- General account data: deleted upon verified request, unless retention is required by law.

## 6. Security

- All payment data is processed using PCI-DSS compliant providers.
- Data is encrypted in transit (SSL/TLS).
- Access to sensitive information is restricted to authorised staff only.
- We monitor for fraud and abuse across our services.

## 7. Your Rights

Under GDPR data laws, you have the right to:

- Access the personal data we hold about you.
- Correct inaccuracies.
- Request erasure (where legally possible).
- Restrict or object to processing.
- Withdraw marketing consent.
- Data portability (transfer of your information).

Requests can be made by contacting us at hello@zyborn.com

## 8. Cookies & Tracking

We don't use cookies at our website zyborn.com 

## 9. Children

We do not knowingly collect or process personal data from anyone under 18.

## 10. Updates to this Policy

We may update this Privacy Policy periodically. Updates will be published on our website and are effective immediately.

## 12. Contact Us

**ZYBORN ART**
Email: hello@zyborn.com

------

**Note:** This web page summarises our privacy practices. Where applicable, our Terms and Conditions provide additional details. If anything appears unclear, please contact us using the details above.`;

// Modal Component for Terms/Privacy
const LegalModal = ({ isOpen, onClose, title, content }) => {
  if (!isOpen) return null;

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Simple markdown-like rendering
  const renderContent = (text) => {
    const lines = text.split('\n');
    return lines.map((line, index) => {
      // Headers
      if (line.startsWith('# ')) {
        return <h1 key={index} className="modal-h1">{line.substring(2)}</h1>;
      }
      if (line.startsWith('## ')) {
        return <h2 key={index} className="modal-h2">{line.substring(3)}</h2>;
      }
      // Horizontal rule
      if (line.startsWith('------')) {
        return <hr key={index} className="modal-hr" />;
      }
      // Bold text handling
      if (line.includes('**')) {
        const parts = line.split(/\*\*(.*?)\*\*/g);
        return (
          <p key={index} className="modal-p">
            {parts.map((part, i) => 
              i % 2 === 1 ? <strong key={i}>{part}</strong> : part
            )}
          </p>
        );
      }
      // List items
      if (line.startsWith('- ')) {
        return <li key={index} className="modal-li">{line.substring(2)}</li>;
      }
      // Empty lines
      if (line.trim() === '') {
        return <br key={index} />;
      }
      // Regular paragraphs
      return <p key={index} className="modal-p">{line}</p>;
    });
  };

  return (
    <div className="legal-modal-overlay" onClick={onClose}>
      <div className="legal-modal" onClick={(e) => e.stopPropagation()}>
        <div className="legal-modal-header">
          <h2>{title}</h2>
          <button className="modal-close-btn" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="legal-modal-content">
          {renderContent(content)}
        </div>
        <div className="legal-modal-footer">
          <button className="btn-primary-full" onClick={onClose}>
            CLOSE
          </button>
        </div>
      </div>
    </div>
  );
};

const BidderVerification = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [existingRequest, setExistingRequest] = useState(null);
  const [error, setError] = useState("");
  
  // Terms acceptance state
  const [termsAccepted, setTermsAccepted] = useState(false);
  
  // Modal states
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  
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
    
    // Special validation for dateOfBirth
    if (name === "dateOfBirth") {
      // Validate date format and year
      if (value) {
        const year = parseInt(value.split("-")[0], 10);
        // Check if year is valid (4 digits, between 1900-2024)
        if (year < 1900 || year > 2024 || value.split("-")[0].length !== 4) {
          setError("Please enter a valid date of birth (year must be 1900-2024)");
          return;
        }
      }
    }
    
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

    // Validate date of birth - strict check
    const dobParts = formData.dateOfBirth.split("-");
    const dobYear = parseInt(dobParts[0], 10);
    const dobDate = new Date(formData.dateOfBirth);
    
    if (
      dobParts[0].length !== 4 ||
      isNaN(dobYear) ||
      dobYear < 1900 ||
      dobYear > 2024 ||
      isNaN(dobDate.getTime())
    ) {
      setError("Please enter a valid date of birth (year must be 1900-2024, 4 digits only)");
      return;
    }

    // Check terms acceptance
    if (!termsAccepted) {
      setError("Please accept the Terms & Conditions and Privacy Policy");
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
        termsAccepted: true,
        termsAcceptedAt: new Date().toISOString(),
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

  // Handle "I've Booked My Call" button click
  const handleConfirmBooked = async () => {
    if (!user) return;
    
    try {
      // Update verification request to mark call as booked
      await updateDoc(doc(db, "verificationRequests", user.uid), {
        callBooked: true,
        callBookedAt: new Date().toISOString()
      });
      
      // Refresh the existing request to show pending state
      const verificationDoc = await getDoc(doc(db, "verificationRequests", user.uid));
      if (verificationDoc.exists()) {
        setExistingRequest(verificationDoc.data());
      }
      setSubmitted(false); // Switch to pending view
      
    } catch (err) {
      console.error("Error confirming call booked:", err);
    }
  };

  // Check if form is valid for submission
  const isFormValid = () => {
    return (
      formData.fullName &&
      formData.dateOfBirth &&
      formData.nationality &&
      formData.phone &&
      termsAccepted
    );
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
              
              <div className="or-divider">
                <span>Already booked?</span>
              </div>
              
              <button 
                className="btn-secondary-full"
                onClick={handleConfirmBooked}
              >
                ✓ I'VE BOOKED MY CALL
              </button>
            </div>
            
            <div className="divider"></div>
            
            <button 
              className="btn-tertiary"
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
                min="1900-01-01"
                max="2024-12-31"
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

            {/* Terms & Conditions Checkbox */}
            <div className="terms-checkbox-group">
              <label className="checkbox-container">
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                />
                <span className="checkmark"></span>
                <span className="checkbox-label">
                  I agree to the{" "}
                  <button 
                    type="button" 
                    className="link-button"
                    onClick={() => setShowTermsModal(true)}
                  >
                    Terms & Conditions
                  </button>
                  {" "}and{" "}
                  <button 
                    type="button" 
                    className="link-button"
                    onClick={() => setShowPrivacyModal(true)}
                  >
                    Privacy Policy
                  </button>
                </span>
              </label>
            </div>

            {error && (
              <div className="error-message">
                {error}
              </div>
            )}

            <button 
              type="submit" 
              className={`btn-primary-full ${!isFormValid() ? 'btn-disabled' : ''}`}
              disabled={submitting || !isFormValid()}
            >
              {submitting ? "SUBMITTING..." : "CONTINUE TO STEP 2 →"}
            </button>
          </form>

          <p className="fine-print">
            Your information is secured and only used for bidder verification purposes.
          </p>
        </div>
      </div>

      {/* Terms Modal */}
      <LegalModal
        isOpen={showTermsModal}
        onClose={() => setShowTermsModal(false)}
        title="Terms & Conditions"
        content={TERMS_CONTENT}
      />

      {/* Privacy Modal */}
      <LegalModal
        isOpen={showPrivacyModal}
        onClose={() => setShowPrivacyModal(false)}
        title="Privacy Policy"
        content={PRIVACY_CONTENT}
      />
    </div>
  );
};

export default BidderVerification;
