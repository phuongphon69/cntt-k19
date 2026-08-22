// components/search-modal.tsx
"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, User, BookOpen, X, ArrowRight } from "lucide-react";
import { normalizeVietnameseNameWithoutAccent } from "@/lib/vietnamese/normalize";
import { PublicStudent, Subject } from "@/types";

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  students?: PublicStudent[];
  subjects?: Subject[];
}

export function SearchModal({ isOpen, onClose, students = [], subjects = [] }: SearchModalProps) {
  const [query, setQuery] = useState("");
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery("");
    }
  }, [isOpen]);

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (isOpen) onClose();
      }
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const cleanQ = normalizeVietnameseNameWithoutAccent(query);

  const filteredStudents = cleanQ
    ? students.filter((s) => normalizeVietnameseNameWithoutAccent(s.fullName).includes(cleanQ)).slice(0, 6)
    : [];

  const filteredSubjects = cleanQ
    ? subjects.filter((s) => normalizeVietnameseNameWithoutAccent(s.name).includes(cleanQ)).slice(0, 4)
    : [];

  const handleSelectStudent = (id: string) => {
    onClose();
    router.push(`/students/${id}`);
  };

  const handleSelectSubject = (id: string) => {
    onClose();
    router.push(`/subjects/${id}`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <Search className="w-5 h-5 text-slate-400" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm kiếm học viên, môn học (hỗ trợ tiếng Việt không dấu)..."
            className="w-full text-base bg-transparent border-none outline-none text-slate-900 dark:text-white placeholder-slate-400"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onClose}
            className="px-2 py-1 text-xs font-semibold text-slate-400 bg-slate-200 dark:bg-slate-800 rounded-md"
          >
            ESC
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-96 overflow-y-auto p-3 space-y-4">
          {!query && (
            <div className="p-6 text-center text-slate-400 text-sm">
              Nhập tên học viên hoặc tên môn học để tìm kiếm nhanh...
            </div>
          )}

          {query && filteredStudents.length === 0 && filteredSubjects.length === 0 && (
            <div className="p-6 text-center text-slate-400 text-sm">
              Không tìm thấy kết quả phù hợp với &quot;{query}&quot;
            </div>
          )}

          {filteredSubjects.length > 0 && (
            <div>
              <div className="px-3 py-1 text-xs font-bold uppercase tracking-wider text-slate-400">
                Môn học
              </div>
              <div className="mt-1 space-y-1">
                {filteredSubjects.map((sub) => (
                  <button
                    key={sub.id}
                    onClick={() => handleSelectSubject(sub.id)}
                    className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-left transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400">
                        <BookOpen className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                          {sub.name}
                        </div>
                        <div className="text-xs text-slate-500">GV: {sub.teacher}</div>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-all" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {filteredStudents.length > 0 && (
            <div>
              <div className="px-3 py-1 text-xs font-bold uppercase tracking-wider text-slate-400">
                Học viên
              </div>
              <div className="mt-1 space-y-1">
                {filteredStudents.map((stu) => (
                  <button
                    key={stu.id}
                    onClick={() => handleSelectStudent(stu.id)}
                    className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-left transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400">
                        <User className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                          {stu.fullName}
                        </div>
                        <div className="text-xs text-slate-500">
                          {stu.dateOfBirth ? `NS: ${stu.dateOfBirth}` : ""} {stu.studySystem ? `• Hệ ${stu.studySystem}` : ""}
                        </div>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-all" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
