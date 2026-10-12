import { useState } from 'react';
import { FileSearch, Upload, Loader, AlertCircle } from 'lucide-react';
import Panel from '../components/Panel';

const AI_SERVICE_URL = import.meta.env.VITE_AI_SERVICE_URL || 'http://127.0.0.1:5100';

const sections = [
  ['Skills', 'skills'],
  ['Objectives', 'objectives'],
  ['Achievements', 'achievements'],
  ['Experience', 'experience'],
  ['Education', 'education'],
  ['Projects', 'projects'],
  ['Certifications', 'certifications'],
  ['Keywords', 'keywords'],
  ['Interview Focus Areas', 'interviewFocusAreas'],
];

export default function ResumeParserTest() {
  const [file, setFile] = useState(null);
  const [profile, setProfile] = useState(null);
  const [isParsing, setIsParsing] = useState(false);
  const [error, setError] = useState('');

  const parseResume = async () => {
    if (!file) {
      setError('Select a resume file first.');
      return;
    }

    setIsParsing(true);
    setError('');
    setProfile(null);

    const formData = new FormData();
    formData.append('resume', file);

    try {
      const response = await fetch(`${AI_SERVICE_URL}/api/parse-resume`, {
        method: 'POST',
        body: formData,
      });
      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        throw new Error(
          `Resume parser returned ${response.status} ${response.statusText}. Start the Python AI service on ${AI_SERVICE_URL}.`,
        );
      }
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload.message || 'Resume parsing failed');
      }
      setProfile(payload.data);
    } catch (parseError) {
      setError(parseError.message || 'Could not connect to the resume parser service.');
    } finally {
      setIsParsing(false);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      <div>
        <p className="text-cyan-400 text-sm uppercase tracking-widest">Temporary Testing Page</p>
        <h1 className="text-3xl font-semibold mt-2">Resume Parser Output</h1>
        <p className="text-slate-400 mt-2">Upload a resume to inspect the structured information extracted by the AI service.</p>
      </div>

      <Panel>
        <div className="flex flex-col md:flex-row gap-4 md:items-end">
          <div className="flex-1">
            <label htmlFor="parser-resume" className="block text-sm text-slate-400 mb-2">Resume file</label>
            <input
              id="parser-resume"
              type="file"
              accept=".pdf,.doc,.docx,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
              onChange={(event) => {
                setFile(event.target.files?.[0] || null);
                setError('');
              }}
              className="w-full bg-slate-900/60 border border-slate-700 rounded-lg px-4 py-3 text-sm text-slate-300 file:mr-4 file:rounded file:border-0 file:bg-cyan-600 file:px-3 file:py-2 file:text-white"
            />
          </div>
          <button
            type="button"
            onClick={parseResume}
            disabled={isParsing}
            className="bg-cyan-600 hover:bg-cyan-500 disabled:opacity-60 px-5 py-3 rounded-lg font-semibold flex items-center justify-center gap-2"
          >
            {isParsing ? <Loader className="animate-spin" size={18} /> : <Upload size={18} />}
            {isParsing ? 'Parsing...' : 'Parse Resume'}
          </button>
        </div>
        {file && <p className="text-sm text-green-400 mt-3">Selected: {file.name}</p>}
        {error && (
          <div className="mt-4 rounded-lg border border-red-800 bg-red-950/30 p-3 text-red-300 flex items-center gap-2">
            <AlertCircle size={18} />
            {error}
          </div>
        )}
      </Panel>

      {!profile && !isParsing && (
        <Panel>
          <div className="min-h-48 flex flex-col items-center justify-center text-slate-500">
            <FileSearch size={42} className="mb-3 text-slate-600" />
            <p>Parsed resume information will appear here.</p>
          </div>
        </Panel>
      )}

      {profile && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Panel><p className="text-sm text-slate-400">Status</p><p className="text-xl font-semibold text-green-400 mt-1">{profile.status}</p></Panel>
            <Panel><p className="text-sm text-slate-400">Seniority</p><p className="text-xl font-semibold text-cyan-400 mt-1">{profile.seniority}</p></Panel>
            <Panel><p className="text-sm text-slate-400">Source File</p><p className="text-sm font-semibold text-slate-200 mt-2 break-all">{profile.sourceFile}</p></Panel>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sections.map(([label, key]) => (
              <Panel key={key}>
                <h2 className="text-lg font-semibold mb-3">{label}</h2>
                {Array.isArray(profile[key]) && profile[key].length > 0 ? (
                  <ul className="space-y-2 text-slate-300">
                    {profile[key].map((item, index) => <li key={`${key}-${index}`} className="border-l-2 border-cyan-500/60 pl-3">{item}</li>)}
                  </ul>
                ) : (
                  <p className="text-slate-500">No information detected.</p>
                )}
              </Panel>
            ))}
          </div>

          <Panel>
            <h2 className="text-lg font-semibold mb-3">Extracted Text</h2>
            <pre className="max-h-96 overflow-auto whitespace-pre-wrap text-sm text-slate-400 bg-slate-950/50 rounded-lg p-4">{profile.text || 'No text extracted.'}</pre>
          </Panel>
        </>
      )}
    </div>
  );
}
