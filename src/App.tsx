/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { 
  motion, AnimatePresence } from "motion/react";
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
  Heart,
  LayoutDashboard,
  PlayCircle,
  BookOpen,
  Settings,
  Bell,
  Search,
  Menu,
  X,
  Clock,
  Award,
  LogOut,
  Moon,
  Sun,
  Activity
} from "lucide-react";
import { Category, Question, UserResponse, AssessmentResult } from "./types";
import { 
  generateInitialQuestions, 
  generateFollowUpQuestions, 
  generateFinalReport,
  generateCombinedReport
} from "./services/geminiService";

const ICON_MAP: Record<string, React.ElementType> = {
  Brain,
  Cloud,
  Zap,
  User,
  RotateCw,
  Shield,
  Users,
  Briefcase,
  Heart,
  Activity
};
import { auth, db, OperationType, handleFirestoreError, signInWithGoogle, logout } from './lib/firebase';
import { updateProfile } from 'firebase/auth';
import { collection, addDoc, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import { Toaster, toast } from 'sonner';
import Auth from './components/Auth';
import Dashboard from './components/Dashboard';

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
  { id: "emotion", name: "আবেগ নিয়ন্ত্রণ", description: "আপনার আবেগ ও অনুভূতি নিয়ন্ত্রণের ক্ষমতা যাচাই করুন।", icon: "Activity" },
];

const BUNDLED_CATEGORIES = [
  "উদ্বেগ",
  "মানসিক চাপ",
  "অতিরিক্ত চিন্তা",
  "আত্মবিশ্বাস",
  "আবেগ নিয়ন্ত্রণ"
];

type Screen = "home" | "loading" | "quiz" | "follow-up" | "report";

export default function App() {
  const [user, authLoading] = useAuthState(auth);
  const [screen, setScreen] = useState<Screen>("home");
  const [activeTab, setActiveTab] = useState<'dashboard' | 'assessment' | 'courses' | 'settings' | 'upgrade'>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [responses, setResponses] = useState<UserResponse[]>([]);
  const [report, setReport] = useState<AssessmentResult | null>(null);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [isFollowUp, setIsFollowUp] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark' || saved === 'light') return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });
  const [profileForm, setProfileForm] = useState({
    displayName: "",
    phoneNumber: "",
    dateOfBirth: "",
    address: ""
  });
  
  const [isBundledTest, setIsBundledTest] = useState(false);
  const [bundledTestIndex, setBundledTestIndex] = useState(0);
  const [bundledData, setBundledData] = useState<{category: string, responses: UserResponse[], questions: Question[]}[]>([]);
  
  const mainRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (mainRef.current) {
      mainRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [activeTab, screen]);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    if (user) {
      const fetchProfile = async () => {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            setProfileForm({
              displayName: data.displayName || user.displayName || "",
              phoneNumber: data.phoneNumber || "",
              dateOfBirth: data.dateOfBirth || "",
              address: data.address || ""
            });
          } else {
            // Create initial user document if it doesn't exist
            const initialData = {
              uid: user.uid,
              displayName: user.displayName || "",
              email: user.email || "",
              photoURL: user.photoURL || "",
              createdAt: new Date().toISOString()
            };
            await setDoc(doc(db, 'users', user.uid), initialData);
            setProfileForm({
              displayName: user.displayName || "",
              phoneNumber: "",
              dateOfBirth: "",
              address: ""
            });
          }
        } catch (error) {
          console.error("Error fetching profile:", error);
        }
      };
      fetchProfile();
    }
  }, [user]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      // Update Firestore document
      await setDoc(doc(db, 'users', user.uid), {
        ...profileForm,
        uid: user.uid,
        email: user.email,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      // Update Firebase Auth profile (for header sync)
      if (user.displayName !== profileForm.displayName) {
        await updateProfile(user, {
          displayName: profileForm.displayName
        });
      }

      toast.success("প্রোফাইল সফলভাবে আপডেট করা হয়েছে!");
      setIsEditingProfile(false);
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("প্রোফাইল আপডেট করতে সমস্যা হয়েছে।");
    }
  };

  const startBundledTest = async () => {
    setIsBundledTest(true);
    setBundledTestIndex(0);
    setBundledData([]);
    setResponses([]);
    setCurrentQuestionIndex(0);
    setIsFollowUp(false);
    
    const firstCatName = BUNDLED_CATEGORIES[0];
    const firstCat = CATEGORIES.find(c => c.name === firstCatName)!;
    
    setSelectedCategory(firstCat);
    setScreen("loading");
    setLoadingMessage(`ধাপ ১/৫: ${firstCatName} এর জন্য প্রশ্ন তৈরি করা হচ্ছে...`);
    setStartTime(Date.now());
    try {
      const initialQuestions = await generateInitialQuestions(firstCat.name);
      setQuestions(initialQuestions);
      setScreen("quiz");
    } catch (error) {
      console.error("Error starting bundled test:", error);
      setScreen("home");
      setIsBundledTest(false);
    }
  };

  const startAssessment = async (category: Category) => {
    setIsBundledTest(false);
    setSelectedCategory(category);
    setResponses([]);
    setCurrentQuestionIndex(0);
    setIsFollowUp(false);
    setScreen("loading");
    setLoadingMessage("আপনার জন্য প্রশ্নগুলো তৈরি করা হচ্ছে...");
    setStartTime(Date.now());
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
    if (isBundledTest) {
      const newBundledData = [
        ...bundledData,
        {
          category: selectedCategory!.name,
          responses: currentResponses,
          questions: questions
        }
      ];
      setBundledData(newBundledData);

      if (bundledTestIndex < 4) {
        const nextIndex = bundledTestIndex + 1;
        setBundledTestIndex(nextIndex);
        const nextCategoryName = BUNDLED_CATEGORIES[nextIndex];
        const nextCategory = CATEGORIES.find(c => c.name === nextCategoryName)!;
        
        setSelectedCategory(nextCategory);
        setResponses([]);
        setCurrentQuestionIndex(0);
        setIsFollowUp(false);
        setScreen("loading");
        setLoadingMessage(`ধাপ ${nextIndex + 1}/৫: ${nextCategoryName} এর জন্য প্রশ্ন তৈরি করা হচ্ছে...`);
        
        try {
          const initialQuestions = await generateInitialQuestions(nextCategoryName);
          setQuestions(initialQuestions);
          setScreen("quiz");
        } catch (error) {
          console.error("Error starting next bundled test:", error);
          setScreen("home");
          setIsBundledTest(false);
        }
        return;
      } else {
        setScreen("loading");
        setLoadingMessage("আপনার সম্পূর্ণ মানসিক বিশ্লেষণ রিপোর্ট তৈরি করা হচ্ছে...");
        try {
          const finalReport = await generateCombinedReport(newBundledData);
          setReport(finalReport);
          setScreen("report");
          setIsBundledTest(false);
          
          if (user) {
            const timeSpent = startTime ? Math.round((Date.now() - startTime) / 1000) : 300;
            await addDoc(collection(db, 'test_results'), {
              userId: user.uid,
              category: "সম্পূর্ণ মানসিক বিশ্লেষণ",
              score: finalReport.score,
              totalQuestions: newBundledData.reduce((acc, curr) => acc + curr.questions.length, 0),
              correctAnswers: Math.round((finalReport.score / 100) * newBundledData.reduce((acc, curr) => acc + curr.questions.length, 0)),
              timeSpent,
              suggestedTests: finalReport.suggestedTests || [],
              completedAt: new Date().toISOString()
            });
          }
        } catch (error) {
          console.error("Error generating combined report:", error);
          setScreen("home");
          setIsBundledTest(false);
        }
        return;
      }
    }

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

      // Save to Firestore if user is logged in
      if (user) {
        const totalQuestions = questions.length;
        const score = finalReport.score;
        const correctAnswers = Math.round((score / 100) * totalQuestions);
        const timeSpent = startTime ? Math.round((Date.now() - startTime) / 1000) : 300;

        await addDoc(collection(db, 'test_results'), {
          userId: user.uid,
          category: selectedCategory!.name,
          score,
          totalQuestions,
          correctAnswers,
          timeSpent,
          suggestedTests: finalReport.suggestedTests || [],
          completedAt: new Date().toISOString()
        });
      }
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

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Brain size={48} className="text-indigo-600 animate-pulse" />
          <p className="text-sm font-medium text-muted-foreground">লোড হচ্ছে...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex text-foreground font-sans">
      {/* Sidebar */}
      <AnimatePresence mode="wait">
        {isSidebarOpen && (
          <motion.aside 
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            exit={{ x: -280 }}
            className="fixed lg:relative z-50 w-[280px] h-screen bg-card border-r border-border flex flex-col p-6 gap-8 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 cursor-pointer" onClick={() => { setActiveTab('dashboard'); reset(); }}>
                <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
                  <Brain size={24} />
                </div>
                <span className="text-xl font-bold tracking-tight">মনোবীক্ষণ</span>
              </div>
              <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden p-2 hover:bg-muted rounded-full">
                <X size={20} />
              </button>
            </div>

            <nav className="flex-1 flex flex-col gap-2">
              <button 
                onClick={() => { setActiveTab('dashboard'); reset(); setIsSidebarOpen(false); }}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'dashboard' ? 'bg-indigo-600 text-white font-semibold shadow-lg shadow-indigo-200' : 'hover:bg-muted text-muted-foreground'}`}
              >
                <LayoutDashboard size={20} /> ড্যাশবোর্ড
              </button>
              <button 
                onClick={() => { setActiveTab('assessment'); reset(); setIsSidebarOpen(false); }}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'assessment' ? 'bg-indigo-600 text-white font-semibold shadow-lg shadow-indigo-200' : 'hover:bg-muted text-muted-foreground'}`}
              >
                <PlayCircle size={20} /> মূল্যায়ন শুরু করুন
              </button>
              <button 
                onClick={() => { setActiveTab('courses'); reset(); setIsSidebarOpen(false); }}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'courses' ? 'bg-indigo-600 text-white font-semibold shadow-lg shadow-indigo-200' : 'hover:bg-muted text-muted-foreground'}`}
              >
                <BookOpen size={20} /> আমার কোর্স
              </button>
              <button 
                onClick={() => { setActiveTab('settings'); reset(); setIsSidebarOpen(false); }}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'settings' ? 'bg-indigo-600 text-white font-semibold shadow-lg shadow-indigo-200' : 'hover:bg-muted text-muted-foreground'}`}
              >
                <Settings size={20} /> সেটিংস
              </button>
            </nav>

            <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100 flex flex-col gap-3">
              <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs uppercase tracking-widest">
                <Sparkles size={14} /> প্রো ফিচার
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                উন্নত এআই বিশ্লেষণ এবং ব্যক্তিগতকৃত লার্নিং পাথ আনলক করুন।
              </p>
              <button 
                onClick={() => { setActiveTab('upgrade'); reset(); setIsSidebarOpen(false); }}
                className="w-full py-2 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 transition-colors"
              >
                আপগ্রেড করুন
              </button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main ref={mainRef} className="flex-1 h-screen overflow-y-auto scrollbar-hide flex flex-col">
        {/* Top Bar */}
        <header className="sticky top-0 z-40 bg-card/80 backdrop-blur-md border-b border-border px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {!isSidebarOpen && (
              <button onClick={() => setIsSidebarOpen(true)} className="p-2 hover:bg-muted rounded-full">
                <Menu size={20} />
              </button>
            )}
            <div className="hidden md:flex items-center gap-2 bg-muted/50 px-4 py-2 rounded-full border border-border/50 w-[300px]">
              <Search size={16} className="text-muted-foreground" />
              <input 
                type="text" 
                placeholder="সার্চ করুন..." 
                className="bg-transparent border-none outline-none text-sm w-full"
              />
            </div>
          </div>

          <div className="flex items-center gap-6">
            <button className="relative p-2 hover:bg-muted rounded-full text-muted-foreground transition-colors">
              <Bell size={20} />
              <span className="absolute top-1 right-1 w-2 h-2 bg-rose-500 rounded-full border-2 border-white"></span>
            </button>
            <Auth onProfileClick={() => {
              setActiveTab('settings');
              setIsEditingProfile(false);
              setIsSidebarOpen(false);
            }} />
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1">
          <AnimatePresence mode="wait">
            {activeTab === 'dashboard' ? (
              user ? (
                <motion.div
                  key="dashboard"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                >
                  <div className="px-8 pt-8 flex items-center justify-between">
                    <div>
                      <h1 className="text-3xl font-bold tracking-tight">স্বাগতম, {user.displayName?.split(' ')[0]}! 👋</h1>
                      <p className="text-muted-foreground mt-1">আপনার আজকের মানসিক স্বাস্থ্য ও প্রগতি দেখুন।</p>
                    </div>
                    <button 
                      onClick={() => setActiveTab('assessment')}
                      className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl font-bold hover:shadow-xl hover:shadow-indigo-200 transition-all active:scale-95"
                    >
                      <PlayCircle size={20} /> নতুন মূল্যায়ন শুরু করুন
                    </button>
                  </div>
                  <Dashboard />
                </motion.div>
              ) : (
                <div className="flex flex-col min-h-full">
                  <div className="flex flex-col items-center justify-center flex-1 max-w-2xl mx-auto text-center gap-8 px-4 py-16">
                    <div className="w-24 h-24 bg-indigo-50 rounded-[2rem] flex items-center justify-center text-indigo-600 shadow-inner">
                      <LayoutDashboard size={48} />
                    </div>
                    <div className="space-y-4">
                      <h2 className="text-4xl font-extrabold tracking-tight text-foreground">ড্যাশবোর্ড দেখতে লগইন করুন</h2>
                      <p className="text-lg text-muted-foreground leading-relaxed">
                        আপনার প্রগতি ট্র্যাক করতে এবং এআই পরামর্শ পেতে লগইন করা প্রয়োজন। তবে আপনি চাইলে লগইন ছাড়াই মূল্যায়ন শুরু করতে পারেন।
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <Auth />
                      <button 
                        onClick={() => setActiveTab('assessment')}
                        className="px-6 py-2 border border-border rounded-full text-sm font-medium hover:bg-muted transition-colors"
                      >
                        গেস্ট হিসেবে চেষ্টা করুন
                      </button>
                    </div>
                  </div>

                  {/* Founder Section */}
                  <div className="px-4 md:px-8 pb-12">
                    <div className="bg-card rounded-3xl p-8 md:p-12 border border-border shadow-sm max-w-5xl mx-auto">
                      <div className="text-center mb-10">
                        <h3 className="text-2xl font-extrabold tracking-widest text-indigo-600 uppercase mb-2">FOUNDER</h3>
                      </div>

                      <div className="flex flex-col md:flex-row gap-10 items-center md:items-start max-w-4xl mx-auto">
                        <div className="w-48 h-48 md:w-64 md:h-64 flex-shrink-0 rounded-full overflow-hidden border-4 border-indigo-50 shadow-xl">
                          <img 
                            src="https://i.ibb.co.com/bR3ZQ05n/founder-lutfur.jpg" 
                            alt="Lutfur Rahman" 
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                        <div className="text-center mt-6">
                          <h2 className="text-3xl md:text-4xl font-extrabold text-foreground">Lutfur Rahman</h2>
                          <p className="text-lg text-muted-foreground mt-2 font-medium">AI Prompt Engineer & Web Developer</p>
                        </div>
                        
                        <div className="flex-1 space-y-6 text-left">
                          <div className="prose prose-indigo dark:prose-invert max-w-none">
                            <p className="text-lg leading-relaxed text-muted-foreground">
                              লুৎফুর রহমান দীর্ঘ ৮ বছর ধরে <strong>WordPress Developer</strong> হিসেবে কাজ করছেন এবং গত ২ বছর ধরে AI ফিল্ডে <strong>AI Prompt Engineer</strong> হিসেবে নিজের দক্ষতা প্রমাণ করেছেন। প্রযুক্তি ও মানুষের মানসিক স্বাস্থ্যের মধ্যে একটি সেতুবন্ধন তৈরি করার উদ্দেশ্যেই তিনি এই প্ল্যাটফর্মটি তৈরি করেছেন। তার লক্ষ্য হলো AI-এর শক্তিকে কাজে লাগিয়ে মানুষের মানসিক সুস্থতার জন্য একটি সহজ ও কার্যকরী সমাধান প্রদান করা।
                            </p>
                          </div>

                          <div className="space-y-3">
                            <h4 className="font-bold text-foreground text-lg">দক্ষতা ও অভিজ্ঞতা (Expertise):</h4>
                            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {[
                                "AI Prompt Engineering",
                                "WordPress Development",
                                "Web Application Design",
                                "User Experience Optimization"
                              ].map((skill, i) => (
                                <li key={i} className="flex items-center gap-2 text-muted-foreground">
                                  <CheckCircle2 size={16} className="text-indigo-600 flex-shrink-0" />
                                  <span className="font-medium">{skill}</span>
                                </li>
                              ))}
                            </ul>
                          </div>

                          <div className="bg-indigo-50 dark:bg-indigo-950/30 p-6 rounded-2xl border-l-4 border-indigo-600 italic mt-6">
                            <p className="text-indigo-900 dark:text-indigo-200 font-medium text-lg leading-relaxed">
                              "প্রযুক্তি যখন মানুষের কল্যাণে ব্যবহৃত হয়, তখনই তা সবচেয়ে বেশি সার্থক। আমার লক্ষ্য হলো AI-কে কাজে লাগিয়ে মানুষের মানসিক সুস্থতার পথকে আরও সহজ করা।"
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            ) : activeTab === 'courses' ? (
              <motion.div 
                key="courses"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-8 space-y-8"
              >
                <div className="max-w-4xl mx-auto">
                  <h2 className="text-3xl font-bold mb-2">আমার কোর্স</h2>
                  <p className="text-muted-foreground mb-8">আপনার মানসিক স্বাস্থ্যের উন্নতির জন্য বিশেষায়িত কোর্সসমূহ।</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {[
                      { title: "উদ্বেগ নিয়ন্ত্রণ", duration: "৪ সপ্তাহ", level: "প্রাথমিক", icon: Brain },
                      { title: "আত্মবিশ্বাস বৃদ্ধি", duration: "৬ সপ্তাহ", level: "মাঝারি", icon: Shield },
                      { title: "অতিরিক্ত চিন্তা কমানোর উপায়", duration: "৩ সপ্তাহ", level: "প্রাথমিক", icon: RotateCw },
                      { title: "পজিটিভ মাইন্ডসেট", duration: "৫ সপ্তাহ", level: "উন্নত", icon: Sparkles }
                    ].map((course, i) => (
                      <div key={i} className="bg-card p-6 rounded-2xl border border-border hover:shadow-lg transition-all group">
                        <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 mb-4 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                          <course.icon size={24} />
                        </div>
                        <h3 className="text-xl font-bold mb-2">{course.title}</h3>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1"><Clock size={14} /> {course.duration}</span>
                          <span className="flex items-center gap-1"><Award size={14} /> {course.level}</span>
                        </div>
                        <button 
                          onClick={async () => {
                            if (!user) {
                              try {
                                await signInWithGoogle();
                              } catch (e) {
                                // Error is already logged in firebase.ts
                              }
                            } else {
                              toast.success("আপনি সফলভাবে এনরোল করেছেন!");
                            }
                          }}
                          className="mt-6 w-full py-2 border border-indigo-600 text-indigo-600 rounded-xl font-bold hover:bg-indigo-600 hover:text-white transition-all"
                        >
                          {user ? "এনরোল করা হয়েছে" : "এনরোল করুন"}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            ) : activeTab === 'settings' ? (
              <motion.div 
                key="settings"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-8"
              >
                <div className="max-w-2xl mx-auto bg-card p-8 rounded-3xl border border-border shadow-sm">
                  <div className="flex items-center justify-between mb-8">
                    <h2 className="text-3xl font-bold">সেটিংস</h2>
                    {isEditingProfile && (
                      <button 
                        onClick={() => setIsEditingProfile(false)}
                        className="text-sm text-indigo-600 font-medium hover:underline"
                      >
                        ফিরে যান
                      </button>
                    )}
                  </div>
                  
                  {isEditingProfile ? (
                    <form onSubmit={handleUpdateProfile} className="space-y-6">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">নাম</label>
                        <input 
                          type="text"
                          value={profileForm.displayName}
                          onChange={(e) => setProfileForm({...profileForm, displayName: e.target.value})}
                          className="w-full p-3 rounded-xl border border-border focus:ring-2 focus:ring-indigo-500 outline-none"
                          placeholder="আপনার নাম লিখুন"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">মোবাইল নম্বর</label>
                        <input 
                          type="tel"
                          value={profileForm.phoneNumber}
                          onChange={(e) => setProfileForm({...profileForm, phoneNumber: e.target.value})}
                          className="w-full p-3 rounded-xl border border-border focus:ring-2 focus:ring-indigo-500 outline-none"
                          placeholder="আপনার মোবাইল নম্বর লিখুন"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">জন্ম তারিখ</label>
                        <input 
                          type="date"
                          value={profileForm.dateOfBirth}
                          onChange={(e) => setProfileForm({...profileForm, dateOfBirth: e.target.value})}
                          className="w-full p-3 rounded-xl border border-border focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">ঠিকানা</label>
                        <textarea 
                          value={profileForm.address}
                          onChange={(e) => setProfileForm({...profileForm, address: e.target.value})}
                          className="w-full p-3 rounded-xl border border-border focus:ring-2 focus:ring-indigo-500 outline-none min-h-[100px]"
                          placeholder="আপনার ঠিকানা লিখুন"
                        />
                      </div>
                      <button 
                        type="submit"
                        className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
                      >
                        সেভ করুন
                      </button>
                    </form>
                  ) : (
                    <div className="space-y-6">
                      <div 
                        onClick={async () => {
                          if (!user) {
                            try {
                              await signInWithGoogle();
                            } catch (e) {}
                          } else {
                            setIsEditingProfile(true);
                          }
                        }}
                        className="flex items-center justify-between p-4 bg-muted/30 rounded-2xl cursor-pointer hover:bg-muted/50 transition-all"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600">
                            <User size={24} />
                          </div>
                          <div>
                            <p className="font-bold">প্রোফাইল সেটিংস</p>
                            <p className="text-xs text-muted-foreground">আপনার নাম ও তথ্য পরিবর্তন করুন</p>
                          </div>
                        </div>
                        <ChevronRight size={20} className="text-muted-foreground" />
                      </div>
                      
                      <div 
                        onClick={() => {
                          if (!user) {
                            toast.error("এই অপশন ব্যবহার করতে লগইন করুন");
                          } else {
                            toast.info("নোটিফিকেশন সেটিংস শীঘ্রই আসছে!");
                          }
                        }}
                        className="flex items-center justify-between p-4 bg-muted/30 rounded-2xl cursor-pointer hover:bg-muted/50 transition-all"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-rose-100 rounded-full flex items-center justify-center text-rose-600">
                            <Bell size={24} />
                          </div>
                          <div>
                            <p className="font-bold">নোটিফিকেশন</p>
                            <p className="text-xs text-muted-foreground">অ্যাপের অ্যালার্ট ম্যানেজ করুন</p>
                          </div>
                        </div>
                        <ChevronRight size={20} className="text-muted-foreground" />
                      </div>

                      <div 
                        onClick={() => {
                          if (!user) {
                            toast.error("এই অপশন ব্যবহার করতে লগইন করুন");
                          } else {
                            toast.info("প্রাইভেসি ও সিকিউরিটি সেটিংস শীঘ্রই আসছে!");
                          }
                        }}
                        className="flex items-center justify-between p-4 bg-muted/30 rounded-2xl cursor-pointer hover:bg-muted/50 transition-all"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center text-amber-600">
                            <ShieldCheck size={24} />
                          </div>
                          <div>
                            <p className="font-bold">প্রাইভেসি ও সিকিউরিটি</p>
                            <p className="text-xs text-muted-foreground">আপনার ডাটা সুরক্ষিত রাখুন</p>
                          </div>
                        </div>
                        <ChevronRight size={20} className="text-muted-foreground" />
                      </div>

                      <div 
                        onClick={() => {
                          setTheme(theme === 'dark' ? 'light' : 'dark');
                          toast.success(`থিম পরিবর্তন করে ${theme === 'dark' ? 'লাইট' : 'ডার্ক'} করা হয়েছে`);
                        }}
                        className="flex items-center justify-between p-4 bg-muted/30 rounded-2xl cursor-pointer hover:bg-muted/50 transition-all"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600">
                            {theme === 'dark' ? <Sun size={24} /> : <Moon size={24} />}
                          </div>
                          <div>
                            <p className="font-bold">থিম পরিবর্তন</p>
                            <p className="text-xs text-muted-foreground">{theme === 'dark' ? 'লাইট' : 'ডার্ক'} মোড ব্যবহার করুন</p>
                          </div>
                        </div>
                        <div className="w-12 h-6 bg-indigo-200 rounded-full relative flex items-center p-1">
                          <motion.div 
                            layout
                            className="w-4 h-4 bg-indigo-600 rounded-full"
                            animate={{ x: theme === 'dark' ? 24 : 0 }}
                          />
                        </div>
                      </div>

                      {user && (
                        <div 
                          onClick={() => {
                            logout();
                            toast.success("সফলভাবে লগআউট হয়েছেন");
                          }}
                          className="flex items-center justify-between p-4 bg-red-50 rounded-2xl cursor-pointer hover:bg-red-100 transition-all mt-4"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center text-red-600">
                              <LogOut size={24} />
                            </div>
                            <div>
                              <p className="font-bold text-red-600">লগআউট</p>
                              <p className="text-xs text-red-500">আপনার অ্যাকাউন্ট থেকে সাইন আউট করুন</p>
                            </div>
                          </div>
                          <ChevronRight size={20} className="text-red-400" />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            ) : activeTab === 'upgrade' ? (
              <motion.div 
                key="upgrade"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-8 flex items-center justify-center min-h-[80vh]"
              >
                <div className="max-w-md w-full bg-indigo-600 p-8 rounded-[2.5rem] text-white text-center space-y-8 shadow-2xl shadow-indigo-200">
                  <div className="w-20 h-20 bg-white/20 rounded-3xl flex items-center justify-center mx-auto backdrop-blur-md">
                    <Sparkles size={40} />
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-4xl font-black">প্রো মেম্বারশিপ</h2>
                    <p className="text-indigo-100">আপনার মানসিক স্বাস্থ্যের জন্য সেরা এআই টুলস</p>
                  </div>
                  
                  <div className="space-y-4 text-left">
                    {[
                      "উন্নত এআই বিশ্লেষণ রিপোর্ট",
                      "আনলিমিটেড ফলো-আপ সেশন",
                      "ব্যক্তিগতকৃত মেন্টাল ওয়েলনেস প্ল্যান",
                      "এক্সক্লুসিভ ভিডিও কোর্স এক্সেস",
                      "২৪/৭ এআই চ্যাট সাপোর্ট"
                    ].map((feature, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <CheckCircle2 size={18} className="text-indigo-300" />
                        <span className="text-sm font-medium">{feature}</span>
                      </div>
                    ))}
                  </div>

                  <button 
                    onClick={async () => {
                      if (!user) {
                        try {
                          await signInWithGoogle();
                        } catch (e) {
                          // Error is already logged in firebase.ts
                        }
                      } else {
                        toast.success("আপনি ইতিমধ্যে একজন প্রো মেম্বার!");
                      }
                    }}
                    className="w-full py-4 bg-white text-indigo-600 rounded-2xl font-black text-lg hover:bg-indigo-50 transition-all active:scale-95 shadow-xl"
                  >
                    {user ? "আপনি প্রো মেম্বার" : "এখনই আপগ্রেড করুন"}
                  </button>
                  <p className="text-xs text-indigo-200">৭ দিনের ফ্রি ট্রায়াল। যেকোনো সময় বাতিলযোগ্য।</p>
                </div>
              </motion.div>
            ) : (
              <div className="p-8">
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
                        <h2 className="text-4xl md:text-5xl font-extrabold text-foreground leading-tight">
                          আপনার মানসিক স্বাস্থ্য <br />
                          <span className="text-indigo-600">গভীরভাবে বুঝুন</span>
                        </h2>
                        <p className="text-muted-foreground text-lg">
                          একটি ক্যাটাগরি বেছে নিন এবং আমাদের এআই-এর মাধ্যমে আপনার মানসিক অবস্থার একটি বিস্তারিত বিশ্লেষণ পান।
                        </p>
                        {!user && (
                          <p className="text-xs text-amber-600 font-medium bg-amber-50 inline-block px-4 py-1 rounded-full border border-amber-100">
                            দ্রষ্টব্য: লগইন না করলে আপনার রেজাল্ট সেভ হবে না।
                          </p>
                        )}
                      </div>

                      {/* Bundled Test Feature */}
                      <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-3xl p-8 md:p-10 text-white shadow-xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
                        <div className="absolute bottom-0 left-0 w-40 h-40 bg-indigo-400/20 rounded-full blur-2xl -ml-10 -mb-10"></div>
                        
                        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
                          <div className="space-y-4 flex-1">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 text-white text-xs font-bold uppercase tracking-wider">
                              <Sparkles className="w-3 h-3" />
                              সম্পূর্ণ মানসিক বিশ্লেষণ (৫ ধাপ)
                            </div>
                            <h3 className="text-3xl font-extrabold">আপনার সম্পূর্ণ মানসিক বিশ্লেষণ শুরু করুন</h3>
                            <p className="text-indigo-100 text-lg leading-relaxed max-w-xl">
                              উদ্বেগ, মানসিক চাপ, অতিরিক্ত চিন্তা, আত্মবিশ্বাস এবং আবেগ নিয়ন্ত্রণ নিয়ে একটি সমন্বিত রিপোর্ট পান। এটি কোনো চিকিৎসা নির্ণয় নয়।
                            </p>
                            {!user && (
                              <p className="text-sm text-indigo-200 font-medium bg-black/10 inline-block px-4 py-2 rounded-xl">
                                আপনি অতিথি হিসেবে এই টেস্ট দিতে পারেন। আপনার ফলাফল সংরক্ষণ করতে লগইন করুন।
                              </p>
                            )}
                          </div>
                          
                          <button 
                            onClick={startBundledTest}
                            className="w-full md:w-auto px-8 py-4 bg-white text-indigo-600 hover:bg-indigo-50 rounded-2xl font-bold text-lg shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 flex-shrink-0"
                          >
                            <PlayCircle className="w-6 h-6" />
                            ৫টি টেস্ট একসাথে দিন
                          </button>
                        </div>
                      </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {CATEGORIES.map((cat) => {
                              const IconComponent = ICON_MAP[cat.icon] || Brain;
                              return (
                                <motion.button
                                  key={cat.id}
                                  whileHover={{ y: -4, scale: 1.02 }}
                                  whileTap={{ scale: 0.98 }}
                                  onClick={() => startAssessment(cat)}
                                  className="p-6 bg-card rounded-2xl border border-border shadow-sm hover:shadow-xl hover:border-indigo-200 transition-all text-left group"
                                >
                                  <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center mb-4 group-hover:bg-indigo-50 transition-colors">
                                    <IconComponent className="w-6 h-6 text-muted-foreground group-hover:text-indigo-600" />
                                  </div>
                                  <h3 className="text-xl font-bold text-foreground mb-2">{cat.name}</h3>
                                  <p className="text-muted-foreground text-sm leading-relaxed">{cat.description}</p>
                                  <div className="mt-4 flex items-center text-indigo-600 font-semibold text-sm opacity-0 group-hover:opacity-100 transition-opacity">
                                    শুরু করুন <ChevronRight className="w-4 h-4 ml-1" />
                                  </div>
                                </motion.button>
                              );
                            })}
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
                          <h3 className="text-2xl font-bold text-foreground">অনুগ্রহ করে অপেক্ষা করুন</h3>
                          <p className="text-muted-foreground max-w-sm mx-auto">{loadingMessage}</p>
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
                              className="flex items-center gap-1 text-muted-foreground hover:text-indigo-600 transition-colors font-medium text-sm"
                            >
                              <ArrowLeft className="w-4 h-4" />
                              পেছনে যান
                            </button>
                            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
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
                          <h3 className="text-2xl md:text-3xl font-bold text-foreground leading-tight">
                            {questions[currentQuestionIndex].text}
                          </h3>
                          <div className="grid gap-3">
                            {questions[currentQuestionIndex].options.map((opt, idx) => (
                              <motion.button
                                key={idx}
                                whileHover={{ x: 8 }}
                                whileTap={{ scale: 0.99 }}
                                onClick={() => handleAnswer(opt.score)}
                                className="p-5 bg-card border border-border rounded-2xl text-left hover:border-indigo-600 hover:bg-indigo-50/50 transition-all group flex items-center justify-between"
                              >
                                <span className="text-lg font-medium text-foreground group-hover:text-indigo-700">
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
                        className="max-w-3xl mx-auto space-y-6"
                      >
                        <button 
                          onClick={() => reset()}
                          className="flex items-center gap-1 text-slate-500 hover:text-indigo-600 transition-colors font-medium text-sm"
                        >
                          <ArrowLeft className="w-4 h-4" />
                          পেছনে যান
                        </button>

                        <div className="bg-card rounded-3xl border border-border overflow-hidden shadow-xl">
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
                              <p className="text-muted-foreground leading-relaxed text-lg italic">
                                "{report.summary}"
                              </p>
                            </section>

                            <div className="grid md:grid-cols-2 gap-6">
                              <section className="p-6 bg-muted rounded-2xl space-y-3">
                                <div className="flex items-center gap-2 text-foreground font-bold">
                                  <Brain className="w-5 h-5 text-indigo-600" />
                                  মানসিক অবস্থা
                                </div>
                                <p className="text-muted-foreground text-sm leading-relaxed">
                                  {report.mentalCondition}
                                </p>
                              </section>
                              <section className="p-6 bg-muted rounded-2xl space-y-3">
                                <div className="flex items-center gap-2 text-foreground font-bold">
                                  <Sparkles className="w-5 h-5 text-indigo-600" />
                                  আচরণগত বিশ্লেষণ
                                </div>
                                <p className="text-muted-foreground text-sm leading-relaxed">
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
                              <div className="flex items-center gap-2 text-foreground font-bold">
                                <ShieldCheck className="w-5 h-5 text-indigo-600" />
                                করণীয় বা পরামর্শ
                              </div>
                              <ul className="grid gap-3">
                                {report.recommendations.map((rec, i) => (
                                  <li key={i} className="flex items-start gap-3 p-4 bg-card border border-border rounded-xl shadow-sm">
                                    <div className="w-6 h-6 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold">
                                      {i + 1}
                                    </div>
                                    <span className="text-foreground text-sm">{rec}</span>
                                  </li>
                                ))}
                              </ul>
                            </section>

                            {report.suggestedTests && report.suggestedTests.length > 0 && (
                              <section className="space-y-4 mt-8 p-6 bg-indigo-50/50 dark:bg-indigo-950/20 rounded-2xl border border-indigo-100 dark:border-indigo-900/50">
                                <div className="flex items-center gap-2 text-indigo-900 dark:text-indigo-300 font-bold text-xl">
                                  <Brain className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                                  আপনার জন্য প্রস্তাবিত টেস্ট
                                </div>
                                <div className="grid gap-3">
                                  {report.suggestedTests.map((test, i) => (
                                    <div key={i} className="flex items-center gap-3 p-3 bg-card rounded-xl shadow-sm border border-border">
                                      <div className="w-8 h-8 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center flex-shrink-0 font-bold">
                                        {i + 1}
                                      </div>
                                      <span className="text-foreground font-medium">{test}</span>
                                    </div>
                                  ))}
                                </div>
                                <div className="mt-4 text-sm text-indigo-700 dark:text-indigo-400 font-medium text-center">
                                  {user ? "আপনি চাইলে এই টেস্টগুলো এখনই দিতে পারেন।" : "আপনি অতিথি হিসেবে টেস্ট দিয়েছেন। আপনি চাইলে এই টেস্টগুলো এখনই দিতে পারেন। আপনার অগ্রগতি সংরক্ষণ করতে লগইন করুন।"}
                                </div>
                              </section>
                            )}

                            <div className="pt-8 border-t border-slate-100 text-center">
                              <button
                                onClick={() => { setActiveTab('dashboard'); reset(); }}
                                className="inline-flex items-center gap-2 px-8 py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
                              >
                                <LayoutDashboard className="w-5 h-5" />
                                ড্যাশবোর্ডে ফিরে যান
                              </button>
                              <p className="mt-6 text-xs text-muted-foreground max-w-md mx-auto">
                                এটি কোনো চিকিৎসা নির্ণয় নয়, শুধুমাত্র একটি সাধারণ মানসিক মূল্যায়ন। আপনার যদি গুরুতর সমস্যা থাকে, তবে একজন বিশেষজ্ঞের পরামর্শ নিন।
                              </p>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </AnimatePresence>
          </div>

        {/* Footer */}
        <footer className="px-8 py-6 text-center text-xs text-muted-foreground border-t border-border bg-card">
          &copy; ২০২৬ মনোবীক্ষণ - এআই মানসিক স্বাস্থ্য মূল্যায়ন। সর্বস্বত্ব সংরক্ষিত।
        </footer>
      </main>
      <Toaster position="top-center" richColors />
    </div>
  );
}
