import { useState } from "react";
import {
  addDoc,
  collection,
  serverTimestamp,
  Timestamp,
  getDocs,
  query,
  where
} from "firebase/firestore";
import { auth, db } from "./firebase";

/* ---------- DUPLICATE HELPERS ---------- */

function normalize(s) {
  return s.toLowerCase().replace(/[^a-z0-9 ]/g, "").trim();
}

function similarity(a, b) {
  const A = new Set(normalize(a).split(" "));
  const B = new Set(normalize(b).split(" "));
  const inter = [...A].filter(x => B.has(x)).length;
  return inter / Math.max(A.size, B.size || 1);
}

/* ---------- COMPONENT ---------- */

export default function SubmitIssue() {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [urgency, setUrgency] = useState("");
  const [warning, setWarning] = useState("");

  const checkDuplicates = async (val) => {
    if (val.length < 6) {
      setWarning("");
      return;
    }

    const since = Timestamp.fromMillis(Date.now() - 24 * 60 * 60 * 1000);
    const q = query(
      collection(db, "issues"),
      where("createdAt", ">", since)
    );

    const snap = await getDocs(q);
    for (const d of snap.docs) {
      if (similarity(val, d.data().title || "") > 0.6) {
        setWarning(`Similar issue already reported: "${d.data().title}"`);
        return;
      }
    }
    setWarning("");
  };

  const submit = async (e) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user) return;

    await addDoc(collection(db, "issues"), {
      title,
      category,
      urgency,
      location: "Hostel A",
      status: "open",
      statusHistory: [{ status: "open", at: Timestamp.now() }],
      createdBy: user.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    setTitle("");
    setCategory("");
    setUrgency("");
    setWarning("");
  };

  return (
    <div className="glass-panel" style={{ maxWidth: '500px', margin: '0 auto 2rem', padding: '2rem' }}>
      <h3 style={{ marginBottom: '1.5rem', color: 'var(--primary)' }}>Report Issue</h3>

      <form onSubmit={submit}>
        <div style={{ marginBottom: '1rem' }}>
          <input
            placeholder="Issue title"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              checkDuplicates(e.target.value);
            }}
            required
          />
        </div>

        {warning && <p style={{ color: 'var(--warning)', marginBottom: '1rem' }}>{warning}</p>}

        <div style={{ marginBottom: '1rem' }}>
          <select value={category} onChange={e => setCategory(e.target.value)} required>
            <option value="">Category</option>
            <option value="water">Water</option>
            <option value="electricity">Electricity</option>
            <option value="wifi">Wi-Fi</option>
            <option value="mess">Mess</option>
            <option value="maintenance">Maintenance</option>
          </select>
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <select value={urgency} onChange={e => setUrgency(e.target.value)} required>
            <option value="">Urgency</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>

        <button type="submit" className="btn-primary">Submit Issue</button>
      </form>
    </div>
  );
}
