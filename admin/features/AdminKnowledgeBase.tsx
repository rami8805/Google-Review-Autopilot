import React, { useState, useEffect } from 'react';
import type { KnowledgeBaseArticle } from '../../shared/types/domain';
import { BookOpen, Search, ChevronRight, X, Tag } from 'lucide-react';

export const AdminKnowledgeBase: React.FC = () => {
  const [articles, setArticles] = useState<KnowledgeBaseArticle[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedArticle, setSelectedArticle] = useState<KnowledgeBaseArticle | null>(null);

  const fetchArticles = async () => {
    try {
      const q = searchQuery ? `?search=${encodeURIComponent(searchQuery)}` : '';
      const res = await fetch(`/api/support/knowledge-base${q}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setArticles(json.data);
        }
      }
    } catch (err) {
      console.error('Failed to load knowledge base articles:', err);
    }
  };

  useEffect(() => {
    fetchArticles();
  }, [searchQuery]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-100 uppercase tracking-wider flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-indigo-400" />
            Platform Knowledge Base
          </h2>
          <p className="text-xs text-slate-400">
            Standard operating procedures, customer troubleshooting guides, and AI safety architectures
          </p>
        </div>

        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search guides (e.g. token, auto-publish, safety)..."
            className="text-xs pl-9 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 w-72"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {articles.map((article) => (
          <div
            key={article.id}
            onClick={() => setSelectedArticle(article)}
            className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-indigo-500/50 hover:bg-slate-800/30 transition cursor-pointer space-y-2 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800/60">
                  {article.category}
                </span>
                <span className="text-[10px] text-slate-500">
                  Updated {new Date(article.lastUpdated).toLocaleDateString()}
                </span>
              </div>
              <h3 className="font-bold text-slate-100 text-sm">{article.title}</h3>
              <p className="text-xs text-slate-400 mt-1 line-clamp-2">{article.summary}</p>
            </div>

            <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
              <div className="flex items-center gap-1">
                <Tag className="w-3 h-3 text-slate-500" />
                <span className="text-[10px] text-slate-500">{article.tags.slice(0, 3).join(', ')}</span>
              </div>
              <span className="text-indigo-400 text-xs font-semibold flex items-center gap-1">
                Read Article <ChevronRight className="w-3.5 h-3.5" />
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Article Reader Modal */}
      {selectedArticle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-4 sm:p-6 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl shadow-2xl p-6 space-y-4 max-h-[85vh] overflow-y-auto text-slate-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800">
                  {selectedArticle.category}
                </span>
                <h3 className="text-base font-bold text-slate-100 mt-2">{selectedArticle.title}</h3>
              </div>
              <button
                onClick={() => setSelectedArticle(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs leading-relaxed text-slate-300 whitespace-pre-line bg-slate-950/60 p-4 rounded-xl border border-slate-800 font-sans">
              {selectedArticle.content}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedArticle(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs rounded-lg text-white font-semibold"
              >
                Close Article
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
