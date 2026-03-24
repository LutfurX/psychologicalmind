/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Brain, 
  ChevronRight, 
  ArrowLeft, 
  Loader2, 
  CheckCircle2, 
  AlertTriangle, 
  Info, 
  RefreshCcw,
  Sparkles,
  ShieldCheck,
  Cloud,
  Zap,
  User,
  RotateCw,
  Shield,
  Users,
  Briefcase,
  Heart
} from "lucide-react";
import { Category, Question, UserResponse, AssessmentResult } from "./types";
import { 
  generateInitialQuestions, 
  generateFollowUpQuestions, 
  generateFinalReport 
} from "./services/geminiService";

const CATEGORIES: Category[] = [
  { id: "anxiety", name: "উদ্বেগ", description: "আপনার দুশ্চিন্তা ও অস্থিরতার মাত্রা মূল্যায়ন করুন।", icon: "Brain" },
  { id: "depression", name: "বিষণ্নতা", description: "আপনার মন খারাপ বা বিষণ্ণতার লক্ষণগুলো বুঝুন।", icon: "Cloud" },
  { id: "stress", name: "মানসিক চাপ", description: "দৈনন্দিন জীবনের চাপের প্রভাব পরীক্ষা করুন।", icon: "Zap" },
  { id: "personality", name: "ব্যক্তিত্ব বিশ্লেষণ", description: "আপনার ব্যক্তিত্বের ধরণ ও বৈশিষ্ট্য জানুন।", icon: "User" },
  { id: "overthinking", name: "অতিরিক্ত চিন্তা", description: "অপ্রয়োজনীয় চিন্তা আপনার জীবনকে কতটা প্রভাবিত করছে?", icon: "RotateCw" },
  { id: "confidence", name: "আত্মবিশ্বাস", description: "নিজের প্রতি আপনার বিশ্বাস ও আস্থার মূল্যায়ন।", icon: "Shield" },
  { id: "social", name: "সামাজিক আচরণ", description: "অন্যদের সাথে আপনার মেলামেশার ধরণ বুঝুন।", icon: "Users" },
  { id: "productivity", name: "কাজের চাপ ও উৎপাদনশীলতা", description: "কর্মক্ষেত্রে আপনার মানসিক অবস্থা ও দক্ষতা।", icon: "Briefcase" },
  { id: "love", name: "প্রেম/ভালোবাসা কারো প্রতি কতটুকু", description: "কারো প্রতি আপনার অনুভূতির গভীরতা ও টান মূল্যায়ন করুন।", icon: "Heart" },
];

type Screen = "home" | "loading" | "quiz" | "follow-up" | "report";

export default function App() {
  const [screen, setScreen] = useState<Screen>("home");
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [responses, setResponses] = useState<UserResponse[]>([]);
  const [report, setReport] = useState<AssessmentResult | null>(null);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [isFollowUp, setIsFollowUp] = useState(false);

  const startAssessment = async (category: Category) => {
    setSelectedCategory(category);
    setScreen("loading");
    setLoadingMessage("আপনার জন্য প্রশ্নগুলো তৈরি করা হচ্ছে...");
    try {
      const initialQuestions = await generateInitialQuestions(category.name);
      setQuestions(initialQuestions);
      setScreen("quiz");
    } catch (error) {
      console.error("Error starting assessment:", error);
      setScreen("home");
    }
  };

  const handleAnswer = (score: number) => {
    const newResponses = [
      ...responses,
      { questionId: questions[currentQuestionIndex].id, score }
    ];
    setResponses(newResponses);

    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else if (!isFollowUp) {
      handleInitialComplete(newResponses);
    } else {
      handleFinalComplete(newResponses);
    }
  };

  const handleInitialComplete = async (currentResponses: UserResponse[]) => {
    setScreen("loading");
    setLoadingMessage("আপনার উত্তরগুলো বিশ্লেষণ করা হচ্ছে এবং ফলো-আপ প্রশ্ন তৈরি করা হচ্ছে...");
    try {
      const followUp = await generateFollowUpQuestions(
        selectedCategory!.name,
        currentResponses,
        questions
      );
      setQuestions(followUp);
      setCurrentQuestionIndex(0);
      setIsFollowUp(true);
      setScreen("quiz");
    } catch (error) {
      console.error("Error generating follow-up:", error);
      handleFinalComplete(currentResponses);
    }
  };

  const handleFinalComplete = async (currentResponses: UserResponse[]) => {
    setScreen("loading");
    setLoadingMessage("আপনার চূড়ান্ত রিপোর্ট তৈরি করা হচ্ছে...");
    try {
      const finalReport = await generateFinalReport(
        selectedCategory!.name,
        currentResponses,
        questions
      );
      setReport(finalReport);
      setScreen("report");
    } catch (error) {
      console.error("Error generating report:", error);
      setScreen("home");
    }
  };

  const reset = () => {
    setScreen("home");
    setSelectedCategory(null);
    setQuestions([]);
    setCurrentQuestionIndex(0);
    setResponses([]);
    setReport(null);
    setIsFollowUp(false);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#1E293B] font-sans selection:bg-indigo-100">
      <header className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-md border-b border-slate-200 z-50">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={reset}>
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200">
              <Brain className="text-white w-6 h-6" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-800">মনোবীক্ষণ</h1>
          </div>
          {screen !== "home" && (
            <button 
              onClick={reset}
              className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500"
            >
              <RefreshCcw className="w-5 h-5" />
            </button>
          )}
        </div>
      </header>

      <main className="pt-24 pb-12 px-4 max-w-5xl mx-auto">
        <AnimatePresence mode="wait">
          {screen === "home" && (
            <motion.div
              key="home"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <div className="text-center space-y-4 max-w-2xl mx-auto">
                <motion.div 
                  initial={{ scale: 0.9 }}
                  animate={{ scale: 1 }}
                  className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 text-indigo-600 text-sm font-medium"
                >
                  <Sparkles className="w-4 h-4" />
                  এআই চালিত মানসিক মূল্যায়ন
                </motion.div>
                <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900 leading-tight">
                  আপনার মানসিক স্বাস্থ্য <br />
                  <span className="text-indigo-600">গভীরভাবে বুঝুন</span>
                </h2>
                <p className="text-slate-600 text-lg">
                  একটি ক্যাটাগরি বেছে নিন এবং আমাদের এআই-এর মাধ্যমে আপনার মানসিক অবস্থার একটি বিস্তারিত বিশ্লেষণ পান।
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {CATEGORIES.map((cat) => (
                  <motion.button
                    key={cat.id}
                    whileHover={{ y: -4, scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => startAssessment(cat)}
                    className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl hover:border-indigo-200 transition-all text-left group"
                  >
                    <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center mb-4 group-hover:bg-indigo-50 transition-colors">
                      <Brain className="w-6 h-6 text-slate-600 group-hover:text-indigo-600" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 mb-2">{cat.name}</h3>
                    <p className="text-slate-500 text-sm leading-relaxed">{cat.description}</p>
                    <div className="mt-4 flex items-center text-indigo-600 font-semibold text-sm opacity-0 group-hover:opacity-100 transition-opacity">
                      শুরু করুন <ChevronRight className="w-4 h-4 ml-1" />
                    </div>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          {screen === "loading" && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6"
            >
              <div className="relative">
                <Loader2 className="w-16 h-16 text-indigo-600 animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Brain className="w-6 h-6 text-indigo-600/50" />
                </div>
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-bold text-slate-800">অনুগ্রহ করে অপেক্ষা করুন</h3>
                <p className="text-slate-500 max-w-sm mx-auto">{loadingMessage}</p>
              </div>
            </motion.div>
          )}

          {screen === "quiz" && questions.length > 0 && (
            <motion.div
              key="quiz"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="max-w-2xl mx-auto space-y-8"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => {
                      if (currentQuestionIndex > 0) {
                        setCurrentQuestionIndex(currentQuestionIndex - 1);
                        setResponses(responses.slice(0, -1));
                      } else {
                        reset();
                      }
                    }}
                    className="flex items-center gap-1 text-slate-500 hover:text-indigo-600 transition-colors font-medium text-sm"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    পেছনে যান
                  </button>
                  <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
                    <span className="bg-slate-100 px-3 py-1 rounded-full">
                      {isFollowUp ? "ফলো-আপ ধাপ" : "প্রাথমিক ধাপ"}
                    </span>
                    <span>প্রশ্ন {currentQuestionIndex + 1} / {questions.length}</span>
                  </div>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
                    className="h-full bg-indigo-600 rounded-full"
                  />
                </div>
              </div>

              <div className="space-y-6">
                <h3 className="text-2xl md:text-3xl font-bold text-slate-900 leading-tight">
                  {questions[currentQuestionIndex].text}
                </h3>
                <div className="grid gap-3">
                  {questions[currentQuestionIndex].options.map((opt, idx) => (
                    <motion.button
                      key={idx}
                      whileHover={{ x: 8 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={() => handleAnswer(opt.score)}
                      className="p-5 bg-white border border-slate-200 rounded-2xl text-left hover:border-indigo-600 hover:bg-indigo-50/50 transition-all group flex items-center justify-between"
                    >
                      <span className="text-lg font-medium text-slate-700 group-hover:text-indigo-700">
                        {opt.text}
                      </span>
                      <div className="w-6 h-6 rounded-full border-2 border-slate-200 group-hover:border-indigo-600 flex items-center justify-center transition-colors">
                        <div className="w-3 h-3 rounded-full bg-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </motion.button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {screen === "report" && report && (
            <motion.div
              key="report"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="max-w-3xl mx-auto space-y-8"
            >
              <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xl">
                <div className="bg-indigo-600 p-8 text-white text-center space-y-4">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 text-white text-sm font-medium backdrop-blur-sm">
                    <CheckCircle2 className="w-4 h-4" />
                    মূল্যায়ন সম্পন্ন হয়েছে
                  </div>
                  <h2 className="text-3xl font-bold">আপনার মানসিক স্বাস্থ্য রিপোর্ট</h2>
                  <div className="flex justify-center items-baseline gap-2">
                    <span className="text-6xl font-black">{report.score}</span>
                    <span className="text-xl opacity-80">/ ১০০</span>
                  </div>
                  <div className={`inline-block px-6 py-2 rounded-full font-bold text-lg ${
                    report.level === "কম" ? "bg-emerald-500" : 
                    report.level === "মাঝারি" ? "bg-amber-500" : "bg-rose-500"
                  }`}>
                    অবস্থা: {report.level}
                  </div>
                </div>

                <div className="p-8 space-y-8">
                  <section className="space-y-3">
                    <div className="flex items-center gap-2 text-indigo-600 font-bold">
                      <Info className="w-5 h-5" />
                      সংক্ষিপ্ত বিশ্লেষণ
                    </div>
                    <p className="text-slate-600 leading-relaxed text-lg italic">
                      "{report.summary}"
                    </p>
                  </section>

                  <div className="grid md:grid-cols-2 gap-6">
                    <section className="p-6 bg-slate-50 rounded-2xl space-y-3">
                      <div className="flex items-center gap-2 text-slate-800 font-bold">
                        <Brain className="w-5 h-5 text-indigo-600" />
                        মানসিক অবস্থা
                      </div>
                      <p className="text-slate-600 text-sm leading-relaxed">
                        {report.mentalCondition}
                      </p>
                    </section>
                    <section className="p-6 bg-slate-50 rounded-2xl space-y-3">
                      <div className="flex items-center gap-2 text-slate-800 font-bold">
                        <Sparkles className="w-5 h-5 text-indigo-600" />
                        আচরণগত বিশ্লেষণ
                      </div>
                      <p className="text-slate-600 text-sm leading-relaxed">
                        {report.behavioralInsights}
                      </p>
                    </section>
                  </div>

                  <section className="p-6 bg-rose-50 border border-rose-100 rounded-2xl space-y-3">
                    <div className="flex items-center gap-2 text-rose-700 font-bold">
                      <AlertTriangle className="w-5 h-5" />
                      সম্ভাব্য সমস্যা
                    </div>
                    <p className="text-rose-800 text-sm leading-relaxed">
                      {report.potentialConcerns}
                    </p>
                  </section>

                  <section className="space-y-4">
                    <div className="flex items-center gap-2 text-slate-800 font-bold">
                      <ShieldCheck className="w-5 h-5 text-indigo-600" />
                      করণীয় বা পরামর্শ
                    </div>
                    <ul className="grid gap-3">
                      {report.recommendations.map((rec, i) => (
                        <li key={i} className="flex items-start gap-3 p-4 bg-white border border-slate-100 rounded-xl shadow-sm">
                          <div className="w-6 h-6 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold">
                            {i + 1}
                          </div>
                          <span className="text-slate-700 text-sm">{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </section>

                  <div className="pt-8 border-t border-slate-100 text-center">
                    <button
                      onClick={reset}
                      className="inline-flex items-center gap-2 px-8 py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
                    >
                      <ArrowLeft className="w-5 h-5" />
                      আবার শুরু করুন
                    </button>
                    <p className="mt-6 text-xs text-slate-400 max-w-md mx-auto">
                      এটি কোনো চিকিৎসা নির্ণয় নয়, শুধুমাত্র একটি সাধারণ মানসিক মূল্যায়ন। আপনার যদি গুরুতর সমস্যা থাকে, তবে একজন বিশেষজ্ঞের পরামর্শ নিন।
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="py-8 text-center text-slate-400 text-sm">
        <p>© ২০২৬ মনোবীক্ষণ - এআই মানসিক স্বাস্থ্য মূল্যায়ন</p>
      </footer>
    </div>
  );
}
