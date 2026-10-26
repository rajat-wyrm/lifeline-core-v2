'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Search, 
  Building2, 
  ShieldAlert, 
  FileText, 
  ArrowRight, 
  MapPin, 
  Clock, 
  BookOpen,
  HelpCircle,
  Activity
} from 'lucide-react';
import { fetchApi } from '@/lib/api';

interface SearchResults {
  hospitals: Array<{
    id: string;
    name: string;
    latitude: number;
    longitude: number;
  }>;
  reservations: Array<{
    id: string;
    hospital_id: string;
    resource_type: string;
    state: string;
  }>;
  playbooks: Array<{
    id: string;
    title: string;
    category: string;
    content: string;
  }>;
}

export default function GlobalSearchPage() {
  const [query, setQuery] = useState('PGIMER');
  const [results, setResults] = useState<SearchResults>({ hospitals: [], reservations: [], playbooks: [] });
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const performSearch = async (term: string) => {
    if (!term || term.trim().length === 0) return;
    try {
      setLoading(true);
      const res = await fetchApi<{ results: SearchResults }>(`/api/v2/search?q=${encodeURIComponent(term.trim())}`);
      setResults(res.results);
      setSearched(true);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    performSearch(query);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    performSearch(query);
  };

  const totalResults = results.hospitals.length + results.reservations.length + results.playbooks.length;

  return (
    <div className="space-y-6">
      {/* Search Header */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-xl">
        <div className="max-w-3xl">
          <div className="flex items-center gap-2 mb-2">
            <Search className="w-5 h-5 text-red-500" />
            <h1 className="text-xl font-bold text-white tracking-tight">
              Global Operational Search
            </h1>
          </div>
          <p className="text-xs text-slate-400 mb-4">
            Search facilities, active holds, patient dispatches, and emergency playbooks using PostgreSQL trigram inverted indexes and semantic vector similarity.
          </p>

          <form onSubmit={handleSearchSubmit} className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-500" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by facility name, sector, reservation ID, or medical protocol..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-28 py-3 text-sm text-slate-100 focus:outline-none focus:border-red-500 shadow-inner transition"
            />
            <button
              type="submit"
              disabled={loading}
              className="absolute right-2 top-2 bg-red-600 hover:bg-red-500 text-white text-xs px-4 py-1.5 rounded-lg font-medium transition cursor-pointer"
            >
              {loading ? 'Searching...' : 'Search'}
            </button>
          </form>

          {/* Quick Search Chips */}
          <div className="flex items-center gap-2 mt-3 text-xs text-slate-400 flex-wrap">
            <span>Suggestions:</span>
            {['PGIMER', 'Ventilator Shortage', 'Mass Casualty', 'Sector 32', 'Fortis'].map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => { setQuery(chip); performSearch(chip); }}
                className="px-2.5 py-1 rounded-md bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition text-[11px] cursor-pointer"
              >
                {chip}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Results Workspace */}
      {searched && (
        <div className="space-y-6">
          <div className="flex items-center justify-between text-xs text-slate-400 px-1">
            <span>Found {totalResults} matching entities for &quot;{query}&quot;</span>
            <span>Trigram & Vector Inverted Index</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Hospitals Column */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <div className="flex items-center gap-2 text-xs font-semibold text-white">
                  <Building2 className="w-4 h-4 text-sky-400" />
                  <span>Hospitals ({results.hospitals.length})</span>
                </div>
              </div>

              {results.hospitals.length === 0 ? (
                <p className="text-xs text-slate-500 py-4 text-center">No matching facilities</p>
              ) : (
                <div className="space-y-2.5">
                  {results.hospitals.map((hosp) => (
                    <Link
                      key={hosp.id}
                      href={`/app/hospitals/${hosp.id}`}
                      className="block p-3 rounded-lg bg-slate-950/60 hover:bg-slate-800 border border-slate-800 transition group"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-xs text-slate-200 group-hover:text-white">
                          {hosp.name}
                        </span>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-sky-400 transition" />
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-[11px] font-mono text-slate-500">
                        <span>{hosp.id}</span>
                        <span>•</span>
                        <span>{hosp.latitude.toFixed(3)}, {hosp.longitude.toFixed(3)}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Reservations Column */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <div className="flex items-center gap-2 text-xs font-semibold text-white">
                  <ShieldAlert className="w-4 h-4 text-amber-400" />
                  <span>Reservations ({results.reservations.length})</span>
                </div>
              </div>

              {results.reservations.length === 0 ? (
                <p className="text-xs text-slate-500 py-4 text-center">No matching reservations</p>
              ) : (
                <div className="space-y-2.5">
                  {results.reservations.map((res) => (
                    <Link
                      key={res.id}
                      href={`/app/reservations`}
                      className="block p-3 rounded-lg bg-slate-950/60 hover:bg-slate-800 border border-slate-800 transition group"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs text-amber-300">
                          {res.id}
                        </span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                          {res.state}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-1">
                        {res.resource_type} @ {res.hospital_id}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Operational Playbooks Column */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <div className="flex items-center gap-2 text-xs font-semibold text-white">
                  <BookOpen className="w-4 h-4 text-purple-400" />
                  <span>Protocols & Playbooks ({results.playbooks.length})</span>
                </div>
              </div>

              {results.playbooks.length === 0 ? (
                <p className="text-xs text-slate-500 py-4 text-center">No matching protocols</p>
              ) : (
                <div className="space-y-2.5">
                  {results.playbooks.map((pbk) => (
                    <Link
                      key={pbk.id}
                      href={`/app/help`}
                      className="block p-3 rounded-lg bg-slate-950/60 hover:bg-slate-800 border border-slate-800 transition group"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-xs text-purple-300 group-hover:text-purple-200">
                          {pbk.title}
                        </span>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-purple-400 transition" />
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                        {pbk.content}
                      </p>
                      <div className="mt-1 text-[10px] font-mono text-slate-500 uppercase">
                        {pbk.category}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
