'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';

// API Configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface Voice {
  id: string;
  name: string;
  category: string;
  description: string;
}

interface ProjectStatus {
  project_id: string;
  status: string;
  progress: number;
  current_step: string;
  video_url?: string;
  error?: string;
}

export default function Home() {
  const [topic, setTopic] = useState('');
  const [voices, setVoices] = useState<Voice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState('');
  const [duration, setDuration] = useState(60);
  const [style, setStyle] = useState('engaging');
  const [isGenerating, setIsGenerating] = useState(false);
  const [projectStatus, setProjectStatus] = useState<ProjectStatus | null>(null);
  const [videoUrl, setVideoUrl] = useState('');

  // Fetch available voices on mount
  useEffect(() => {
    fetchVoices();
  }, []);

  // Poll project status when generating
  useEffect(() => {
    if (projectStatus && projectStatus.status !== 'completed' && projectStatus.status !== 'failed') {
      const interval = setInterval(() => {
        fetchProjectStatus(projectStatus.project_id);
      }, 2000); // Poll every 2 seconds

      return () => clearInterval(interval);
    }
  }, [projectStatus]);

  const fetchVoices = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/voices`);
      setVoices(response.data);
      if (response.data.length > 0) setSelectedVoice(response.data[0].id);
    } catch (error) {
      console.error('Error fetching voices:', error);
    }
  };

  const fetchProjectStatus = async (projectId: string) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/status/${projectId}`);
      setProjectStatus(response.data);
      if (response.data.status === 'completed') {
        setVideoUrl(response.data.video_url);
        setIsGenerating(false);
      } else if (response.data.status === 'failed') {
        setIsGenerating(false);
      }
    } catch (error) {
      console.error('Error fetching status:', error);
    }
  };

  const handleGenerate = async () => {
    if (!topic || !selectedVoice) return;

    setIsGenerating(true);
    setVideoUrl('');
    try {
      const response = await axios.post(`${API_BASE_URL}/api/generate`, {
        topic,
        voice_id: selectedVoice,
        duration,
        style
      });
      setProjectStatus(response.data);
    } catch (error) {
      console.error('Error starting generation:', error);
      setIsGenerating(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-900 via-purple-900 to-black text-white p-6">
      <div className="max-w-4xl mx-auto">
        <header className="text-center mb-12">
          <h1 className="text-5xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-600 mb-4">
            The Viral Engine
          </h1>
          <p className="text-gray-300 text-lg">Create viral AI videos in minutes, not hours.</p>
        </header>

        <div className="grid gap-8">
          {/* Input Section */}
          <section className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-8 border border-purple-500/20 shadow-2xl">
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-purple-300 mb-2">What's your video about?</label>
                <textarea
                  className="w-full bg-gray-900/50 border border-gray-700 rounded-xl p-4 focus:ring-2 focus:ring-purple-500 outline-none transition-all h-32"
                  placeholder="E.g., The secret history of the pyramids..."
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-purple-300 mb-2">Select AI Voice</label>
                  <select
                    className="w-full bg-gray-900/50 border border-gray-700 rounded-xl p-3 focus:ring-2 focus:ring-purple-500 outline-none"
                    value={selectedVoice}
                    onChange={(e) => setSelectedVoice(e.target.value)}
                  >
                    {voices.map((voice) => (
                      <option key={voice.id} value={voice.id}>{voice.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-purple-300 mb-2">Video Style</label>
                  <select
                    className="w-full bg-gray-900/50 border border-gray-700 rounded-xl p-3 focus:ring-2 focus:ring-purple-500 outline-none"
                    value={style}
                    onChange={(e) => setStyle(e.target.value)}
                  >
                    <option value="engaging">Engaging & Fast-paced</option>
                    <option value="cinematic">Cinematic Storytelling</option>
                    <option value="educational">Educational & Clear</option>
                    <option value="scary">Scary / Horror</option>
                  </select>
                </div>
              </div>

              <button
                className={`w-full py-4 rounded-xl font-bold text-lg transition-all transform hover:scale-[1.02] active:scale-[0.98] ${
                  isGenerating 
                    ? 'bg-gray-700 cursor-not-allowed' 
                    : 'bg-gradient-to-r from-purple-600 to-pink-600 shadow-lg shadow-purple-500/25'
                }`}
                onClick={handleGenerate}
                disabled={isGenerating || !topic}
              >
                {isGenerating ? '🎬 Generating your masterpiece...' : '🚀 Generate Viral Video'}
              </button>
            </div>
          </section>

          {/* Progress / Status Section */}
          {projectStatus && (
            <div className="bg-gray-800/30 rounded-2xl p-6 border border-gray-700">
              <div className="flex justify-between items-center mb-4">
                <span className="text-sm font-medium text-gray-400">Status: {projectStatus.status.replace('_', ' ')}</span>
                <span className="text-sm font-bold text-purple-400">{projectStatus.progress}%</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-3 mb-4 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-purple-500 to-pink-500 h-full transition-all duration-500"
                  style={{ width: `${projectStatus.progress}%` }}
                />
              </div>
              <p className="text-center text-sm text-gray-300 italic">{projectStatus.current_step}</p>
              
              {projectStatus.status === 'failed' && (
                <div className="mt-4 p-4 bg-red-900/30 border border-red-500/50 rounded-lg text-red-400 text-sm">
                  ❌ {projectStatus.error || 'Something went wrong. Please try again.'}
                </div>
              )}
            </div>
          )}

          {/* Video Preview */}
          {videoUrl && (
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-8 border border-purple-500/20 shadow-2xl">
              <h3 className="text-xl font-semibold mb-4">🎉 Your Video is Ready!</h3>
              <div className="aspect-[9/16] max-w-md mx-auto bg-black rounded-lg overflow-hidden">
                <video
                  controls
                  className="w-full h-full"
                  src={videoUrl}
                >
                  Your browser does not support the video tag.
                </video>
              </div>
              <div className="mt-6 text-center">
                <a
                  href={videoUrl}
                  download
                  className="inline-block px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 rounded-lg font-semibold transition-all transform hover:scale-105"
                >
                  📥 Download Video
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
    }
    
