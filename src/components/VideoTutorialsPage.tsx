import React, { useState, useEffect, useMemo } from 'react';
import {
  PlayCircle,
  Download,
  BookOpen,
  Search,
  X,
  Check,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Clock,
  ArrowRight,
  Flame,
  Video
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useVideoTutorials, usePdfGuides } from '@/hooks/useHelpAcademy';
import { VideoTutorial } from '@/types/helpAcademy';
import { toast } from 'react-hot-toast';

// ─── Constants ─────────────────────────────────────────────────────────────
const VIDEO_CATEGORIES = ['All', 'Leads', 'Calls', 'Reports', 'Settings'] as const;
type VideoCategory = typeof VIDEO_CATEGORIES[number];

const LS_KEY = 'watched_videos';

// ─── Skeleton Components ────────────────────────────────────────────────────
const VideoCardSkeleton = () => (
  <div className="animate-pulse bg-white rounded-[24px] border border-gray-100 p-3 space-y-3">
    <div className="aspect-video bg-gray-200 rounded-xl" />
    <div className="px-2 space-y-2">
      <div className="h-3 bg-gray-200 rounded-full w-4/5" />
      <div className="h-2 bg-gray-100 rounded-full w-full" />
      <div className="h-2 bg-gray-100 rounded-full w-3/4" />
    </div>
  </div>
);

const ContinueWatchingSkeleton = () => (
  <div className="animate-pulse bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-5 space-y-3">
    <div className="h-2 w-24 bg-slate-700 rounded-full" />
    <div className="h-4 bg-slate-700 rounded-full w-4/5" />
    <div className="h-2 bg-slate-700 rounded-full w-1/2" />
    <div className="h-9 bg-slate-700 rounded-xl mt-4" />
  </div>
);

// ─── Main Component ─────────────────────────────────────────────────────────
export const VideoTutorialsPage = () => {
  const {
    data: videos = [],
    isLoading: isVideosLoading,
    isError: isVideosError,
    refetch: refetchVideos
  } = useVideoTutorials();
  const { data: pdfs = [], isLoading: isPdfsLoading } = usePdfGuides();

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<VideoCategory>('All');

  // Player Modal
  const [activeVideo, setActiveVideo] = useState<VideoTutorial | null>(null);

  // Progress tracking via localStorage
  const [watchedIds, setWatchedIds] = useState<string[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem(LS_KEY);
    if (saved) {
      try { setWatchedIds(JSON.parse(saved)); } catch { /* ignore */ }
    }
  }, []);

  const toggleWatched = (videoId: string) => {
    const updated = watchedIds.includes(videoId)
      ? watchedIds.filter(id => id !== videoId)
      : [...watchedIds, videoId];
    setWatchedIds(updated);
    localStorage.setItem(LS_KEY, JSON.stringify(updated));
    toast.success(updated.includes(videoId) ? '✅ Marked as watched!' : 'Marked as unwatched.');
  };

  // Derived lists
  const filteredVideos = useMemo<VideoTutorial[]>(() => {
    return videos.filter(v => {
      const matchesSearch = v.title.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'All' || v.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [videos, searchQuery, selectedCategory]);

  const watchedVideos = useMemo<VideoTutorial[]>(() =>
    videos.filter(v => watchedIds.includes(v.id)), [videos, watchedIds]);

  const continueWatchingVideo = useMemo<VideoTutorial | null>(() =>
    videos.find(v => !watchedIds.includes(v.id)) ?? (videos[0] ?? null),
    [videos, watchedIds]);

  const relatedVideos = useMemo<VideoTutorial[]>(() => {
    if (!activeVideo) return [];
    return videos.filter(v => v.category === activeVideo.category && v.id !== activeVideo.id).slice(0, 4);
  }, [videos, activeVideo]);

  const primaryPdf = useMemo(() => pdfs[0] ?? null, [pdfs]);

  const handleNavigateVideo = (direction: 'next' | 'prev') => {
    if (!activeVideo) return;
    const currentIndex = videos.findIndex(v => v.id === activeVideo.id);
    if (currentIndex === -1) return;
    const targetIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
    if (targetIndex >= 0 && targetIndex < videos.length) {
      setActiveVideo(videos[targetIndex]);
    }
  };

  const watchedPercent = videos.length > 0
    ? Math.round((watchedIds.length / videos.length) * 100)
    : 0;

  return (
    <div className="max-w-6xl mx-auto pb-32 animate-in fade-in duration-300">

      {/* ── Header ── */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-black text-gray-900 tracking-tight font-display flex items-center gap-2">
          <Video className="text-brand-600" size={28} />
          CallMind Academy
        </h1>
        <p className="text-gray-500 font-medium mt-1 text-sm">
          Watch modular setup tutorials and download PDF blueprints.
        </p>
      </motion.div>

      {/* ── PDF Download Banner ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="bg-brand-600 rounded-[2rem] p-6 md:p-8 mb-8 flex flex-col md:flex-row items-center justify-between gap-8 shadow-xl shadow-brand-500/10"
      >
        <div className="flex items-start gap-5 text-white max-w-2xl">
          <div className="p-3.5 bg-white/10 rounded-2xl shrink-0 border border-white/20">
            <BookOpen size={24} />
          </div>
          <div>
            <h2 className="text-xl font-black mb-1">
              {!isPdfsLoading && primaryPdf ? primaryPdf.title : 'The 60-Second Setup PDF'}
            </h2>
            <p className="text-brand-100 font-semibold text-xs leading-relaxed">
              Prefer blueprint reading? Download our comprehensive 1-page PDF explaining telecalling SIM bindings,
              routing triggers, and AI outbound setups.
            </p>
          </div>
        </div>
        <a
          href={primaryPdf ? primaryPdf.file_url : '/CallMind_Setup_Guide.pdf'}
          target="_blank"
          rel="noreferrer"
          className="shrink-0 px-6 py-3.5 bg-white text-brand-600 text-xs font-black uppercase tracking-wider rounded-xl hover:shadow-lg transition-all flex items-center justify-center gap-1.5 w-full md:w-auto btn-tactile"
        >
          <Download size={16} /> Download PDF Guide
        </a>
      </motion.div>

      {/* ── Category Filter Tabs ── */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6"
      >
        {/* Category Pills */}
        <div className="flex flex-wrap gap-2">
          {VIDEO_CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all btn-tactile ${
                selectedCategory === cat
                  ? 'bg-brand-600 text-white shadow-md shadow-brand-500/20'
                  : 'bg-white border border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-700'
              }`}
            >
              {cat}
              {cat !== 'All' && (
                <span className={`ml-1.5 text-[8px] font-bold ${selectedCategory === cat ? 'text-brand-200' : 'text-gray-300'}`}>
                  {videos.filter(v => v.category === cat).length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-60">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={13} />
          <input
            type="text"
            placeholder="Search modules..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-8 py-2.5 bg-white border border-gray-200 rounded-xl text-[11px] font-semibold outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-400 text-gray-700 transition-all"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X size={12} />
            </button>
          )}
        </div>
      </motion.div>

      {/* ── Main Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">

        {/* ── Left Sidebar ── */}
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="lg:col-span-1 space-y-5"
        >
          {/* Progress Widget */}
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs space-y-3">
            <div className="flex items-center gap-2">
              <Flame size={14} className="text-orange-500" />
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Your Progress</span>
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between text-[10px] font-bold text-gray-600">
                <span>{watchedIds.length} / {videos.length} watched</span>
                <span>{watchedPercent}%</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${watchedPercent}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                  className="h-full bg-gradient-to-r from-brand-500 to-brand-600 rounded-full"
                />
              </div>
            </div>
            {watchedPercent === 100 && (
              <div className="flex items-center gap-1.5 text-emerald-600 text-[10px] font-black">
                <Check size={11} /> Academy complete! 🎉
              </div>
            )}
          </div>

          {/* Continue Watching */}
          {isVideosLoading ? (
            <ContinueWatchingSkeleton />
          ) : continueWatchingVideo ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-slate-950 text-slate-100 p-5 rounded-[24px] shadow-xs relative overflow-hidden flex flex-col justify-between border border-slate-900"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-brand-500/10 rounded-full blur-xl pointer-events-none" />
              <div>
                <span className="text-[8px] font-black text-brand-400 uppercase tracking-widest bg-brand-500/10 px-2 py-0.5 rounded-md inline-block">
                  Continue Watching
                </span>
                <div className="relative rounded-lg overflow-hidden aspect-video mt-3 mb-3">
                  <img
                    src={`https://img.youtube.com/vi/${continueWatchingVideo.youtube_id}/mqdefault.jpg`}
                    alt={continueWatchingVideo.title}
                    className="absolute inset-0 w-full h-full object-cover opacity-50"
                  />
                  <PlayCircle size={24} className="absolute inset-0 m-auto text-white opacity-80" />
                </div>
                <h4 className="font-bold text-xs line-clamp-2 leading-tight">{continueWatchingVideo.title}</h4>
                <p className="text-[9px] text-slate-500 mt-1 font-semibold flex items-center gap-1">
                  <Clock size={9} /> {continueWatchingVideo.duration} · {continueWatchingVideo.category}
                </p>
              </div>
              <button
                onClick={() => setActiveVideo(continueWatchingVideo)}
                className="w-full py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-[10px] font-black uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-1 btn-tactile mt-4"
              >
                <PlayCircle size={13} /> Resume Watch
              </button>
            </motion.div>
          ) : null}

          {/* Recently Watched */}
          {watchedVideos.length > 0 && (
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs space-y-3">
              <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                <Check size={11} className="text-emerald-500" /> Completed
              </h4>
              <div className="space-y-2">
                {watchedVideos.slice(0, 3).map(v => (
                  <button
                    key={v.id}
                    onClick={() => setActiveVideo(v)}
                    className="w-full flex items-center gap-2.5 text-left hover:bg-gray-50 p-1.5 rounded-xl transition-all group"
                  >
                    <div className="w-10 h-7 bg-slate-900 rounded-md overflow-hidden relative shrink-0">
                      <img
                        src={`https://img.youtube.com/vi/${v.youtube_id}/mqdefault.jpg`}
                        alt={v.title}
                        className="absolute inset-0 w-full h-full object-cover opacity-60"
                      />
                      <Check size={10} className="absolute inset-0 m-auto text-emerald-400" />
                    </div>
                    <span className="text-[10px] font-bold text-gray-700 group-hover:text-brand-600 transition-colors line-clamp-1">
                      {v.title}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </motion.div>

        {/* ── Video Catalog Grid ── */}
        <div className="lg:col-span-3">
          {isVideosLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {[1, 2, 3, 4, 5, 6].map(i => <VideoCardSkeleton key={i} />)}
            </div>
          ) : isVideosError ? (
            <div className="text-center py-16 space-y-4 bg-white border border-gray-150 rounded-[2rem]">
              <AlertCircle size={32} className="text-red-500 mx-auto" />
              <p className="text-xs text-gray-500 font-bold">Failed to load video guides.</p>
              <button
                onClick={() => refetchVideos()}
                className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-[10px] font-black uppercase rounded-xl transition-all btn-tactile"
              >
                Retry Connection
              </button>
            </div>
          ) : filteredVideos.length === 0 ? (
            <div className="text-center py-20 bg-white border border-gray-150 rounded-[2rem] space-y-3">
              <Video size={36} className="text-gray-200 mx-auto" />
              <p className="text-gray-400 italic text-xs font-semibold">
                No modules match your filters.{' '}
                <button
                  onClick={() => { setSearchQuery(''); setSelectedCategory('All'); }}
                  className="text-brand-600 underline"
                >
                  Reset filters
                </button>
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredVideos.map((video, idx) => {
                const isWatched = watchedIds.includes(video.id);
                return (
                  <motion.div
                    key={video.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    onClick={() => setActiveVideo(video)}
                    className="bg-white p-3 rounded-[24px] border border-gray-150 hover:border-brand-200 transition-all flex flex-col justify-between shadow-xs hover:shadow-md cursor-pointer group"
                  >
                    {/* Thumbnail */}
                    <div className="relative rounded-xl overflow-hidden aspect-video bg-slate-900 flex items-center justify-center">
                      <img
                        src={`https://img.youtube.com/vi/${video.youtube_id}/mqdefault.jpg`}
                        alt={video.title}
                        className="absolute inset-0 w-full h-full object-cover opacity-75 group-hover:scale-105 transition-all duration-300"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                      <PlayCircle
                        size={38}
                        className="relative z-10 text-white opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all duration-200"
                      />
                      {/* Watched badge */}
                      {isWatched && (
                        <div className="absolute top-2 right-2 bg-emerald-500 text-white p-1 rounded-full border-2 border-white shadow" title="Completed">
                          <Check size={11} />
                        </div>
                      )}
                      {/* Duration pill */}
                      <div className="absolute bottom-2 left-2 bg-black/60 text-white text-[9px] font-black px-2 py-0.5 rounded-md flex items-center gap-1">
                        <Clock size={9} /> {video.duration}
                      </div>
                    </div>

                    {/* Card Info */}
                    <div className="p-2.5 flex-1 flex flex-col justify-between mt-2">
                      <div>
                        <h3 className="font-bold text-gray-900 text-xs leading-tight mb-1 group-hover:text-brand-650 transition-colors font-display line-clamp-1">
                          {video.title}
                        </h3>
                        <p className="text-[10px] text-gray-400 line-clamp-2 leading-relaxed">{video.description}</p>
                      </div>
                      <div className="flex items-center justify-between mt-3.5 pt-2.5 border-t border-gray-50">
                        <span className="px-2 py-0.5 bg-brand-50 border border-brand-100 rounded text-[9px] font-black text-brand-500 uppercase tracking-wider">
                          {video.category}
                        </span>
                        <span className="text-[9px] font-black text-brand-650 uppercase tracking-widest flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                          Watch <ArrowRight size={10} />
                        </span>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Video Player Modal ── */}
      <AnimatePresence>
        {activeVideo && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setActiveVideo(null)}
              className="absolute inset-0 bg-gray-950/85 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="relative w-full max-w-4xl bg-white rounded-[2rem] p-6 shadow-2xl border border-gray-100 flex flex-col lg:flex-row gap-6 max-h-[90vh] overflow-y-auto custom-scrollbar"
            >
              {/* Player Column */}
              <div className="flex-1 space-y-4">
                {/* Embed */}
                <div className="relative rounded-2xl overflow-hidden aspect-video bg-black shadow-inner border border-gray-100">
                  <iframe
                    className="absolute inset-0 w-full h-full"
                    src={`https://www.youtube.com/embed/${activeVideo.youtube_id}?autoplay=1&rel=0`}
                    title={activeVideo.title}
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>

                {/* Title + Mark Watched */}
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-black text-gray-900 font-display">{activeVideo.title}</h2>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">
                      {activeVideo.category} · <Clock size={9} className="inline" /> {activeVideo.duration}
                    </p>
                  </div>
                  <button
                    onClick={() => toggleWatched(activeVideo.id)}
                    className={`px-4 py-2 border rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 btn-tactile ${
                      watchedIds.includes(activeVideo.id)
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200'
                        : 'bg-brand-600 text-white border-brand-650 hover:bg-brand-700'
                    }`}
                  >
                    {watchedIds.includes(activeVideo.id) ? (
                      <><Check size={12} /> Watched</>
                    ) : (
                      'Mark Watched'
                    )}
                  </button>
                </div>

                <p className="text-xs text-gray-500 leading-relaxed font-semibold">{activeVideo.description}</p>

                {/* Navigation */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                  <button
                    onClick={() => handleNavigateVideo('prev')}
                    className="px-3.5 py-2 bg-gray-50 hover:bg-gray-100 rounded-xl text-[10px] font-black uppercase border border-gray-150 flex items-center gap-1 transition-colors btn-tactile disabled:opacity-30"
                    disabled={videos.findIndex(v => v.id === activeVideo.id) === 0}
                  >
                    <ChevronLeft size={12} /> Prev Module
                  </button>
                  <button
                    onClick={() => handleNavigateVideo('next')}
                    className="px-3.5 py-2 bg-gray-50 hover:bg-gray-100 rounded-xl text-[10px] font-black uppercase border border-gray-150 flex items-center gap-1 transition-colors btn-tactile disabled:opacity-30"
                    disabled={videos.findIndex(v => v.id === activeVideo.id) === videos.length - 1}
                  >
                    Next Module <ChevronRight size={12} />
                  </button>
                </div>
              </div>

              {/* Related Sidebar */}
              <div className="w-full lg:w-64 space-y-4 shrink-0 lg:border-l lg:border-gray-100 lg:pl-6">
                <h3 className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Related Modules</h3>
                {relatedVideos.length === 0 ? (
                  <p className="text-[11px] text-gray-400 italic">No related modules found.</p>
                ) : (
                  <div className="space-y-3">
                    {relatedVideos.map(rel => (
                      <button
                        key={rel.id}
                        onClick={() => setActiveVideo(rel)}
                        className="w-full flex gap-2.5 cursor-pointer hover:bg-gray-50 p-2 rounded-xl transition-all border border-transparent hover:border-gray-100 group text-left"
                      >
                        <div className="w-20 aspect-video bg-slate-900 rounded-lg overflow-hidden shrink-0 relative flex items-center justify-center">
                          <img
                            src={`https://img.youtube.com/vi/${rel.youtube_id}/mqdefault.jpg`}
                            alt={rel.title}
                            className="absolute inset-0 w-full h-full object-cover opacity-70"
                          />
                          <PlayCircle size={14} className="text-white relative z-10" />
                          {watchedIds.includes(rel.id) && (
                            <div className="absolute top-1 right-1 bg-emerald-500 rounded-full p-0.5">
                              <Check size={8} className="text-white" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-bold text-gray-900 text-[10px] leading-snug line-clamp-2 group-hover:text-brand-600 transition-colors font-display">
                            {rel.title}
                          </h4>
                          <span className="text-[8px] text-gray-400 uppercase tracking-widest font-black mt-0.5 block flex items-center gap-0.5">
                            <Clock size={8} /> {rel.duration}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* Close */}
                <button
                  onClick={() => setActiveVideo(null)}
                  className="w-full py-2.5 bg-gray-900 hover:bg-slate-800 text-white text-[10px] font-black uppercase tracking-wider rounded-xl transition-colors btn-tactile shadow-xs flex items-center justify-center gap-1.5"
                >
                  <X size={12} /> Close Player
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
