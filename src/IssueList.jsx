import { collection, query, where, onSnapshot, orderBy } from "firebase/firestore";
import { useEffect, useState } from "react";
import { auth, db } from "./firebase";

export default function IssueList() {
  const [issues, setIssues] = useState([]);

  useEffect(() => {
    console.log("IssueList mounted");

    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      console.log("Auth state changed:", user?.uid);

      if (!user) return;

      const q = query(
        collection(db, "issues"),
        where("createdBy", "==", user.uid),
        orderBy("createdAt", "desc")
      );

      const unsubscribeSnapshot = onSnapshot(q, (snapshot) => {
        console.log("🔥 Snapshot fired, docs:", snapshot.size);

        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        setIssues(data);
      });

      // cleanup snapshot on logout
      return () => unsubscribeSnapshot();
    });

    // cleanup auth listener
    return () => unsubscribeAuth();
  }, []);

  return (
    <div>
      <h2 style={{ marginBottom: '2rem', color: 'var(--primary)' }}>My Issues</h2>

      {issues.length === 0 && <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No issues yet.</p>}

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', 
        gap: '1.5rem' 
      }}>
        {issues.map(issue => (
          <div key={issue.id} className="glass-panel" style={{ padding: '1.5rem' }}>
            <h4 style={{ marginTop: 0, marginBottom: '0.5rem' }}>{issue.title}</h4>
            <p style={{ margin: '0.5rem 0', color: 'var(--text-muted)' }}>Status: <span style={{ color: 'var(--primary)' }}>{issue.status}</span></p>
            {issue.category && <p style={{ margin: '0.5rem 0', color: 'var(--text-muted)' }}>Category: {issue.category}</p>}
            {issue.urgency && <p style={{ margin: '0.5rem 0', color: 'var(--text-muted)' }}>Urgency: {issue.urgency}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
