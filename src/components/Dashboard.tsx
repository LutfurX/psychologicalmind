import React, { useEffect, useState } from 'react';
import { db, auth, OperationType, handleFirestoreError } from '../lib/firebase';
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { Brain, History, TrendingUp, Award, Clock, CheckCircle2, AlertCircle, Sparkles, Loader2 } from 'lucide-react';
import { generateRecommendation } from '../lib/gemini';
import { motion, AnimatePresence } from 'motion/react';

interface TestResult {
  id: string;
  category: string;
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  timeSpent: number;
  completedAt: string;
  suggestedTests?: string[];
}

interface Recommendation {
  id: string;
  content: string;
  type: 'study_tip' | 'weak_area' | 'encouragement';
  createdAt: string;
}

const Dashboard: React.FC = () => {
  const [user] = useAuthState(auth);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const chartContainerRef = React.useRef<HTMLDivElement>(null);
  const [chartDimensions, setChartDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!chartContainerRef.current) return;
    
    const observer = new ResizeObserver((entries) => {
      if (entries.length > 0) {
        const { width, height } = entries[0].contentRect;
        // Only update if dimensions are valid (greater than 0)
        if (width > 0 && height > 0) {
          setChartDimensions({ width, height });
        }
      }
    });
    
    observer.observe(chartContainerRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!user) return;

    const resultsQuery = query(
      collection(db, 'test_results'),
      where('userId', '==', user.uid),
      orderBy('completedAt', 'desc')
    );

    const recsQuery = query(
      collection(db, 'recommendations'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribeResults = onSnapshot(resultsQuery, (snapshot) => {
      const results = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TestResult));
      setTestResults(results);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'test_results');
    });

    const unsubscribeRecs = onSnapshot(recsQuery, (snapshot) => {
      const recs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Recommendation));
      setRecommendations(recs);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'recommendations');
    });

    return () => {
      unsubscribeResults();
      unsubscribeRecs();
    };
  }, [user]);

  const handleGenerateRecommendation = async () => {
    if (!user || testResults.length === 0) return;
    setIsGenerating(true);
    try {
      const rec = await generateRecommendation(testResults.slice(0, 5));
      if (rec) {
        await addDoc(collection(db, 'recommendations'), {
          userId: user.uid,
          content: rec.content,
          type: rec.type,
          createdAt: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error("Error generating recommendation:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-64 gap-4">
      <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      <p className="text-muted-foreground animate-pulse">আপনার প্রগতি লোড হচ্ছে...</p>
    </div>
  );

  const chartData = [...testResults].reverse().map(result => ({
    date: new Date(result.completedAt).toLocaleDateString(),
    score: result.score,
    category: result.category
  }));

  const averageScore = testResults.length > 0 
    ? Math.round(testResults.reduce((acc, curr) => acc + curr.score, 0) / testResults.length)
    : 0;

  return (
    <div className="space-y-8 max-w-6xl mx-auto px-4 py-8">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card p-6 rounded-2xl border border-border flex flex-col gap-2 shadow-sm"
        >
          <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wider font-bold">
            <Award size={16} className="text-indigo-600" /> গড় স্কোর
          </div>
          <div className="text-4xl font-black text-foreground">{averageScore}%</div>
        </motion.div>
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card p-6 rounded-2xl border border-border flex flex-col gap-2 shadow-sm"
        >
          <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wider font-bold">
            <History size={16} className="text-indigo-600" /> সম্পন্ন মূল্যায়ন
          </div>
          <div className="text-4xl font-black text-foreground">{testResults.length}</div>
        </motion.div>
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-card p-6 rounded-2xl border border-border flex flex-col gap-2 shadow-sm"
        >
          <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wider font-bold">
            <CheckCircle2 size={16} className="text-indigo-600" /> মোট সঠিক উত্তর
          </div>
          <div className="text-4xl font-black text-foreground">
            {testResults.reduce((acc, curr) => acc + curr.correctAnswers, 0)}
          </div>
        </motion.div>
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-card p-6 rounded-2xl border border-border flex flex-col gap-2 shadow-sm"
        >
          <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wider font-bold">
            <Clock size={16} className="text-indigo-600" /> ব্যয়কৃত সময়
          </div>
          <div className="text-4xl font-black text-foreground">
            {Math.round(testResults.reduce((acc, curr) => acc + curr.timeSpent, 0) / 60)}মি.
          </div>
        </motion.div>
      </div>

      {testResults.length > 0 && testResults[0].suggestedTests && testResults[0].suggestedTests.length > 0 && (
        <div className="bg-indigo-50/50 dark:bg-indigo-950/20 p-6 rounded-3xl border border-indigo-100 dark:border-indigo-900/50 space-y-4 shadow-sm">
          <h3 className="text-xl font-bold flex items-center gap-2 text-indigo-900 dark:text-indigo-300">
            <Brain size={20} className="text-indigo-600 dark:text-indigo-400" /> আপনার জন্য প্রস্তাবিত টেস্ট
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {testResults[0].suggestedTests.map((test, i) => (
              <div key={i} className="flex items-center gap-3 p-4 bg-card rounded-2xl shadow-sm border border-border">
                <div className="w-8 h-8 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center flex-shrink-0 font-bold">
                  {i + 1}
                </div>
                <span className="text-foreground font-medium">{test}</span>
              </div>
            ))}
          </div>
          <p className="text-sm text-indigo-700 dark:text-indigo-400 font-medium">
            আপনি চাইলে এই টেস্টগুলো এখনই দিতে পারেন।
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Progress Chart */}
        <div className="lg:col-span-2 bg-card p-6 rounded-3xl border border-border space-y-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold flex items-center gap-2">
              <TrendingUp size={20} className="text-indigo-600" /> প্রগতি চিত্র
            </h3>
          </div>
          <div className="h-[300px] w-full" ref={chartContainerRef}>
            {chartDimensions.width > 0 && chartDimensions.height > 0 && (
              <AreaChart width={chartDimensions.width} height={chartDimensions.height} data={chartData}>
                <defs>
                  <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#888' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#888' }} domain={[0, 100]} />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="score" 
                  stroke="#4f46e5" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorScore)" 
                />
              </AreaChart>
            )}
          </div>
        </div>

        {/* AI Recommendations */}
        <div className="bg-card p-6 rounded-3xl border border-border space-y-6 flex flex-col shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold flex items-center gap-2">
              <Sparkles size={20} className="text-amber-500" /> এআই বিশ্লেষণ
            </h3>
            <button 
              onClick={handleGenerateRecommendation}
              disabled={isGenerating || testResults.length === 0}
              className="p-2 rounded-xl hover:bg-indigo-50 text-indigo-600 transition-all disabled:opacity-50 active:scale-95"
              title="নতুন বিশ্লেষণ তৈরি করুন"
            >
              <Brain size={18} className={isGenerating ? "animate-pulse" : ""} />
            </button>
          </div>
          
          <div className="flex-1 space-y-4 overflow-y-auto max-h-[300px] pr-2 scrollbar-hide">
            <AnimatePresence mode="popLayout">
              {recommendations.length > 0 ? (
                recommendations.map((rec) => (
                  <motion.div 
                    key={rec.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className={`p-4 rounded-2xl border ${
                      rec.type === 'study_tip' ? 'bg-blue-50/50 border-blue-100 text-blue-800' :
                      rec.type === 'weak_area' ? 'bg-amber-50/50 border-amber-100 text-amber-800' :
                      'bg-emerald-50/50 border-emerald-100 text-emerald-800'
                    }`}
                  >
                    <p className="text-sm leading-relaxed font-medium">{rec.content}</p>
                    <div className="mt-2 text-[10px] uppercase tracking-wider font-bold opacity-60">
                      {new Date(rec.createdAt).toLocaleDateString('bn-BD')} • {
                        rec.type === 'study_tip' ? 'পরামর্শ' :
                        rec.type === 'weak_area' ? 'দুর্বলতা' : 'উৎসাহ'
                      }
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground gap-2 py-8">
                  <Brain size={32} className="opacity-20" />
                  <p className="text-sm">এআই-চালিত পরামর্শ পেতে কিছু মূল্যায়ন সম্পন্ন করুন!</p>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Test History List */}
      <div className="bg-card p-6 rounded-3xl border border-border space-y-6 shadow-sm">
        <h3 className="text-xl font-bold flex items-center gap-2">
          <History size={20} className="text-indigo-600" /> সাম্প্রতিক কার্যক্রম
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-wider text-muted-foreground">
                <th className="pb-4 font-bold">ক্যাটাগরি</th>
                <th className="pb-4 font-bold">স্কোর</th>
                <th className="pb-4 font-bold">সঠিক</th>
                <th className="pb-4 font-bold">সময়</th>
                <th className="pb-4 font-bold">তারিখ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {testResults.map((result) => (
                <tr key={result.id} className="group hover:bg-muted transition-colors">
                  <td className="py-4 font-bold text-foreground">{result.category}</td>
                  <td className="py-4">
                    <span className={`font-black ${result.score >= 80 ? 'text-emerald-600' : result.score >= 50 ? 'text-amber-600' : 'text-rose-600'}`}>
                      {result.score}%
                    </span>
                  </td>
                  <td className="py-4 text-sm text-muted-foreground">
                    {result.correctAnswers}/{result.totalQuestions}
                  </td>
                  <td className="py-4 text-sm text-muted-foreground">
                    {Math.round(result.timeSpent / 60)}মি. {result.timeSpent % 60}সে.
                  </td>
                  <td className="py-4 text-sm text-muted-foreground">
                    {new Date(result.completedAt).toLocaleDateString('bn-BD')}
                  </td>
                </tr>
              ))}
              {testResults.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                      <History size={32} className="opacity-10" />
                      <p>এখনো কোনো মূল্যায়ন সম্পন্ন হয়নি। আপনার ইতিহাস দেখতে একটি মূল্যায়ন শুরু করুন!</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
