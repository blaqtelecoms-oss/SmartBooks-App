import React, { useState, useRef, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkles, Send, Loader2, User } from "lucide-react";
import ReactMarkdown from "react-markdown";

export default function AIAssistant() {
  const { currentCompany } = useOutletContext();
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Hello! I'm your SmartBooks AI assistant. I can help you with South African accounting questions, explain transaction allocations, VAT calculations, SARS compliance, and more. How can I help you today?" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const userMessage = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setLoading(true);

    try {
      const context = currentCompany ? `The user is working with company "${currentCompany.name}" (VAT: ${currentCompany.vat_number || "N/A"}, Tax: ${currentCompany.tax_number || "N/A"}, FYE: ${currentCompany.financial_year_end || "N/A"}).` : "";

      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a highly knowledgeable South African chartered accountant AI assistant for SmartBooks SA. You specialize in:
- SA GAAP and IFRS accounting standards
- SARS tax legislation (Income Tax Act, VAT Act)
- Double-entry bookkeeping
- VAT at 15% (standard rate), zero-rated, and exempt supplies
- Company income tax (27%)
- PAYE, UIF (1%+1%), SDL (1%)
- Tax return preparation (VAT201, ITR12, ITR14, EMP201, IRP5)
- POPIA compliance
- General accounting best practices

${context}

Previous conversation:
${messages.slice(-6).map(m => `${m.role}: ${m.content}`).join("\n")}

User question: ${userMessage}

Provide a clear, professional, and helpful response. Use examples with Rand amounts where appropriate. Reference specific sections of SA legislation when relevant.`
      });

      setMessages(prev => [...prev, { role: "assistant", content: response }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: "assistant", content: "I'm sorry, I encountered an error processing your question. Please try again." }]);
    }
    setLoading(false);
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="mb-4">
        <h1 className="text-[24px] font-medium text-[#0F0F0F] tracking-tight flex items-center gap-2">
          <Sparkles size={22} className="text-[#3B82F6]" /> AI Assistant
        </h1>
        <p className="text-[13px] text-[#6B6B72] mt-1">Ask anything about SA accounting, tax, and compliance</p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 pb-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] lg:max-w-[70%] ${msg.role === "user" ? "order-1" : ""}`}>
              <div className="flex items-start gap-2.5">
                {msg.role === "assistant" && (
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#60A5FA] to-[#C084FC] flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Sparkles size={13} className="text-white" />
                  </div>
                )}
                <div className={`rounded-xl px-4 py-3 ${
                  msg.role === "user"
                    ? "bg-[#0F0F0F] text-white"
                    : "bg-white border border-[#E5E5E8]"
                }`}>
                  {msg.role === "user" ? (
                    <p className="text-[13px] leading-relaxed">{msg.content}</p>
                  ) : (
                    <div className="text-[13px] leading-relaxed prose prose-sm max-w-none prose-p:my-1 prose-li:my-0.5 prose-headings:text-[#0F0F0F] prose-headings:mt-3 prose-headings:mb-1">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  )}
                </div>
                {msg.role === "user" && (
                  <div className="w-7 h-7 rounded-full bg-[#F1F1F4] flex items-center justify-center flex-shrink-0 mt-0.5">
                    <User size={13} className="text-[#6B6B72]" />
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#60A5FA] to-[#C084FC] flex items-center justify-center">
                <Sparkles size={13} className="text-white" />
              </div>
              <div className="bg-white border border-[#E5E5E8] rounded-xl px-4 py-3">
                <Loader2 size={16} className="animate-spin text-[#6B6B72]" />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-[#E5E5E8] pt-4">
        <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex gap-2">
          <Input
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Ask about VAT, PAYE, tax returns, allocations..."
            className="flex-1 text-[13px] bg-white"
            disabled={loading}
          />
          <Button type="submit" disabled={loading || !input.trim()} className="bg-[#0F0F0F] hover:bg-[#2D2D2D] text-white rounded-lg h-10 px-4">
            <Send size={16} />
          </Button>
        </form>
      </div>
    </div>
  );
}