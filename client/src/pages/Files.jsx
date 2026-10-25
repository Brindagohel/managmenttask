import { useEffect, useRef, useState } from 'react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function Files() {
  const [files, setFiles] = useState([]);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const inputRef = useRef();

  const load = async () => {
    const res = await fetch(`${API}/api/files`);
    setFiles(await res.json());
  };
  useEffect(() => { load().catch(() => {}); }, []);

  const upload = async (list) => {
    const pdfs = [...list].filter((f) => f.type === 'application/pdf');
    if (!pdfs.length) return setError('Only PDF files are allowed');
    setError('');
    setBusy(true);
    const form = new FormData();
    pdfs.forEach((f) => form.append('files', f));
    const res = await fetch(`${API}/api/files`, { method: 'POST', body: form });
    if (!res.ok) setError((await res.json()).message || 'Upload failed');
    setBusy(false);
    load();
  };

  const remove = async (name) => {
    await fetch(`${API}/api/files/${encodeURIComponent(name)}`, { method: 'DELETE' });
    load();
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    upload(e.dataTransfer.files);
  };

  return (
    <div style={{ padding: 32 }}>
      <h1 style={{ marginBottom: 16 }}>Files</h1>

      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current.click()}
        style={{
          border: `2px dashed ${dragging ? '#d63d78' : '#f0a9c4'}`,
          background: dragging ? '#ffe3ee' : '#fff0f5',
          borderRadius: 16,
          padding: 48,
          textAlign: 'center',
          cursor: 'pointer',
          transition: 'all .15s',
        }}
      >
        <p style={{ fontSize: 18, margin: 0 }}>
          {busy ? 'Uploading…' : 'Drag & drop PDF files here, or click to browse'}
        </p>
        <p style={{ color: '#888', marginTop: 8 }}>PDF only, up to 10 MB each</p>
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          multiple
          hidden
          onChange={(e) => { upload(e.target.files); e.target.value = ''; }}
        />
      </div>

      {error && <p style={{ color: 'red', marginTop: 12 }}>{error}</p>}

      <h3 style={{ margin: '28px 0 12px' }}>Uploaded files ({files.length})</h3>
      {files.length === 0 && <p style={{ color: '#888' }}>No files yet.</p>}
      {files.map((f) => (
        <div
          key={f.name}
          style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '12px 16px', background: '#fff', borderRadius: 12,
            marginBottom: 8, boxShadow: '0 1px 4px rgba(0,0,0,.06)',
          }}
        >
          <a href={`${API}${f.url}`} target="_blank" rel="noreferrer">
            📄 {f.name.replace(/^\d+-/, '')}
          </a>
          <span style={{ color: '#888', fontSize: 13 }}>
            {(f.size / 1024).toFixed(0)} KB
            <button onClick={() => remove(f.name)} style={{ marginLeft: 16, cursor: 'pointer' }}>
              Delete
            </button>
          </span>
        </div>
      ))}
    </div>
  );
}