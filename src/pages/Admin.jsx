import React, { useState, useEffect } from "react";
import { editItems } from "../firebase/utils";
import Table from "../components/Table";
import { collection, query, where, onSnapshot, doc, updateDoc, getDoc } from "firebase/firestore";
import { db } from "../firebase/config";

// =============================================================================
// VERIFICATION QUEUE COMPONENT
// =============================================================================
const VerificationQueue = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("pending"); // pending, approved, rejected

  useEffect(() => {
    // Listen to verification requests
    const q = query(
      collection(db, "verificationRequests"),
      where("status", "==", filter)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setRequests(data);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching verifications:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [filter]);

  const handleApprove = async (userId) => {
    try {
      // Update verification request
      await updateDoc(doc(db, "verificationRequests", userId), {
        status: "approved",
        reviewedAt: new Date().toISOString()
      });

      // Update user document to enable bidding
      await updateDoc(doc(db, "users", userId), {
        approvedToBid: true,
        verificationStatus: "approved"
      });

      alert("User approved for bidding!");
    } catch (error) {
      console.error("Error approving user:", error);
      alert("Error approving user: " + error.message);
    }
  };

  const handleReject = async (userId) => {
    if (!window.confirm("Are you sure you want to reject this verification?")) {
      return;
    }

    try {
      await updateDoc(doc(db, "verificationRequests", userId), {
        status: "rejected",
        reviewedAt: new Date().toISOString()
      });

      await updateDoc(doc(db, "users", userId), {
        verificationStatus: "rejected"
      });

      alert("User verification rejected");
    } catch (error) {
      console.error("Error rejecting user:", error);
      alert("Error rejecting user: " + error.message);
    }
  };

  return (
    <div className="verification-admin-section">
      <h4 className="mb-3" style={{ color: '#F6931B' }}>
        Bidder Verification Queue
      </h4>

      {/* Filter Tabs */}
      <div className="btn-group mb-3">
        <button 
          className={`btn ${filter === 'pending' ? 'btn-warning' : 'btn-outline-secondary'}`}
          onClick={() => setFilter('pending')}
        >
          Pending ({filter === 'pending' ? requests.length : '...'})
        </button>
        <button 
          className={`btn ${filter === 'approved' ? 'btn-success' : 'btn-outline-secondary'}`}
          onClick={() => setFilter('approved')}
        >
          Approved
        </button>
        <button 
          className={`btn ${filter === 'rejected' ? 'btn-danger' : 'btn-outline-secondary'}`}
          onClick={() => setFilter('rejected')}
        >
          Rejected
        </button>
      </div>

      {/* Requests Table */}
      {loading ? (
        <p style={{ color: '#BDBDBD' }}>Loading...</p>
      ) : requests.length === 0 ? (
        <p style={{ color: '#6F6F6F' }}>No {filter} verification requests.</p>
      ) : (
        <div className="table-responsive">
          <table className="table table-dark table-striped">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>DOB</th>
                <th>Nationality</th>
                <th>Submitted</th>
                {filter === 'pending' && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {requests.map(req => (
                <tr key={req.id}>
                  <td>{req.fullName}</td>
                  <td>{req.email}</td>
                  <td>{req.phone}</td>
                  <td>{req.dateOfBirth}</td>
                  <td>{req.nationality}</td>
                  <td>{new Date(req.submittedAt).toLocaleDateString()}</td>
                  {filter === 'pending' && (
                    <td>
                      <button 
                        className="btn btn-sm btn-success me-2"
                        onClick={() => handleApprove(req.id)}
                      >
                        ✓ Approve
                      </button>
                      <button 
                        className="btn btn-sm btn-danger"
                        onClick={() => handleReject(req.id)}
                      >
                        ✗ Reject
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// =============================================================================
// ADMIN PAGE
// =============================================================================
function AdminPage() {
  return (
    <div className="container mt-3">
      {/* Auction Controls */}
      <div className="admin-section mb-5">
        <h4 className="mb-3" style={{ color: '#F6931B' }}>
          Auction Controls
        </h4>
        <div className="d-flex justify-content-left mb-3">
          <button
            className="btn btn-danger me-3"
            onClick={() => editItems(undefined, true, false)}
          >
            Update all items
          </button>
          <button
            className="btn btn-danger me-3"
            onClick={() => editItems(undefined, false, true)}
          >
            Delete all bids
          </button>
        </div>
        <Table />
      </div>

      <hr style={{ borderColor: '#6F6F6F' }} />

      {/* Verification Queue */}
      <div className="admin-section mt-4">
        <VerificationQueue />
      </div>
    </div>
  );
}

export default AdminPage;
