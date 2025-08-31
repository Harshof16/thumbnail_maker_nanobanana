import { useState } from 'react';

type Props = {
  onComplete: (responses: Record<string, string | undefined>, placement?: string) => void;
  responses: Record<string, string | undefined>;
  setResponses: (r: Record<string, string | undefined> | ((prev: Record<string, string | undefined>) => Record<string, string | undefined>)) => void;
  loading?: boolean;
};

export default function Questionnaire({ onComplete, responses, setResponses, loading }: Props) {
  const questions = [
    {
      id: 'videoType',
      question: 'What type of video is this for?',
      options: ['Tutorial', 'Gaming', 'Vlog', 'Review', 'Entertainment', 'Educational', 'Music', 'Sports']
    },
    {
      id: 'style',
      question: 'What style do you prefer?',
      options: ['Bold & Dramatic', 'Clean & Minimal', 'Fun & Colorful', 'Professional', 'Dark & Moody', 'Bright & Energetic']
    },
    {
      id: 'mood',
      question: 'What mood should the thumbnail convey?',
      options: ['Exciting', 'Mysterious', 'Happy', 'Serious', 'Dramatic', 'Calm', 'Intense', 'Playful']
    },
    {
      id: 'audience',
      question: 'Who is your target audience?',
      options: ['Kids (6-12)', 'Teens (13-17)', 'Young Adults (18-25)', 'Adults (26-40)', 'All Ages', 'Professionals']
    }
  ];

  const [placement, setPlacement] = useState('center');

  const handleSubmit = () => {
    if (Object.keys(responses).length >= questions.length) {
      console.log('clicked')
      onComplete(responses, placement);
    }
  };

  return (
    <div className="space-y-8">
  {questions.map((q) => (
        <div key={q.id} className="space-y-4">
          <h3 className="text-xl font-semibold text-white">{q.question}</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {q.options.map((option) => (
              <button
                key={option}
                onClick={() => setResponses((prev: Record<string, string | undefined>) => ({ ...prev, [q.id]: option }))}
                className={`p-3 rounded-lg border transition-all text-sm font-medium relative overflow-hidden
                  ${responses[q.id] === option
                    ? 'bg-red-600/30 backdrop-blur-sm border-red-400/30 text-white shadow-[0_6px_24px_rgba(255,77,79,0.12)]'
                    : 'bg-white/5 border-red-300/20 text-red-100 hover:bg-white/10 hover:border-red-300/40'
                  }`}
              >
                {/* subtle glass sheen */}
                {responses[q.id] === option && <span className="absolute inset-0 bg-gradient-to-t from-white/3 to-transparent pointer-events-none" />}
                {option}
              </button>
            ))}
          </div>
        </div>
      ))}

      <div className="space-y-4">
        <h3 className="text-xl font-semibold text-white">Where should your photo appear?</h3>
        <div className="grid grid-cols-3 gap-3">
          {['left', 'center', 'right'].map((pos) => (
            <button
              key={pos}
              onClick={() => setPlacement(pos)}
              className={`p-4 rounded-lg border transition-all capitalize relative overflow-hidden
                ${placement === pos
                  ? 'bg-red-600/30 backdrop-blur-sm border-red-400/30 text-white shadow-[0_6px_20px_rgba(255,77,79,0.08)]'
                  : 'bg-white/5 border-red-300/20 text-red-100 hover:bg-white/10'
                }`}
            >
              {placement === pos && <span className="absolute inset-0 bg-gradient-to-t from-white/4 to-transparent pointer-events-none" />}
              {pos}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-xl font-semibold text-white">Additional Context (Optional)</h3>
        <textarea
          value={responses.context || ''}
          onChange={(e) => setResponses((prev: Record<string, string | undefined>) => ({ ...prev, context: e.target.value }))}
          placeholder="Any specific details about your video content..."
          className="w-full p-4 bg-white/5 border border-red-300/20 rounded-lg text-white placeholder-red-200/60 focus:outline-none focus:border-red-400/50"
          rows={3}
        />
      </div>

      <button
        onClick={handleSubmit}
        disabled={Object.keys(responses).length < questions.length || !!loading}
        className="w-full py-4 bg-gradient-to-r cursor-pointer bg-red-600/90 hover:bg-red-700/95 text-white font-semibold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:from-red-600 hover:to-red-700 transition-all flex items-center justify-center space-x-2"
      >
        {loading ? (
          <>
            <div className="spinner" />
            <span>Generating…</span>
          </>
        ) : (
          <span>Generate Thumbnails</span>
        )}
      </button>
    </div>
  );
}
  