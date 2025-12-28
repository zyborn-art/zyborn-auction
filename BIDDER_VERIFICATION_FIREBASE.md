# ZYBORN Bidder Verification - Firebase Implementation

## DEPLOYMENT GUIDE

**Date:** December 28, 2025  
**Location:** auction.zyborn.com/bidder-verification  
**Database:** Firebase Firestore (same as auction)

---

## ARCHITECTURE OVERVIEW

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    UNIFIED FIREBASE ARCHITECTURE                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  auction.zyborn.com (React + Vite + Firebase)                               │
│  ├── /                    → Auction Home (bidding)                          │
│  ├── /bidder-verification → NEW: Verification Form                          │
│  └── /admin               → Admin Panel + Verification Queue                │
│                                                                              │
│  Firebase Firestore Collections:                                            │
│  ├── users                → Google Sign-In registrations                    │
│  │   └── {uid}           → name, email, approvedToBid, verificationStatus  │
│  ├── auction/items        → Bid data                                        │
│  └── verificationRequests → NEW: Bidder verification submissions           │
│      └── {uid}           → fullName, dob, nationality, phone, status       │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## STEP 1: Deploy Code Changes

```bash
cd C:\GitHub\zyborn-auction
git add .
git commit -m "Add bidder verification page at /bidder-verification with Firebase integration"
git push origin main
```

Vercel will auto-deploy. Wait ~60 seconds.

---

## STEP 2: Update Firebase Security Rules

Go to: https://console.firebase.google.com/project/zyborn-auction-3c34d/firestore/rules

Replace with:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Validate an incoming bid
    function isValidBid() {
      let editedKeys = request.resource.data.diff(resource.data);
      let changedKeys = editedKeys.changedKeys();
      let removedKeys = editedKeys.removedKeys();
      let numModifiedKeys = changedKeys.union(removedKeys).size();
      let addedKeys = editedKeys.addedKeys();
      let numAddedKeys = addedKeys.size();
      return numModifiedKeys == 0 && numAddedKeys == 1;
    }
    
    // Check user has signed in and registered
    function isLoggedIn() {
      return request.auth != null && exists(/databases/$(database)/documents/users/$(request.auth.uid))
    }
    
    // Check if user is admin
    function isAdmin() {
      return isLoggedIn() && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.admin == "YOUR_ADMIN_PASSWORD_HERE"
    }
    
    // Check if user is approved to bid
    function isApprovedBidder() {
      return isLoggedIn() && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.approvedToBid == true
    }
    
    // USER DOCUMENTS
    match /users/{userId} {
      allow read: if isAdmin() || (request.auth != null && request.auth.uid == userId);
      allow create: if request.auth != null && request.auth.uid == userId;
      allow update: if isAdmin() || (request.auth != null && request.auth.uid == userId);
      allow delete: if isAdmin();
    }
    
    // AUCTION ITEMS
    match /auction/items {
      allow get, list: if true;
      allow update: if isAdmin() || (isApprovedBidder() && isValidBid());
      allow create, delete: if isAdmin();
    }
    
    // VERIFICATION REQUESTS - NEW
    match /verificationRequests/{requestId} {
      // Users can read their own verification request
      allow read: if isAdmin() || (request.auth != null && request.auth.uid == requestId);
      // Users can create their own verification request (requestId must match their uid)
      allow create: if request.auth != null && request.auth.uid == requestId;
      // Only admins can update (approve/reject)
      allow update: if isAdmin();
      // Only admins can delete
      allow delete: if isAdmin();
    }
  }
}
```

**IMPORTANT:** Replace `YOUR_ADMIN_PASSWORD_HERE` with your actual admin password.

---

## STEP 3: Test the Flow

### User Flow:
1. Go to `auction.zyborn.com`
2. Click "Register to Bid" → Sign in with Google
3. See verification warning → Click verification link
4. Fill form at `auction.zyborn.com/bidder-verification`
5. Submit → See Google Calendar booking link
6. Book video verification call

### Admin Flow:
1. Go to `auction.zyborn.com/admin`
2. Scroll down to "Bidder Verification Queue"
3. See pending verifications
4. Click "Approve" or "Reject"
5. User's `approvedToBid` is automatically updated

---

## STEP 4: Update Main Site Link (Optional)

If zyborn.com/bidder-verification still exists and you want to redirect:

**Option A:** Delete the old page
```bash
cd C:\GitHub\zyborn
rm -rf public/bidder-verification
git add .
git commit -m "Remove old bidder verification (now at auction.zyborn.com)"
git push origin main
```

**Option B:** Redirect old URL to new
Create `C:\GitHub\zyborn\public\bidder-verification\index.html`:
```html
<!DOCTYPE html>
<html>
<head>
  <meta http-equiv="refresh" content="0;url=https://auction.zyborn.com/bidder-verification">
  <title>Redirecting...</title>
</head>
<body>
  <p>Redirecting to <a href="https://auction.zyborn.com/bidder-verification">auction.zyborn.com/bidder-verification</a></p>
</body>
</html>
```

---

## FILES CHANGED

```
C:\GitHub\zyborn-auction\
├── src\
│   ├── App.jsx                          [MODIFIED - added route]
│   ├── components\
│   │   └── Modal.jsx                    [MODIFIED - updated links]
│   └── pages\
│       ├── Admin.jsx                    [MODIFIED - added verification queue]
│       └── verification\
│           ├── BidderVerification.jsx   [NEW]
│           └── BidderVerification.css   [NEW]
```

---

## DATA FLOW

```
User Registration:
  Google Sign-In → Firebase Auth → users/{uid} created

Verification Submission:
  Form Submit → verificationRequests/{uid} created
              → users/{uid}.verificationSubmitted = true

Admin Approval:
  Admin clicks Approve → verificationRequests/{uid}.status = "approved"
                       → users/{uid}.approvedToBid = true

Bidding:
  User places bid → Firestore rules check approvedToBid
                  → If true, bid accepted
                  → If false, bid rejected
```

---

## BENEFITS OF THIS APPROACH

1. **Single Database:** All bidder data in Firebase (no Supabase duplication)
2. **Linked Data:** Verification tied to user UID
3. **Admin Control:** One admin panel for bids + verifications
4. **No Export/Import:** No data migration needed
5. **Simple Deployment:** Just git push to auction repo

---

## SUPABASE USAGE (Unchanged)

Supabase continues to handle:
- `subscribers` - Email capture from zyborn.com
- `press_inquiries` - Press contact form
- `broadcast_log` - Email campaign tracking

These are **marketing** concerns, separate from **bidder** data.
