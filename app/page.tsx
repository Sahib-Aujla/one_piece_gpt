'use client';

import { useChat } from '@ai-sdk/react';

export default function Page() {
  const { messages, input, handleSubmit, handleInputChange, status } = useChat();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-blue-50 flex items-center justify-center p-4" style={{backgroundImage: 'url(/one.png)', backgroundSize: 'cover'}}>
      <div className="w-full max-w-2xl bg-white shadow-xl rounded-2xl p-6 flex flex-col space-y-4 h-[80vh]">
        <h1 className='text-2xl text-center'>The One Piece Wizard</h1>
        <div className="overflow-y-auto flex-1 space-y-3 px-1" id="chat-box">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`rounded-lg px-4 py-2 max-w-xs sm:max-w-sm text-sm whitespace-pre-line ${
                  message.role === 'user'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 text-gray-900'
                }`}
              >
                {message.parts.map((part, index) => {
                  if (part.type === 'text') {
                    return <span key={index}>{part.text}</span>;
                  }
                  return null;
                })}
              </div>
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            placeholder="Type your message..."
            onChange={handleInputChange}
            disabled={status !== 'ready'}
            className="flex-1 border border-gray-300 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-gray-100"
          />
          <button
            type="submit"
            disabled={status !== 'ready' || !input.trim()}
            className="bg-blue-500 text-white px-4 py-2 rounded-full hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
