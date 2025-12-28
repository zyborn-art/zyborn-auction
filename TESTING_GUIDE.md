# ZYBORN Bidder Verification - Testing Guide

**Date:** December 28, 2025  
**URL:** https://auction.zyborn.com/bidder-verification  
**Status:** Deployed

---

## QUICK TEST CHECKLIST

### ✅ Pre-Flight Checks

| Check | URL | Expected Result |
|-------|-----|-----------------|
| Auction site loads | https://auction.zyborn.com | Homepage with artwork |
| Verification page loads | https://auction.zyborn.com/bidder-verification | "Sign In Required" message |
| Redirect works | https://zyborn.com/bidder-verification | Redirects to auction subdomain |
| Admin page loads | https://auction.zyborn.com/admin | Admin panel (if logged in as admin) |

---

## TEST SCENARIO 1: New User Registration Flow

### Step 1: Access Verification Page (Not Signed In)
1. Open **Incognito/Private browser window**
2. Go to: `https://auction.zyborn.com/bidder-verification`
3. **Expected:** See "Sign In Required" message with button "GO TO AUCTION →"

### Step 2: Sign In with Google
1. Click "GO TO AUCTION →" or go to `https://auction.zyborn.com`
2. Click "Register to Bid" button in navbar
3. Click "Continue with Google"
4. Complete Google sign-in
5. **Expected:** 
   - Success message "Registration Successful!"
   - See verification warning box with link

### Step 3: Complete Verification Form
1. Go to: `https://auction.zyborn.com/bidder-verification`
2. **Expected:** Form appears with your Google email shown
3. Fill in:
   - Full Legal Name: `Test User`
   - Date of Birth: `1990-01-15`
   - Nationality: `United Kingdom`
   - Phone: `+44 7700 900000`
4. Click "CONTINUE TO STEP 2 →"
5. **Expected:**
   - Success screen "Information Submitted"
   - See "Book Your Video Call" section
   - Google Calendar button appears

### Step 4: Verify Data in Firebase
1. Go to: https://console.firebase.google.com/project/zyborn-auction-3c34d/firestore/data
2. Click on `verificationRequests` collection
3. **Expected:** New document with your user UID containing:
   ```
   fullName: "Test User"
   dateOfBirth: "1990-01-15"
   nationality: "United Kingdom"
   phone: "+44 7700 900000"
   email: "your-email@gmail.com"
   status: "pending"
   submittedAt: [timestamp]
   callBooked: false
   verified: false
   ```

4. Click on `users` collection → your UID document
5. **Expected:** 
   ```
   verificationSubmitted: true
   verificationStatus: "pending"
   approvedToBid: false
   ```

---

## TEST SCENARIO 2: Admin Approval Flow

### Step 1: Access Admin Panel
1. Sign in with your admin Google account
2. Go to: `https://auction.zyborn.com/admin`
3. **Expected:** See "Auction Controls" and "Bidder Verification Queue" sections

### Step 2: Review Pending Verifications
1. Scroll to "Bidder Verification Queue"
2. Click "Pending" tab
3. **Expected:** See the test user's verification request with:
   - Name, Email, Phone, DOB, Nationality
   - "Approve" and "Reject" buttons

### Step 3: Approve a User
1. Click "✓ Approve" button
2. **Expected:** Alert "User approved for bidding!"

### Step 4: Verify Approval in Firebase
1. Go to Firebase Console → Firestore
2. Check `verificationRequests/{uid}`:
   ```
   status: "approved"
   reviewedAt: [timestamp]
   ```
3. Check `users/{uid}`:
   ```
   approvedToBid: true
   verificationStatus: "approved"
   ```

### Step 5: Test Approved User Can Bid
1. Sign in as the approved test user
2. Click on artwork to open bid modal
3. **Expected:** 
   - No "pending approval" warning
   - Bid increment buttons are enabled
   - Can place a test bid

---

## TEST SCENARIO 3: Returning User (Already Submitted)

### Step 1: Access Verification as Submitted User
1. Sign in with user who already submitted verification
2. Go to: `https://auction.zyborn.com/bidder-verification`
3. **Expected (if pending):**
   - "Application Pending" screen
   - "Book Your Verification Call" section
   - "← BACK TO AUCTION" button

4. **Expected (if approved):**
   - "Application Approved" screen
   - "START BIDDING →" button

---

## TEST SCENARIO 4: Redirect Test

1. Open: `https://zyborn.com/bidder-verification`
2. **Expected:** Automatically redirects to `https://auction.zyborn.com/bidder-verification`
3. Total redirect time: < 1 second

---

## TEST SCENARIO 5: Mobile Responsiveness

1. Open `https://auction.zyborn.com/bidder-verification` on mobile
2. **Check:**
   - [ ] Form fits screen width
   - [ ] Input fields are tappable
   - [ ] Date picker works
   - [ ] Submit button is full-width
   - [ ] Success screen displays correctly

---

## FIREBASE CONSOLE QUICK LINKS

| Resource | URL |
|----------|-----|
| Firestore Data | https://console.firebase.google.com/project/zyborn-auction-3c34d/firestore/data |
| Firestore Rules | https://console.firebase.google.com/project/zyborn-auction-3c34d/firestore/rules |
| Authentication | https://console.firebase.google.com/project/zyborn-auction-3c34d/authentication/users |
| Vercel Deployments | https://vercel.com/dashboard |

---

## TROUBLESHOOTING

### Issue: "Sign In Required" even after signing in
**Cause:** Auth state not synced  
**Fix:** 
1. Hard refresh (Ctrl+Shift+R)
2. Check browser console for errors
3. Verify user exists in Firebase Auth

### Issue: Form submission fails
**Cause:** Firestore rules not updated  
**Fix:**
1. Go to Firebase Console → Firestore → Rules
2. Verify `verificationRequests` match rule exists
3. Check that admin password is correctly set

### Issue: Admin can't see verification queue
**Cause:** Admin flag not set in user document  
**Fix:**
1. Go to Firestore → users → [admin-uid]
2. Verify `admin` field contains the correct password string

### Issue: "Permission denied" when approving
**Cause:** Rules mismatch  
**Fix:**
1. Check `isAdmin()` function in rules
2. Verify admin password matches exactly (case-sensitive)

### Issue: Approved user still can't bid
**Cause:** `approvedToBid` not set  
**Fix:**
1. Check `users/{uid}` document
2. Manually set `approvedToBid: true` if needed
3. User should hard refresh auction page

---

## CLEANUP AFTER TESTING

### Remove Test Data
1. Firebase Console → Firestore
2. Delete test documents from:
   - `verificationRequests` (test submissions)
   - `users` (test accounts, if desired)

### Reset Test User
To test again with same account:
1. Delete `verificationRequests/{uid}` document
2. Update `users/{uid}`:
   ```
   verificationSubmitted: false
   verificationStatus: null
   approvedToBid: false
   ```

---

## SUCCESS CRITERIA

| Test | Pass Criteria |
|------|---------------|
| New user sees form | Form loads with email pre-filled |
| Form submits | Data appears in Firebase within 2 seconds |
| Admin sees queue | Pending requests appear in table |
| Approval works | User's `approvedToBid` becomes `true` |
| Approved user can bid | Bid buttons enabled, bid succeeds |
| Redirect works | zyborn.com/bidder-verification → auction subdomain |

---

## PRODUCTION CHECKLIST

Before going live with real bidders:

- [ ] Test complete flow with real admin account
- [ ] Verify Google Calendar booking link works
- [ ] Test on multiple browsers (Chrome, Safari, Firefox)
- [ ] Test on mobile devices
- [ ] Confirm email notifications (if enabled)
- [ ] Document admin approval process for team
- [ ] Set up monitoring for failed submissions

---

**Testing Complete?** Mark this file with results and archive for reference.
