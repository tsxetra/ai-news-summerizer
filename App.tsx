
import React, { useState, useRef, useCallback } from 'react';
import { summarizeArticleFromUrl, generateSpeechFromText } from './services/geminiService';
import { decode, decodeAudioData } from './utils/audio';

const LoaderIcon: React.FC<{ className: string }> = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
);

const PlayIcon: React.FC<{ className: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M8 5v14l11-7z" />
  </svg>
);

const PauseIcon: React.FC<{ className: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
  </svg>
);

const App: React.FC = () => {
  const [url, setUrl] = useState<string>('');
  const [summary, setSummary] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);

  const stopPlayback = useCallback(() => {
    if (audioSourceRef.current) {
      audioSourceRef.current.onended = null;
      audioSourceRef.current.stop();
      audioSourceRef.current = null;
    }
    setIsPlaying(false);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) {
      setError("Please enter a valid URL.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setSummary('');
    setAudioBuffer(null);
    stopPlayback();

    try {
      const summaryText = await summarizeArticleFromUrl(url);
      setSummary(summaryText);
      
      const audioB64 = await generateSpeechFromText(summaryText);
      if (!audioB64) {
          throw new Error("Failed to generate audio.");
      }

      if (!audioContextRef.current) {
          // FIX: Cast window to `any` to allow access to `webkitAudioContext` for older browser compatibility.
          const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
          audioContextRef.current = new AudioContext({ sampleRate: 24000 });
      }

      const decodedBytes = decode(audioB64);
      const buffer = await decodeAudioData(decodedBytes, audioContextRef.current, 24000, 1);
      setAudioBuffer(buffer);

    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "An unknown error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const togglePlayback = useCallback(() => {
    if (isPlaying) {
      stopPlayback();
    } else if (audioBuffer && audioContextRef.current) {
      // Resume audio context if it was suspended
      if (audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume();
      }
      
      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContextRef.current.destination);
      source.onended = () => {
        setIsPlaying(false);
        audioSourceRef.current = null;
      };
      source.start(0);
      audioSourceRef.current = source;
      setIsPlaying(true);
    }
  }, [isPlaying, audioBuffer, stopPlayback]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-gray-900 text-gray-200 font-sans p-4 sm:p-6 lg:p-8">
      <div className="max-w-3xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-4xl sm:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-teal-300 to-cyan-400">
            Audio News Summarizer
          </h1>
          <p className="mt-2 text-lg text-gray-400">Your news, summarized and spoken, for your commute.</p>
        </header>

        <form onSubmit={handleSubmit} className="mb-8">
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Paste news article URL here..."
              className="flex-grow w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-400 transition duration-200 text-gray-200 placeholder-gray-500"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading}
              className="flex items-center justify-center px-6 py-3 bg-teal-500 text-white font-semibold rounded-md hover:bg-teal-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-teal-400 transition duration-200 disabled:bg-gray-600 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <LoaderIcon className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" />
                  Generating...
                </>
              ) : (
                "Summarize & Listen"
              )}
            </button>
          </div>
        </form>

        {error && (
          <div className="bg-red-900/50 border border-red-700 text-red-200 px-4 py-3 rounded-md mb-6" role="alert">
            <strong className="font-bold">Error: </strong>
            <span className="block sm:inline">{error}</span>
          </div>
        )}

        {summary && (
          <div className="bg-gray-800/50 backdrop-blur-sm p-6 rounded-lg ring-1 ring-white/10 space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-semibold text-teal-300">Summary</h2>
              {audioBuffer && (
                 <button onClick={togglePlayback} className="flex items-center justify-center w-14 h-14 rounded-full bg-teal-500 text-white hover:bg-teal-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-teal-400 transition-transform duration-200 active:scale-95">
                  {isPlaying ? <PauseIcon className="w-8 h-8"/> : <PlayIcon className="w-8 h-8"/>}
                </button>
              )}
            </div>
            <p className="text-gray-300 leading-relaxed whitespace-pre-wrap">{summary}</p>
          </div>
        )}

      </div>
    </div>
  );
};

export default App;
