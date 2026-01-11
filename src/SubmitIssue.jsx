import { useState } from "react";
import {
  addDoc,
  collection,
  serverTimestamp,
  Timestamp
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

import { app, auth, db, storage } from "./firebase";
import { autoClassify, urgencyToScore } from "./utils/autoClassify";

export default function SubmitIssue() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const [category, setCategory] = useState("");
  const [urgency, setUrgency] = useState("");

  const [imageFile, setImageFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const uploadIssueImage = async (userId) => {
    if (!imageFile) return null;

    const safeName = imageFile.name.replace(/\s+/g, "_");
    const path = `issue-images/${userId}/${Date.now()}_${safeName}`;
    const storageRef = ref(storage, path);

    await uploadBytes(storageRef, imageFile);
    const url = await getDownloadURL(storageRef);

    return { url, path, name: imageFile.name };
  };

  const submit = async (e) => {
    e.preventDefault();

    const user = auth.currentUser;
    if (!user) return alert("You are not logged in.");
    if (!title.trim()) return alert("Please enter a title.");

    setSubmitting(true);

    try {
      const auto = autoClassify(title, description);

      const finalCategory = category || auto.category;
      const finalUrgency = urgency || auto.urgency;
      const urgencyScore = urgencyToScore(finalUrgency);

      // ✅ Auto-route assignment (E feature included here)
      const autoAssignedTo =
        finalCategory === "water" ? "plumber"
        : finalCategory === "electricity" ? "electrician"
        : finalCategory === "wifi" ? "wifi_team"
        : finalCategory === "mess" ? "mess_supervisor"
        : finalCategory === "maintenance" ? "maintenance"
        : null;

      const location = "Hostel A";

      // ✅ Upload image if present
      const img = await uploadIssueImage(user.uid);

      await addDoc(collection(db, "issues"), {
        title,
        description,

        category: finalCategory,
        urgency: finalUrgency,
        urgencyScore,

        location,

        // ✅ Auto-assign staff
        assignedTo: autoAssignedTo,
        status: autoAssignedTo ? "assigned" : "open",
        assignedAt: autoAssignedTo ? serverTimestamp() : null,
        assignedBy: "system",

        // ✅ Evidence image
        evidenceImage: img
          ? { url: img.url, path: img.path, name: img.name }
          : null,

        // ✅ escalation fields
        escalated: false,
        escalatedAt: null,
        escalatedTo: null,

        statusHistory: [
          { status: "open", at: Timestamp.now() },
          ...(autoAssignedTo
            ? [{ status: "assigned", at: Timestamp.now(), note: `Auto-assigned to ${autoAssignedTo}` }]
            : [])
        ],

        createdBy: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),

        autoReason: auto.reason,
        isDeleted: false
      });

      setTitle("");
      setDescription("");
      setCategory("");
      setUrgency("");
      setImageFile(null);
    } catch (err) {
      console.error("Submit failed:", err);
      alert("Submit failed: " + (err?.code || err?.message));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit} style={{ padding: 12 }}>
      <h3>Report Issue</h3>

      <input
        placeholder="Issue title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        style={{ width: "100%", padding: 10, marginTop: 10 }}
      />

      <textarea
        placeholder="Describe the issue (recommended)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={3}
        style={{ width: "100%", padding: 10, marginTop: 10 }}
      />

      {/* ✅ Evidence Upload */}
      <div style={{ marginTop: 10 }}>
        <label style={{ fontWeight: 700 }}>Upload Evidence Image (optional)</label>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setImageFile(e.target.files?.[0] || null)}
          style={{ display: "block", marginTop: 6 }}
        />
        {imageFile && (
          <p style={{ marginTop: 6, fontSize: 12, opacity: 0.8 }}>
            Selected: <b>{imageFile.name}</b>
          </p>
        )}
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">Auto Category</option>
          <option value="water">Water</option>
          <option value="electricity">Electricity</option>
          <option value="wifi">Wi-Fi</option>
          <option value="mess">Mess</option>
          <option value="maintenance">Maintenance</option>
          <option value="other">Other</option>
        </select>

        <select value={urgency} onChange={(e) => setUrgency(e.target.value)}>
          <option value="">Auto Urgency</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>

        <button type="submit" disabled={submitting}>
          {submitting ? "Submitting..." : "Submit"}
        </button>
      </div>
    </form>
  );
}
