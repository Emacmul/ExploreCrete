import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Upload, Mic, FileAudio, Loader2, Languages, AlignLeft, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Transcribe() {
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);

  const handleFile = (f) => {
    if (!f) return;
    setFile(f);
    setResult(null);
    setError(null);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const handleTranscribe = async () => {
    if (!file) return;
    setIsLoading(true);
    setError(null);
    setResult(null);

    const formData = new FormData();
    formData.append('file', file);

    const response = await base44.functions.invoke('transcribeAudio', formData);
    setIsLoading(false);

    if (response.data.error) {
      setError(response.data.error);
    } else {
      setResult(response.data);
    }
  };

  const clear = () => {
    setFile(null);
    setResult(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex flex-col items-center px-4 py-12">
      <div className="w-full max-w-2xl space-y-8">

        {/* Header */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-indigo-600 rounded-2xl mb-4 shadow-lg">
            <Mic className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Audio Transcriber</h1>
          <p className="text-gray-500 mt-2">Upload a WAV file — get a transcript and English translation.</p>
        </div>

        {/* Drop zone */}
        <div
          className={`relative border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ${
            isDragging
              ? 'border-indigo-500 bg-indigo-50'
              : file
              ? 'border-indigo-300 bg-indigo-50/50'
              : 'border-gray-300 hover:border-indigo-400 hover:bg-gray-50'
          }`}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
        >
          <input
            ref={inputRef}
            type="file"
            accept="audio/*,.wav,.mp3,.m4a,.ogg,.flac"
            className="hidden"
            onChange={(e) => handleFile(e.target.files[0])}
          />
          {file ? (
            <div className="flex flex-col items-center gap-3">
              <FileAudio className="w-10 h-10 text-indigo-500" />
              <div>
                <p className="font-semibold text-gray-800">{file.name}</p>
                <p className="text-sm text-gray-400">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); clear(); }}
                className="text-xs text-gray-400 hover:text-red-500 flex items-center gap-1 mt-1"
              >
                <X className="w-3 h-3" /> Remove
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 text-gray-400">
              <Upload className="w-10 h-10" />
              <div>
                <p className="font-medium text-gray-600">Drop your audio file here</p>
                <p className="text-sm">or click to browse</p>
              </div>
              <p className="text-xs">WAV, MP3, M4A, OGG, FLAC &middot; Any language</p>
            </div>
          )}
        </div>

        {/* Transcribe button */}
        <Button
          className="w-full h-12 text-base bg-indigo-600 hover:bg-indigo-700"
          disabled={!file || isLoading}
          onClick={handleTranscribe}
        >
          {isLoading ? (
            <span className="flex items-center gap-2"><Loader2 className="w-5 h-5 animate-spin" /> Transcribing...</span>
          ) : (
            <span className="flex items-center gap-2"><Mic className="w-5 h-5" /> Transcribe and Translate</span>
          )}
        </Button>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border shadow-sm p-6">
              <div className="flex items-center gap-2 mb-3">
                <AlignLeft className="w-4 h-4 text-gray-500" />
                <h2 className="font-semibold text-gray-800">Original Transcript</h2>
              </div>
              <p className="text-gray-700 leading-relaxed whitespace-pre-wrap text-sm">
                {result.transcript || 'No speech detected.'}
              </p>
            </div>

            <div className="bg-indigo-600 rounded-2xl shadow-sm p-6">
              <div className="flex items-center gap-2 mb-3">
                <Languages className="w-4 h-4 text-indigo-200" />
                <h2 className="font-semibold text-white">English Translation</h2>
              </div>
              <p className="text-indigo-50 leading-relaxed whitespace-pre-wrap text-sm">
                {result.translation || 'Nothing to translate.'}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}