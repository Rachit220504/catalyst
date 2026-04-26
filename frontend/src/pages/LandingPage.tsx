import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UploadCloud, FileText, ArrowRight, Loader2, CheckCircle2, Sparkles } from 'lucide-react';

// Make sure there is NO '/api' here so it matches the backend routes perfectly
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3005';
export default function LandingPage() {
  const [jobDescription, setJobDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const navigate = useNavigate();

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files?.[0]?.type === 'application/pdf') {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jobDescription || !file) return;
    setLoading(true);

    try {
      const userRes = await fetch(`${API_URL}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: `guest_${Date.now()}@example.com` })
      });
      if (!userRes.ok) {
        const err = await userRes.json().catch(() => ({}));
        throw new Error(`POST /users failed (${userRes.status}): ${err.error ?? 'unknown'}`);
      }
      const user = await userRes.json();

      const sessionRes = await fetch(`${API_URL}/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          jobDescription,
          resumeText: '',
          chatHistory: [],
          learningPlan: {}
        })
      });
      if (!sessionRes.ok) {
        const err = await sessionRes.json().catch(() => ({}));
        throw new Error(`POST /sessions failed (${sessionRes.status}): ${err.error ?? 'unknown'}`);
      }
      const session = await sessionRes.json();

      const formData = new FormData();
      formData.append('sessionId', session.id);
      formData.append('resume', file);

      const resumeRes = await fetch(`${API_URL}/upload-resume`, { method: 'POST', body: formData });
      if (!resumeRes.ok) {
        const err = await resumeRes.json().catch(() => ({}));
        throw new Error(`POST /upload-resume failed (${resumeRes.status}): ${err.error ?? ''} ${err.details ?? ''}`);
      }

      navigate('/chat', { state: { sessionId: session.id, jobDescription } });
    } catch (err: any) {
      console.error(err);
      alert(err.message ?? 'Error starting assessment.');
    } finally {
      setLoading(false);
    }
  };

  const canSubmit = !!jobDescription.trim() && !!file && !loading;

  return (
    <div className="landing-wrap fade-in">
      {/* Hero */}
      <div className="landing-hero">
        <div className="landing-badge">
          <span className="landing-badge-dot" />
          AI-Powered Technical Assessment
        </div>
        <h1 className="landing-title">
          Master Your<br />
          <span className="gradient-text">Next Interview</span>
        </h1>
        <p className="landing-sub">
          Upload your resume and job description. Our AI assessor will evaluate your skills and craft a personalized learning roadmap — in minutes.
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <div className="form-grid">
          {/* Job Description */}
          <div className="glass-card">
            <div className="card-label indigo">
              <FileText />
              Job Description
            </div>
            <textarea
              className="styled-textarea"
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Paste the target job description here…&#10;&#10;e.g. We are looking for a Senior Data Engineer skilled in Spark, dbt, and Medallion architecture…"
              required
            />
          </div>

          {/* Resume Upload */}
          <div className="glass-card">
            <div className="card-label blue">
              <UploadCloud />
              Your Resume (PDF)
            </div>
            <label
              className={`dropzone ${file ? 'has-file' : ''} ${dragOver ? 'has-file' : ''}`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleFileDrop}
            >
              <input
                type="file"
                accept=".pdf"
                style={{ display: 'none' }}
                onChange={(e) => e.target.files && setFile(e.target.files[0])}
              />
              <div className="dropzone-icon">
                {file ? <CheckCircle2 size={26} /> : <UploadCloud size={26} />}
              </div>
              <span className="dropzone-text">
                {file ? file.name : 'Drop PDF here or click to browse'}
              </span>
              <span className="dropzone-hint">
                {file ? '✓ Ready to assess' : 'PDF format only · Max 10MB'}
              </span>
            </label>
          </div>
        </div>

        {/* Submit */}
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <button
            type="submit"
            disabled={!canSubmit}
            className="btn-primary"
          >
            {loading
              ? <><Loader2 size={18} className="spin" /> Uploading…</>
              : <><Sparkles size={18} /> Start AI Assessment <ArrowRight size={18} /></>
            }
          </button>
        </div>
      </form>
    </div>
  );
}