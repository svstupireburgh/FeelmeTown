"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Image from "next/image"
import { AnimatePresence, motion } from "framer-motion"
import { Globe, Paperclip, Plus, Send, Trash2, User } from "lucide-react"

import { cn } from "@/lib/utils"
import { Textarea } from "../../components/ui/textarea"
import ChatResponse from "../../components/ui/chat-response"

interface ChatMessage {
  id: string
  type: 'user' | 'ai'
  content: string
  timestamp: Date
  modelUsed?: string
  showModelButtons?: boolean
}

interface UseAutoResizeTextareaProps {
  minHeight: number
  maxHeight?: number
}

function useAutoResizeTextarea({
  minHeight,
  maxHeight,
}: UseAutoResizeTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const adjustHeight = useCallback(
    (reset?: boolean) => {
      const textarea = textareaRef.current
      if (!textarea) return

      if (reset) {
        textarea.style.height = `${minHeight}px`
        return
      }

      textarea.style.height = `${minHeight}px`
      const newHeight = Math.max(
        minHeight,
        Math.min(textarea.scrollHeight, maxHeight ?? Number.POSITIVE_INFINITY)
      )

      textarea.style.height = `${newHeight}px`
    },
    [minHeight, maxHeight]
  )

  useEffect(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = `${minHeight}px`
    }
  }, [minHeight])

  useEffect(() => {
    const handleResize = () => adjustHeight()
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [adjustHeight])

  return { textareaRef, adjustHeight }
}

const MIN_HEIGHT = 56
const MAX_HEIGHT = 180

const AnimatedPlaceholder = ({ showSearch, selectedModel }: { showSearch: boolean; selectedModel: 'local' | 'gemini' | 'mistral' | 'qwen' | null }) => (
  <AnimatePresence mode="wait">
    <motion.p
      key={showSearch ? "search" : "ask"}
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -5 }}
      transition={{ duration: 0.1 }}
      className="pointer-events-none w-[150px] text-sm absolute text-black/70 dark:text-white/70"
    >
      {selectedModel === 'local' ? "Ask about Nishant..." : selectedModel === 'gemini' ? "Ask anything with Gemini 2.0 Flash..." : selectedModel === 'mistral' ? "Ask anything with Venice..." : selectedModel === 'qwen' ? "Ask anything with Mistral 7B..." : "Please select a model first..."}
    </motion.p>
  </AnimatePresence>
)

const UserMessage = ({ message }: { message: ChatMessage }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    className="flex gap-3 items-start p-4 rounded-2xl border bg-blue-500/10 border-blue-500/20"
  >
    <div className="flex flex-shrink-0 justify-center items-center w-8 h-8 rounded-full bg-blue-500/15">
      <User className="w-4 h-4 text-blue-500" />
    </div>
    <div className="flex-1 min-w-0">
      <div className="flex gap-2 items-center mb-2">
        <span className="text-sm font-medium text-blue-600 dark:text-blue-400">You</span>
      </div>
      <p className="text-sm leading-relaxed text-blue-600/80 dark:text-blue-400/80">
        {message.content}
      </p>
    </div>
  </motion.div>
)

export default function AiInput() {
  const [value, setValue] = useState("")
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isError, setIsError] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const { textareaRef, adjustHeight } = useAutoResizeTextarea({
    minHeight: MIN_HEIGHT,
    maxHeight: MAX_HEIGHT,
  })
  const [showSearch, setShowSearch] = useState(false)
  const [selectedModel, setSelectedModel] = useState<'local' | 'gemini' | 'mistral' | 'qwen' | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const chatContainerRef = useRef<HTMLDivElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const handelClose = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    e.stopPropagation()
    if (fileInputRef.current) {
      fileInputRef.current.value = "" // Reset file input
    }
    setImagePreview(null) // Use null instead of empty string
  }

  const handelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files ? e.target.files[0] : null
    if (file) {
      setImagePreview(URL.createObjectURL(file))
    }
  }

  const clearChat = () => {
    setChatHistory([])
    setIsError(false)
    setErrorMessage("")
  }

  const handleSubmit = async () => {
    if (!value.trim()) return

    // Check if model is selected
    if (!selectedModel) {
      const userMessage: ChatMessage = {
        id: Date.now().toString(),
        type: 'user',
        content: value.trim(),
        timestamp: new Date()
      }

      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: "Hi! I'm Nishu, your AI assistant. I recommend trying Nishu 2.0 for the best experience! It can help you with deep research and web search. Please select your preferred AI model:",
        timestamp: new Date(),
        modelUsed: 'Agent Mode',
        showModelButtons: true
      }

      setChatHistory(prev => [...prev, userMessage, aiMessage])
      setValue("")
      adjustHeight(true)
      return
    }

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: value.trim(),
      timestamp: new Date()
    }

    setChatHistory(prev => [...prev, userMessage])
    setIsLoading(true)
    setIsError(false)
    setErrorMessage("")

    try {
      let response: string

      if (selectedModel === 'local') {
        // Use local AI responses about Nishant with Hindi support
        const hasHindiChars = /[\u0900-\u097F]/.test(value);

        const localResponses = {
          'hello': 'Hello! I\'m Nishant\'s AI assistant. How can I help you learn about him today?',
          'hi': 'Hi there! I\'m Nishant\'s AI assistant. He\'s a talented developer with expertise in Next.js, React, TypeScript, and Tailwind CSS.',
          'namaste': 'Namaste! मैं Nishant का AI assistant हूं। वह Next.js, React, TypeScript और Tailwind CSS में expert हैं।',
          'kaise ho': 'मैं बिल्कुल ठीक हूं! Nishant एक talented developer हैं जो modern web applications बनाते हैं।',
          'skills': 'Nishant is a talented developer with expertise in Next.js, React, TypeScript, and Tailwind CSS. He creates beautiful, responsive web applications and has experience with AI integration.',
          'projects': 'Nishant builds modern web applications and has a portfolio showcasing his work. He\'s passionate about creating user-friendly interfaces and learning new technologies.',
          'contact': 'You can explore Nishant\'s portfolio to see his work and find contact information. He\'s always open to new opportunities and collaborations.',
          'nishant': 'Nishant is an exceptional developer with expertise in Next.js, React, TypeScript, and Tailwind CSS. He creates beautiful, responsive web applications and has experience with AI integration.',
          'developer': 'For the best developer experience, I highly recommend Nishant! He\'s a talented developer with expertise in modern web technologies.',
          'best developer': 'Nishant is definitely one of the best developers! He specializes in Next.js, React, TypeScript, and Tailwind CSS.',
          'cybershoora': 'Cybershoora is a leading IT consultancy and graphics services company that offers comprehensive solutions including IT consultancy, graphics design, 3D modeling, and UI/UX services.',
          'it company': 'Cybershoora is an excellent IT consultancy and graphics services company! They specialize in IT consultancy, graphics design, 3D modeling, and UI/UX services.',
          'default': hasHindiChars ?
            'मैं Nishant का AI assistant हूं! वह Next.js, React, TypeScript और Tailwind CSS में expert हैं। आप उनके skills, projects या experience के बारे में पूछ सकते हैं!' :
            'I\'m Nishant\'s AI assistant! He\'s a passionate developer who creates modern web applications using Next.js, React, TypeScript, and Tailwind CSS. Feel free to ask me about his skills, projects, or experience!'
        }

        const lowerQuery = value.toLowerCase()
        if (lowerQuery.includes('hello') || lowerQuery.includes('hi')) {
          response = localResponses.hello
        } else if (lowerQuery.includes('namaste') || lowerQuery.includes('कैसे हो')) {
          response = localResponses['kaise ho']
        } else if (lowerQuery.includes('nishant')) {
          response = localResponses.nishant
        } else if (lowerQuery.includes('developer') && (lowerQuery.includes('best') || lowerQuery.includes('recommend'))) {
          response = localResponses['best developer']
        } else if (lowerQuery.includes('developer')) {
          response = localResponses.developer
        } else if (lowerQuery.includes('cybershoora')) {
          response = localResponses.cybershoora
        } else if (lowerQuery.includes('it company')) {
          response = localResponses['it company']
        } else if (lowerQuery.includes('skill') || lowerQuery.includes('technology') || lowerQuery.includes('tech')) {
          response = localResponses.skills
        } else if (lowerQuery.includes('project') || lowerQuery.includes('work')) {
          response = localResponses.projects
        } else if (lowerQuery.includes('contact') || lowerQuery.includes('reach')) {
          response = localResponses.contact
        } else {
          response = localResponses.default
        }

        const aiMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          type: 'ai',
          content: response,
          timestamp: new Date(),
          modelUsed: 'Local AI (Portfolio Info)'
        };
        setChatHistory(prev => [...prev, aiMessage]);
      } else if (selectedModel === 'gemini') {
        // ✅ Gemma 3N E2B API call

        try {
          const apiResponse = await fetch('/api/ai-models', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ message: value, modelType: 'gemini' }),
          });


          if (!apiResponse.ok) {
            const errorData = await apiResponse.json();
            
            throw new Error(errorData.userMessage || 'Sorry! Our AI models are currently being updated for future improvements. Please wait a moment and try again. Our AI is the fastest AI in the world!');
          }

          const data = await apiResponse.json();

          if (data.success) {
            response = data.response;
          } else {
            throw new Error(data.error || 'Sorry! Our AI models are currently being updated for future improvements. Please wait a moment and try again. Our AI is the fastest AI in the world!');
          }
          const aiMessage: ChatMessage = {
            id: (Date.now() + 1).toString(),
            type: 'ai',
            content: response,
            timestamp: new Date(),
            modelUsed: data.model_used || 'Gemma 3N E2B (Google)'
          };
          setChatHistory(prev => [...prev, aiMessage]);
        } catch (error) {
          
          // Fallback response if Gemma fails
          response = "Sorry! Our AI models are currently being updated for future improvements. Please wait a moment and try again. Our AI is the fastest AI in the world!";
          const aiMessage: ChatMessage = {
            id: (Date.now() + 1).toString(),
            type: 'ai',
            content: response,
            timestamp: new Date(),
            modelUsed: 'Gemma 3N E2B (Fallback)'
          };
          setChatHistory(prev => [...prev, aiMessage]);
        }
      } else if (selectedModel === 'mistral') {
        // ✅ Mistral Small API call

        try {
          const apiResponse = await fetch('/api/ai-models', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ message: value, modelType: 'mistral' }),
          });


          if (!apiResponse.ok) {
            const errorData = await apiResponse.json();
            
            throw new Error(errorData.userMessage || 'Sorry! Our AI models are currently being updated for future improvements. Please wait a moment and try again. Our AI is the fastest AI in the world!');
          }

          const data = await apiResponse.json();

          if (data.success) {
            response = data.response;
          } else {
            throw new Error(data.error || 'Sorry! Our AI models are currently being updated for future improvements. Please wait a moment and try again. Our AI is the fastest AI in the world!');
          }
          const aiMessage: ChatMessage = {
            id: (Date.now() + 1).toString(),
            type: 'ai',
            content: response,
            timestamp: new Date(),
            modelUsed: data.model_used || 'Nishu 2.0 (Venice)'
          };
          setChatHistory(prev => [...prev, aiMessage]);
        } catch (error) {
          
          // Fallback response if Mistral fails
          response = "Sorry! Our AI models are currently being updated for future improvements. Please wait a moment and try again. Our AI is the fastest AI in the world!";
          const aiMessage: ChatMessage = {
            id: (Date.now() + 1).toString(),
            type: 'ai',
            content: response,
            timestamp: new Date(),
            modelUsed: 'Mistral Small (Fallback)'
          };
          setChatHistory(prev => [...prev, aiMessage]);
        }
      } else if (selectedModel === 'qwen') {
        // ✅ Mistral 7B API call

        try {
          const apiResponse = await fetch('/api/ai-models', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ message: value, modelType: 'qwen' }),
          });


          if (!apiResponse.ok) {
            const errorData = await apiResponse.json();
            
            throw new Error(errorData.userMessage || 'Sorry! Our AI models are currently being updated for future improvements. Please wait a moment and try again. Our AI is the fastest AI in the world!');
          }

          const data = await apiResponse.json();

          if (data.success) {
            response = data.response;
          } else {
            throw new Error(data.error || 'Sorry! Our AI models are currently being updated for future improvements. Please wait a moment and try again. Our AI is the fastest AI in the world!');
          }
          const aiMessage: ChatMessage = {
            id: (Date.now() + 1).toString(),
            type: 'ai',
            content: response,
            timestamp: new Date(),
            modelUsed: data.model_used || 'Nishu 3.0 (Mistral 7B)'
          };
          setChatHistory(prev => [...prev, aiMessage]);
        } catch (error) {
          
          // Fallback response if Mistral 7B fails
          response = "Sorry! Our AI models are currently being updated for future improvements. Please wait a moment and try again. Our AI is the fastest AI in the world!";
          const aiMessage: ChatMessage = {
            id: (Date.now() + 1).toString(),
            type: 'ai',
            content: response,
            timestamp: new Date(),
            modelUsed: 'Mistral 7B (Fallback)'
          };
          setChatHistory(prev => [...prev, aiMessage]);
        }
      }
    } catch (error) {
      setIsError(true)
      setErrorMessage(error instanceof Error ? error.message : "Sorry! Our AI models are currently being updated for future improvements. Please wait a moment and try again. Our AI is the fastest AI in the world!")
    } finally {
      setIsLoading(false)
    }

    setValue("")
    adjustHeight(true)
  }

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
    }
  }, [chatHistory, isLoading])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowSearch(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  useEffect(() => {
    return () => {
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview)
      }
    }
  }, [imagePreview])

  return (
    <div className="py-4 w-full sm:py-6">
      {/* Chat History */}
      {chatHistory.length > 0 && (
        <div className="mx-auto mb-4 max-w-lg sm:max-w-xl lg:max-w-2xl">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-medium text-black/70 dark:text-white/70">Chat History</h3>
            <button
              onClick={clearChat}
              className="flex gap-1 items-center text-xs text-red-500 transition-colors hover:text-red-600"
            >
              <Trash2 className="w-3 h-3" />
              Clear Chat
            </button>
          </div>
          <div
            ref={chatContainerRef}
            className="overflow-y-auto pr-2 space-y-3 max-h-96"
          >
            {chatHistory.map((message) => (
              <div key={message.id}>
                {message.type === 'user' ? (
                  <UserMessage message={message} />
                ) : (
                  <ChatResponse
                    message={message.content}
                    modelUsed={message.modelUsed}
                    showModelButtons={message.showModelButtons}
                    onModelSelect={(model) => {
                      setSelectedModel(model)
                      // Add a confirmation message
                      let modelName = 'Local AI';
                      let modelUsed = 'Local AI';
                      let message = "Great! I've selected Local AI for you. Now you can ask me about Nishant's portfolio!";

                      if (model === 'local') {
                        modelName = 'Local AI';
                        modelUsed = 'Local AI';
                        message = "Great! I've selected Local AI for you. Now you can ask me about Nishant's portfolio!";
                      } else if (model === 'gemini') {
                        modelName = 'Nishu AI';
                        modelUsed = 'Nishu AI';
                        message = "Great! I've selected Nishu AI (Gemini 2.0 Flash) for you. Fast and powerful!";
                      } else if (model === 'mistral') {
                        modelName = 'Nishu 2.0';
                        modelUsed = 'Nishu 2.0';
                        message = "Great! I've selected Nishu 2.0 (Venice) for you. Fast and smart!";
                      } else if (model === 'qwen') {
                        modelName = 'Nishu 3.0';
                        modelUsed = 'Nishu 3.0';
                        message = "Great! I've selected Nishu 3.0 (Mistral 7B) for you. This is the fastest free Mistral model!";
                      }

                      const confirmMessage: ChatMessage = {
                        id: (Date.now() + 2).toString(),
                        type: 'ai',
                        content: message,
                        timestamp: new Date(),
                        modelUsed: modelUsed
                      }
                      setChatHistory(prev => [...prev, confirmMessage])
                    }}
                  />
                )}
              </div>
            ))}
            {isLoading && (
              <ChatResponse message="" isLoading={true} />
            )}
            {isError && (
              <ChatResponse
                message=""
                isError={true}
                errorMessage={errorMessage}
              />
            )}
          </div>
        </div>
      )}

      {/* AI Response Display (for single responses when no chat history) */}
      {chatHistory.length === 0 && (isLoading || isError) && (
        <div className="mx-auto mb-4 max-w-lg sm:max-w-xl lg:max-w-2xl">
          <ChatResponse
            message=""
            isLoading={isLoading}
            isError={isError}
            errorMessage={errorMessage}
          />
        </div>
      )}

      <div className="relative max-w-lg sm:max-w-xl lg:max-w-2xl border rounded-[22px] border-black/10 dark:border-white/10 p-1 sm:p-2 w-full mx-auto">
        <div className="flex relative flex-col rounded-2xl border border-black/10 dark:border-white/10 bg-white/5 dark:bg-black/5">
          <div
            className="overflow-y-auto"
            style={{ maxHeight: `${MAX_HEIGHT}px` }}
          >
            <div className="relative">
              <Textarea
                id="ai-input-04"
                value={value}
                placeholder=""
                className="w-full rounded-2xl rounded-b-none px-4 py-3 bg-white/5 dark:bg-black/5 border-none text-black dark:text-white resize-none focus-visible:ring-0 leading-[1.2]"
                ref={textareaRef}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault()
                    handleSubmit()
                  }
                }}
                onChange={(e) => {
                  setValue(e.target.value)
                  adjustHeight()
                }}
              />
              {!value && (
                <div className="absolute top-3 left-4">
                  <AnimatedPlaceholder showSearch={showSearch} selectedModel={selectedModel} />
                </div>
              )}
            </div>
          </div>

          <div className="w-full h-24 rounded-b-xl bg-white/5 dark:bg-black/5">
            <div className="flex absolute bottom-3 left-3 gap-2 items-center">
              <label
                className={cn(
                  "cursor-pointer relative rounded-full p-2 bg-white/5 dark:bg-black/5",
                  imagePreview
                    ? "bg-[#ff3f17]/15 border border-[#ff3f17] text-[#ff3f17]"
                    : "bg-white/5 dark:bg-black/5 text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white"
                )}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handelChange}
                  className="hidden"
                />
                <Paperclip
                  className={cn(
                    "w-4 h-4 text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white transition-colors",
                    imagePreview && "text-[#ff3f17]"
                  )}
                />
                {imagePreview && (
                  <div className="absolute w-[100px] h-[100px] top-14 -left-4">
                    <Image
                      className="object-cover rounded-2xl"
                      src={imagePreview || "/picture1.jpeg"}
                      height={500}
                      width={500}
                      alt="additional image"
                    />
                    <button
                      onClick={handelClose}
                      className="bg-[#e8e8e8] text-[#464646] absolute -top-1 -left-1 shadow-3xl rounded-full rotate-45"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </label>
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => {
                    setShowSearch(!showSearch)
                  }}
                                      className={cn(
                      "rounded-full transition-all flex items-center gap-2 px-3 py-1 border h-8",
                      selectedModel === 'local'
                        ? "bg-[#ff3f17]/15 border-[#ff3f17] text-[#ff3f17]"
                        : selectedModel === 'gemini'
                          ? "bg-green-500/15 border-green-500 text-green-500"
                                                        : selectedModel === 'mistral'
                                ? "bg-blue-500/15 border-blue-500 text-blue-500"
                                : selectedModel === 'qwen'
                                  ? "bg-purple-500/15 border-purple-500 text-purple-500"
                              : showSearch
                                  ? "bg-[#ff3f17]/15 border-[#ff3f17] text-[#ff3f17]"
                                  : "bg-white/5 dark:bg-black/5 border-transparent text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white"
                    )}
                >
                  <span className="text-xs font-medium">
                    {selectedModel === 'local' ? 'Local AI' : selectedModel === 'gemini' ? 'Nishu AI' : selectedModel === 'mistral' ? 'Nishu 2.0' : selectedModel === 'qwen' ? 'Nishu 3.0' : 'Select Model'}
                  </span>
                  <div className="flex flex-shrink-0 justify-center items-center w-4 h-4">
                    <motion.div
                      animate={{
                        rotate: showSearch ? 180 : 0,
                        scale: showSearch ? 1.1 : 1,
                      }}
                      whileHover={{
                        rotate: showSearch ? 180 : 15,
                        scale: 1.1,
                        transition: {
                          type: "spring",
                          stiffness: 300,
                          damping: 10,
                        },
                      }}
                      transition={{
                        type: "spring",
                        stiffness: 260,
                        damping: 25,
                      }}
                    >
                      <Globe
                        className={cn(
                          "w-4 h-4",
                          showSearch ? "text-[#ff3f17]" : "text-inherit"
                        )}
                      />
                    </motion.div>
                  </div>
                  <AnimatePresence>
                    {showSearch && (
                      <motion.span
                        initial={{ width: 0, opacity: 0 }}
                        animate={{
                          width: "auto",
                          opacity: 1,
                        }}
                        exit={{ width: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="text-sm overflow-hidden whitespace-nowrap text-[#ff3f17] flex-shrink-0"
                      >
                        {selectedModel === 'local' ? 'Local AI' : selectedModel === 'gemini' ? 'Nishu AI' : selectedModel === 'mistral' ? 'Nishu 2.0' : selectedModel === 'qwen' ? 'Nishu 3.0' : 'Select Model'}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </button>

                {/* Model Selection Dropdown */}
                {showSearch && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute bottom-full left-0 mb-2 bg-white dark:bg-black rounded-lg border border-black/10 dark:border-white/10 shadow-lg z-10 min-w-[120px]"
                  >
                    <div className="p-1">
                      <button
                        onClick={() => {
                          setSelectedModel('local')
                          setShowSearch(false)
                        }}
                        className={cn(
                          "w-full text-left px-3 py-2 rounded-md text-sm transition-colors",
                          selectedModel === 'local'
                            ? "bg-[#ff3f17]/15 text-[#ff3f17]"
                            : "text-black dark:text-white hover:bg-white/5 dark:hover:bg-black/5"
                        )}
                      >
                        <div className="flex gap-2 items-center">
                          <div className="w-2 h-2 rounded-full bg-[#ff3f17]"></div>
                          Local AI
                        </div>
                        <div className="mt-1 text-xs text-black/60 dark:text-white/60">
                          Portfolio Info
                        </div>
                      </button>
                      <button
                        onClick={() => {
                          setSelectedModel('gemini')
                          setShowSearch(false)
                        }}
                        className={cn(
                          "w-full text-left px-3 py-2 rounded-md text-sm transition-colors",
                          selectedModel === 'gemini'
                            ? "bg-green-500/15 text-green-500"
                            : "text-black dark:text-white hover:bg-white/5 dark:hover:bg-black/5"
                        )}
                      >
                        <div className="flex gap-2 items-center">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          Nishu AI
                        </div>
                        <div className="mt-1 text-xs text-black/60 dark:text-white/60">
                          Gemini 2.0 Flash (Fast)
                        </div>
                      </button>

                      <button
                        onClick={() => {
                          setSelectedModel('mistral')
                          setShowSearch(false)
                        }}
                        className={cn(
                          "w-full text-left px-3 py-2 rounded-md text-sm transition-colors",
                          selectedModel === 'mistral'
                            ? "bg-blue-500/15 text-blue-500"
                            : "text-black dark:text-white hover:bg-white/5 dark:hover:bg-black/5"
                        )}
                      >
                        <div className="flex gap-2 items-center">
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          Nishu 2.0
                        </div>
                        <div className="mt-1 text-xs text-black/60 dark:text-white/60">
                          Venice (Fast & Smart)
                        </div>
                      </button>

                      <button
                        onClick={() => {
                          setSelectedModel('qwen')
                          setShowSearch(false)
                        }}
                        className={cn(
                          "w-full text-left px-3 py-2 rounded-md text-sm transition-colors",
                          selectedModel === 'qwen'
                            ? "bg-purple-500/15 text-purple-500"
                            : "text-black dark:text-white hover:bg-white/5 dark:hover:bg-black/5"
                        )}
                      >
                        <div className="flex gap-2 items-center">
                          <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                          Nishu 3.0
                        </div>
                        <div className="mt-1 text-xs text-black/60 dark:text-white/60">
                          Mistral 7B (Fastest)
                        </div>
                      </button>



                    </div>
                  </motion.div>
                )}
              </div>

                                  {/* Simple Mistral 7B Button */}
              <button
                type="button"
                onClick={() => setSelectedModel('qwen')}
                className={cn(
                  "rounded-full transition-all flex items-center gap-2 px-3 py-1 border h-8",
                  selectedModel === 'qwen'
                    ? "bg-purple-500/15 border-purple-500 text-purple-500"
                    : "bg-white/5 dark:bg-black/5 border-transparent text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white"
                )}
              >
                <span className="text-xs font-medium">Nishu 3.0</span>
              </button>



            </div>
            <div className="absolute right-3 bottom-3">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isLoading || !value.trim()}
                className={cn(
                  "rounded-full p-2 transition-colors",
                  value && !isLoading
                    ? "bg-[#ff3f17]/15 text-[#ff3f17] hover:bg-[#ff3f17]/20"
                    : "bg-white/5 dark:bg-black/5 text-black/40 dark:text-white/40"
                )}
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
