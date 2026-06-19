import React, { useState, useRef, useEffect } from 'react';
import { Send, X, Loader } from 'lucide-react';

interface Message {
  type: 'question' | 'answer' | 'suggestion';
  content: string;
}

type ChatProvider = 'ollama' | 'gemini';

interface ChatWidgetProps {
  storyId: number;
  storyTitle: string;
  onClose: () => void;
}

export const ChatWidget: React.FC<ChatWidgetProps> = ({ storyId, storyTitle, onClose }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [provider, setProvider] = useState<ChatProvider>('ollama');
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [error, setError] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Fetch suggestions on mount
  useEffect(() => {
    const fetchSuggestions = async () => {
      try {
        const response = await fetch(
          `http://localhost:5000/api/chat/suggestions/${storyId}`
        );
        const data = await response.json();
        if (data.success) {
          setSuggestions(data.data.suggestions);
        }
      } catch (err) {
        console.error('Error fetching suggestions:', err);
      }
    };

    fetchSuggestions();
  }, [storyId]);

  const handleSendQuestion = async (question: string = input) => {
    if (!question.trim()) return;

    setError('');
    setLoading(true);

    try {
      // Add user question to messages
      const updatedMessages: Message[] = [
        ...messages,
        { type: 'question', content: question }
      ];
      setMessages(updatedMessages);
      setInput('');

      // Send to backend
      const response = await fetch('http://localhost:5000/api/chat/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          story_id: storyId,
          question: question,
          provider
        })
      });

      const data = await response.json();

      if (data.success) {
        updatedMessages.push({
          type: 'answer',
          content: data.data.answer
        });
        setMessages(updatedMessages);
      } else {
        setError(data.error || 'Failed to get response');
      }
    } catch (err: any) {
      setError(err.message || 'Error sending question');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 w-96 h-96 bg-white rounded-lg shadow-2xl flex flex-col border border-blue-200 z-50">
      {/* Header */}
      <div className="bg-blue-600 text-white p-4 rounded-t-lg flex justify-between items-center">
        <div>
          <h3 className="font-bold">Chat with AI</h3>
          <p className="text-sm text-blue-100">{storyTitle}</p>
        </div>
        <button
          onClick={onClose}
          className="text-white hover:bg-blue-700 p-1 rounded"
        >
          <X size={20} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
        {messages.length === 0 && suggestions.length > 0 && (
          <div className="text-center py-4">
            <p className="text-gray-600 text-sm mb-3">Try asking about this story:</p>
            <div className="space-y-2">
              {suggestions.slice(0, 3).map((suggestion, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendQuestion(suggestion)}
                  className="w-full text-left text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 p-2 rounded border border-blue-200 transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex ${msg.type === 'question' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-xs px-3 py-2 rounded-lg text-sm ${
                msg.type === 'question'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-300 text-gray-800'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-300 text-gray-800 px-3 py-2 rounded-lg flex items-center gap-2">
              <Loader size={16} className="animate-spin" />
              <span className="text-sm">Thinking...</span>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-3 py-2 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t p-3 bg-white rounded-b-lg">
        <div className="mb-2">
          <label className="block text-xs font-semibold text-gray-600 mb-1">
            AI Provider
          </label>
          <select
            value={provider}
            onChange={(e) => setProvider(e.target.value as ChatProvider)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ollama">Ollama (free, local)</option>
            <option value="gemini">Gemini (free tier)</option>
          </select>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleSendQuestion();
              }
            }}
            placeholder="Ask a question..."
            disabled={loading}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          />
          <button
            onClick={() => handleSendQuestion()}
            disabled={loading || !input.trim()}
            className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};
