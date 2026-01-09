import {
  collection,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  doc,
  serverTimestamp
} from "firebase/firestore";
import { useEffect, useState } from "react";
import { auth, db } from "./firebase";

/* ---------- SLA HELPERS ---------- */

const MS_IN_HOUR = 60 * 60 * 1000;
const urgencyRank = { high: 0, medium: 1, low: 2 };
const attentionOrder = { overdue: 0, delayed: 1, "on-time": 2 };

function hoursSince(ts) {
  if (!ts) return 0;
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return (Date.now() - d.getTime()) / MS_IN_HOUR;
}

function getSlaFlag(issue) {
  if (issue.status === "open") {
    const openedAt = issue.statusHistory?.[0]?.at;
    if (openedAt && hoursSince(openedAt) > 24) return "delayed";
  }

  if (issue.status === "assigned") {
    const assigned = issue.statusHistory?.find(h => h.status === "assigned");
    if (assigned && hoursSince(assigned.at) > 48) return "overdue";
  }

  return "on-time";
}

/* ---------- COMPONENT ---------- */

export default function AdminIssueList() {
  const [issues, setIssues] = useState([]);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");

  const [aiSummary, setAiSummary] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  /* ---------- REALTIME FETCH ---------- */
  useEffect(() => {
    const unsubAuth = auth.onAuthStateChanged((user) => {
      if (!user) return;

      const q = query(
        collection(db, "issues"),
        orderBy("createdAt", "desc")
      );

      const unsubSnap = onSnapshot(q, (snap) => {
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setIssues(data);
      });

      return () => unsubSnap();
    });

    return () => unsubAuth();
  }, []);

  /* ---------- STATUS UPDATE ---------- */
  const updateStatus = async (issue, nextStatus) => {
    await updateDoc(doc(db, "issues", issue.id), {
      status: nextStatus,
      statusHistory: [
        ...(issue.statusHistory || []),
        { status: nextStatus, at: issue.updatedAt }
      ],
      updatedAt: serverTimestamp()
    });
  };

  /* ---------- FILTER + SORT ---------- */
  const filtered = issues.filter(i =>
    (filterStatus === "all" || i.status === filterStatus) &&
    (filterCategory === "all" || i.category === filterCategory)
  );

  const sortedIssues = [...filtered].sort((a, b) => {
    const slaDiff =
      attentionOrder[getSlaFlag(a)] - attentionOrder[getSlaFlag(b)];
    if (slaDiff !== 0) return slaDiff;
    return urgencyRank[a.urgency] - urgencyRank[b.urgency];
  });

  /* ---------- HEATMAP ---------- */
  const hostelCounts = issues.reduce((acc, i) => {
    acc[i.location] = (acc[i.location] || 0) + 1;
    return acc;
  }, {});

  /* ---------- AI SUMMARY ---------- */
  const generateWeeklySummary = async () => {
    try {
      setAiLoading(true);

      const payload = issues.map(i => ({
        title: i.title,
        category: i.category,
        location: i.location,
        urgency: i.urgency,
        status: i.status
      }));

      // 🔒 SAFE PLACEHOLDER
      // Replace this with Gemini / OpenAI call later
      const fakeSummary = `
Most issues are concentrated in hostel infrastructure, particularly water and electricity.
High urgency issues should be prioritized in Hostel A.
Focus admin resources on recurring maintenance issues to reduce SLA delays.
      `.trim();

      setAiSummary(fakeSummary);
    } catch (e) {
      alert("Failed to generate summary");
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div>
      <h2 style={{ marginBottom: '2rem', color: 'var(--primary)' }}>Admin Dashboard</h2>

      {/* AI SUMMARY */}
      <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
        <button onClick={generateWeeklySummary} disabled={aiLoading} className="btn-primary" style={{ marginBottom: '1rem' }}>
          {aiLoading ? 'Generating...' : 'Generate Weekly Summary'}
        </button>

        {aiSummary && (
          <div>
            <strong style={{ color: 'var(--primary)' }}>Weekly Summary</strong>
            <p style={{ marginTop: '0.5rem', whiteSpace: 'pre-line' }}>{aiSummary}</p>
          </div>
        )}
      </div>

      {/* HEATMAP */}
      <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
        <h3 style={{ marginTop: 0, color: 'var(--primary)' }}>Issue Distribution</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>
            {Object.entries(hostelCounts).map(([k, v]) => (
              <tr key={k}>
                <td style={{ padding: '8px', borderBottom: '1px solid var(--glass-border)' }}>{k}</td>
                <td style={{ padding: '8px', borderBottom: '1px solid var(--glass-border)' }}>{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* FILTERS */}
      <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <select onChange={e => setFilterStatus(e.target.value)} style={{ flex: 1, minWidth: '150px' }}>
            <option value="all">All Status</option>
            <option value="open">Open</option>
            <option value="assigned">Assigned</option>
            <option value="resolved">Resolved</option>
          </select>

          <select onChange={e => setFilterCategory(e.target.value)} style={{ flex: 1, minWidth: '150px' }}>
            <option value="all">All Categories</option>
            <option value="water">Water</option>
            <option value="electricity">Electricity</option>
            <option value="wifi">Wi-Fi</option>
            <option value="mess">Mess</option>
            <option value="maintenance">Maintenance</option>
          </select>
        </div>
      </div>

      {/* ISSUES */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', 
        gap: '1.5rem' 
      }}>
        {sortedIssues.map(issue => {
          const sla = getSlaFlag(issue);
          return (
            <div key={issue.id} className="glass-panel" style={{ padding: '1.5rem' }}>
              <h4 style={{ marginTop: 0, marginBottom: '0.5rem' }}>{issue.title}</h4>
              <span style={{
                display: 'inline-block',
                marginBottom: '0.5rem',
                color: "#fff",
                padding: "4px 8px",
                borderRadius: '6px',
                fontSize: '0.8rem',
                background: sla === "overdue" ? "var(--danger)" :
                            sla === "delayed" ? "var(--warning)" : "var(--success)"
              }}>
                {sla.toUpperCase()}
              </span>
              <p style={{ margin: '0.5rem 0', color: 'var(--text-muted)' }}>Status: <span style={{ color: 'var(--primary)' }}>{issue.status}</span></p>
              <p style={{ margin: '0.5rem 0', color: 'var(--text-muted)' }}>Urgency: {issue.urgency}</p>
              <p style={{ margin: '0.5rem 0', color: 'var(--text-muted)' }}>Location: {issue.location}</p>
              <div style={{ marginTop: '1rem' }}>
                {issue.status === "open" && (
                  <button onClick={() => updateStatus(issue, "assigned")} className="btn-primary" style={{ width: '100%', marginBottom: '0.5rem' }}>Assign</button>
                )}
                {issue.status === "assigned" && (
                  <button onClick={() => updateStatus(issue, "resolved")} className="btn-primary" style={{ width: '100%' }}>Resolve</button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
