const clamp = (value, min = 0, max = 100) => Math.min(max, Math.max(min, Number(value || 0)));
const round = (value) => Math.round(clamp(value));

function paceScore(pace) {
  if (!pace) return 0;
  if (pace >= 90 && pace <= 150) return 100;
  if (pace < 90) return clamp(100 - (90 - pace) * 1.4);
  return clamp(100 - (pace - 150) * 1.4);
}

function calculateContentSignals(transcript, question, speechMetrics) {
  const answerWords = String(transcript || '').trim().split(/\s+/).filter(Boolean);
  const questionWords = new Set(String(question || '').toLowerCase().match(/[a-z]+/g) || []);
  const answerWordSet = new Set(String(transcript || '').toLowerCase().match(/[a-z]+/g) || []);
  const overlap = [...questionWords].filter((word) => word.length > 2 && answerWordSet.has(word)).length;
  const lexicalRelevance = questionWords.size > 0 ? clamp((overlap / questionWords.size) * 100 + 25) : 0;
  const completeness = speechMetrics.completeness > 0
    ? clamp(speechMetrics.completeness)
    : clamp(answerWords.length === 0 ? 0 : Math.min(100, 35 + answerWords.length * 2.5));
  const relevance = speechMetrics.relevance > 0 ? clamp(speechMetrics.relevance) : lexicalRelevance;
  const accuracy = speechMetrics.accuracy > 0 ? clamp(speechMetrics.accuracy) : clamp((completeness + relevance) / 2);

  return { completeness, relevance, accuracy, answerWords: answerWords.length };
}

function generateInterviewReport({
  session = {},
  speechMetrics = {},
  confidenceMetrics = {},
  transcript = '',
  question = '',
  aiAnalysis = null,
}) {
  const pace = clamp(speechMetrics.pace ?? 0, 0, 220);
  const clarity = clamp(speechMetrics.clarity ?? 0);
  const fillers = clamp(speechMetrics.fillers ?? 0, 0, 20);
  const pause = clamp(speechMetrics.averagePauseDuration ?? 0, 0, 30);
  const completeness = clamp(speechMetrics.completeness ?? 0);
  const relevance = clamp(speechMetrics.relevance ?? 0);
  const eyeContact = clamp(confidenceMetrics.eyeContact ?? confidenceMetrics.eyecContact ?? 0);
  const posture = clamp(confidenceMetrics.posture ?? 0);
  const nervousness = clamp(confidenceMetrics.nervousness ?? 0, 0, 100);
  const confidenceScore = clamp(confidenceMetrics.overallConfidenceScore ?? 0);
  const contentSignals = calculateContentSignals(transcript, question, speechMetrics);
  const effectiveCompleteness = contentSignals.completeness;
  const effectiveRelevance = aiAnalysis?.relevance?.relevance_score ?? contentSignals.relevance;
  const effectiveAccuracy = contentSignals.accuracy;
  const communicationScore = round(
    clarity * 0.45 + paceScore(pace) * 0.25 + clamp(100 - fillers * 12) * 0.15 + clamp(100 - pause * 12) * 0.15,
  );
  const contentQualityScore = round(effectiveCompleteness * 0.35 + effectiveRelevance * 0.4 + effectiveAccuracy * 0.25);
  const overallScore = clamp(
    communicationScore * 0.35 + contentQualityScore * 0.25 + confidenceScore * 0.4,
    0,
    100,
  );

  const strengths = Array.isArray(aiAnalysis?.coaching?.strengths) ? [...aiAnalysis.coaching.strengths] : [];
  if (clarity >= 75) strengths.push('Clear and structured speech delivery');
  if (effectiveRelevance >= 70) strengths.push('Strong alignment with the interview question');
  if (eyeContact >= 75) strengths.push('Professional eye contact');
  if (posture >= 75) strengths.push('Calm and confident body language');
  if (strengths.length === 0) strengths.push('Consistent effort and honest communication');

  const recommendations = Array.isArray(aiAnalysis?.coaching?.improvements)
    ? aiAnalysis.coaching.improvements.map((suggestion) => ({ category: 'AI Coaching', suggestion, priority: 'medium' }))
    : [];
  if (fillers > 4) recommendations.push({ category: 'Speech', suggestion: 'Reduce filler words by pausing briefly before answering complex points.', priority: 'high' });
  if (pause > 3) recommendations.push({ category: 'Pacing', suggestion: 'Shorten pauses and maintain smoother delivery between ideas.', priority: 'medium' });
  if (clarity < 70) recommendations.push({ category: 'Clarity', suggestion: 'Use simpler sentence structures and emphasize your key points.', priority: 'high' });
  if (nervousness > 30) recommendations.push({ category: 'Confidence', suggestion: 'Strengthen composure by slowing down your first response and breathing between ideas.', priority: 'high' });
  if (effectiveRelevance < 60) recommendations.push({ category: 'Content', suggestion: 'Answer the specific question directly and connect each point to the topic being assessed.', priority: 'high' });
  if (effectiveCompleteness < 60) recommendations.push({ category: 'Content', suggestion: 'Add a clear explanation, example, and conclusion to make the answer more complete.', priority: 'medium' });
  if (recommendations.length === 0) recommendations.push({ category: 'Overall', suggestion: 'Keep maintaining your current pace and confidence level.', priority: 'low' });

  const summary = aiAnalysis?.coaching?.summary || `The candidate showed ${overallScore >= 80 ? 'strong' : overallScore >= 65 ? 'solid' : 'mixed'} interview performance in ${session.title || 'this session'}, with a communication score of ${communicationScore}/100 and content quality of ${contentQualityScore}/100. The response was ${effectiveRelevance >= 75 ? 'well aligned to the question' : 'partially aligned and needs more direct supporting detail'} across ${contentSignals.answerWords} spoken words.`;

  return {
    overallScore: Math.round(overallScore),
    communicationScore,
    contentQualityScore,
    summary,
    structuredCoaching: aiAnalysis?.coaching ? {
      technicalAccuracy: aiAnalysis.coaching.technical_accuracy,
      completeness: aiAnalysis.coaching.completeness ?? Math.round(effectiveCompleteness),
      answerQuality: aiAnalysis.coaching.answer_quality,
      missingConcepts: aiAnalysis.coaching.missing_concepts || [],
      strengths: aiAnalysis.coaching.strengths || [],
      weaknesses: aiAnalysis.coaching.weaknesses || [],
      coaching: aiAnalysis.coaching.coaching || aiAnalysis.coaching.summary || '',
      improvedAnswer: aiAnalysis.coaching.improved_answer || '',
      provider: aiAnalysis.coaching.provider || aiAnalysis.models?.coaching || 'local',
    } : null,
    strengths,
    recommendations,
    aiPipeline: {
      whisper: 'Browser transcript supplied; Faster-Whisper endpoint is available for recorded audio.',
      sentenceBert: aiAnalysis?.models?.relevance || 'Sentence-BERT unavailable; local content analysis used.',
      coachingModel: aiAnalysis?.models?.coaching || 'local',
    },
    transcript: transcript || '',
    question: question || session.title || '',
    metrics: {
      pace,
      clarity,
      fillers,
      pause,
      completeness: effectiveCompleteness,
      relevance: effectiveRelevance,
      accuracy: effectiveAccuracy,
      eyeContact,
      posture,
      nervousness,
      confidenceScore,
    },
  };
}

async function analyzeWithPythonService({ question, answer, expectedConcepts = [], metrics }) {
  const serviceUrl = process.env.AI_SERVICE_URL || 'http://127.0.0.1:5100';
  try {
    const response = await fetch(`${serviceUrl}/api/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, answer, expected_concepts: expectedConcepts, metrics }),
      signal: AbortSignal.timeout(120000),
    });
    if (!response.ok) {
      console.warn(`[AI Service] Analysis returned HTTP ${response.status}`);
      return null;
    }
    const analysis = await response.json();
    console.log(`[AI Service] Sentence-BERT relevance=${analysis.relevance?.relevance_score ?? ' unavailable'} coaching=${analysis.models?.coaching || 'unavailable'}`);
    return analysis;
  } catch (error) {
    console.warn(`[AI Service] Analysis unavailable: ${error.message}`);
    return null;
  }
}

module.exports = {
  generateInterviewReport,
  analyzeWithPythonService,
};
