'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, CheckCircle, AlertCircle, ImagePlus } from 'lucide-react';
import { useStore } from '../store';

const STATUS_CYCLE = [
  'Analyzing your request...',
  'Generating floor plan...',
  'Placing fixtures...',
  'Checking building codes...',
  'Finalizing...',
];

export const ChatPanel = () => {
  const [input, setInput] = useState('');
  const [cycleIndex, setCycleIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const chatHistory = useStore(state => state.chatHistory);
  const submitPrompt = useStore(state => state.submitPrompt);
  const isGenerating = useStore(state => state.isGenerating);
  const generatingStatus = useStore(state => state.generatingStatus);
  const submitImage = useStore(state => state.submitImage);
  const addToast = useStore(state => state.addToast);

  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, isGenerating]);

  useEffect(() => {
    if (!isGenerating) {
      setCycleIndex(0);
      return;
    }
    const interval = setInterval(() => {
      setCycleIndex(i => (i + 1) % STATUS_CYCLE.length);
    }, 1800);
    return () => clearInterval(interval);
  }, [isGenerating]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isGenerating) return;
    const text = input;
    setInput('');
    await submitPrompt(text);
  };

  const processFile = (file: File) => {
    if (!file || isGenerating) return;
    if (file.size > 5 * 1024 * 1024) {
      addToast({ type: 'error', message: 'Image must be under 5MB' });
      return;
    }
    const reader = new FileReader();
    reader.onload = async (event) => {
      const dataUrl = event.target?.result as string;
      await submitImage(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) processFile(file);
  };

  const displayStatus = generatingStatus || STATUS_CYCLE[cycleIndex];
  const showDropZone = chatHistory.length === 1;

  return (
    <div
      className="flex flex-col h-full w-full"
      style={{ background: 'var(--background)' }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drag overlay */}
      {isDragging && (
        <div
          className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-3 m-3 rounded-2xl"
          style={{ background: 'rgba(26,22,18,0.92)', border: '2px dashed var(--accent)' }}
        >
          <ImagePlus className="w-8 h-8" style={{ color: 'var(--accent)' }} />
          <span className="text-sm font-medium" style={{ color: 'var(--accent)', fontFamily: 'Instrument Sans, sans-serif' }}>
            Drop to analyze sketch
          </span>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth relative">
        {chatHistory.map((msg) => (
          <div key={msg.id} className={`flex gap-3 animate-fade-in-up ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{
                background: msg.role === 'assistant'
                  ? 'rgba(200,169,110,0.12)'
                  : 'var(--panel-elevated)',
                border: `1px solid ${msg.role === 'assistant' ? 'rgba(200,169,110,0.25)' : 'var(--border-color)'}`,
                color: msg.role === 'assistant' ? 'var(--accent)' : 'var(--text-secondary)',
              }}
            >
              {msg.role === 'assistant' ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
            </div>
            <div className="flex flex-col gap-1 max-w-[85%]">
              <div
                className="rounded-2xl p-3 text-sm"
                style={msg.role === 'user'
                  ? { background: 'var(--accent)', color: '#1a1612', borderRadius: '16px 4px 16px 16px', fontFamily: 'Instrument Sans, sans-serif' }
                  : msg.isError
                    ? { background: 'rgba(224,112,112,0.06)', color: 'var(--text-primary)', border: '1px solid rgba(224,112,112,0.3)', borderRadius: '4px 16px 16px 16px', fontFamily: 'Instrument Sans, sans-serif' }
                    : { background: 'var(--panel-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: '4px 16px 16px 16px', fontFamily: 'Instrument Sans, sans-serif' }
                }
              >
                {msg.isError && msg.role === 'assistant' && (
                  <AlertCircle className="w-3.5 h-3.5 inline mr-1.5 mb-0.5" style={{ color: 'var(--error)' }} />
                )}
                {msg.imageUrl && (
                  <div className="mb-3 rounded-xl overflow-hidden" style={{ border: '1px solid var(--border-color)' }}>
                    <img src={msg.imageUrl} alt="Uploaded sketch" className="max-w-full h-auto max-h-48 object-contain" style={{ background: 'var(--background)' }} />
                  </div>
                )}
                <div className="whitespace-pre-wrap leading-relaxed">{msg.content}</div>
              </div>
              {msg.hasPlanUpdate && (
                <div className="flex items-center gap-1 text-xs px-1" style={{ color: 'var(--accent)' }}>
                  <CheckCircle className="w-3 h-3" />
                  <span>Plan updated</span>
                </div>
              )}
              {msg.timestamp && (
                <div
                  className={`text-xs px-1 ${msg.role === 'user' ? 'text-right' : ''}`}
                  style={{ color: 'var(--text-muted)', fontFamily: 'IBM Plex Mono, monospace', fontSize: 10 }}
                >
                  {msg.timestamp}
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Drop zone shown when only welcome message exists */}
        {showDropZone && !isGenerating && (
          <div
            className="drop-overlay flex flex-col items-center justify-center gap-3 py-10 mx-1 mt-2 cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            <ImagePlus className="w-8 h-8" style={{ color: 'var(--accent)', opacity: 0.7 }} />
            <div className="text-center">
              <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)', fontFamily: 'Instrument Sans, sans-serif' }}>
                Drop a sketch or photo of your space
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)', fontFamily: 'IBM Plex Mono, monospace' }}>
                or click to browse · max 5MB
              </p>
            </div>
          </div>
        )}

        {isGenerating && (
          <div className="flex gap-3">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(200,169,110,0.12)', border: '1px solid rgba(200,169,110,0.25)', color: 'var(--accent)' }}
            >
              <Bot className="w-4 h-4" />
            </div>
            <div
              className="rounded-2xl p-4 text-sm flex items-center gap-3"
              style={{ background: 'var(--panel-elevated)', border: '1px solid var(--border-color)', borderRadius: '4px 16px 16px 16px', color: 'var(--text-secondary)' }}
            >
              <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" style={{ color: 'var(--accent)' }} />
              <span className="animate-pulse" style={{ fontFamily: 'Instrument Sans, sans-serif' }}>{displayStatus}</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="p-3 space-y-2" style={{ borderTop: '1px solid var(--border-color)', background: 'rgba(35,31,27,0.5)' }}>
        {/* Upload sketch button row */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isGenerating}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-all duration-200 disabled:opacity-40"
          style={{
            background: 'var(--panel-elevated)',
            border: '1px solid var(--border-color)',
            color: 'var(--text-secondary)',
            fontFamily: 'Instrument Sans, sans-serif',
          }}
        >
          <ImagePlus className="w-4 h-4" style={{ color: 'var(--accent)' }} />
          <span>Upload Sketch</span>
        </button>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleImageUpload}
          accept="image/*"
          className="hidden"
        />

        <form onSubmit={handleSubmit} className="flex gap-2 items-center">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Describe your layout..."
            className="flex-1 rounded-xl px-4 py-2.5 text-sm focus:outline-none transition-all input-enhanced"
            style={{
              background: 'var(--panel-elevated)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-primary)',
              fontFamily: 'Instrument Sans, sans-serif',
            }}
            disabled={isGenerating}
          />
          <button
            type="submit"
            disabled={!input.trim() || isGenerating}
            className="rounded-xl p-2.5 transition-all duration-200 flex flex-shrink-0 items-center justify-center"
            style={{
              background: input.trim() && !isGenerating ? 'var(--accent)' : 'var(--panel-elevated)',
              color: input.trim() && !isGenerating ? '#1a1612' : 'var(--text-muted)',
              border: '1px solid var(--border-color)',
            }}
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
