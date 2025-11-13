import { useNavigate } from "react-router-dom";
import "./chat.css";
import axios from "axios";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

function Chat() {
  const [userInput, setUserInput] = useState("");
  const [file, setFile] = useState([]);
  const [includeServerFile, setIncludeServerFile] = useState(false);
  const fileInputRef = useRef(null);
  const [messagetext, setmessagetext] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoggedin, setloggedin] = useState(false);
  const [istyping, setistyping] = useState(false);
  const [name, setName] = useState("");
  const fovmessage = useRef(null);
  const navigate = useNavigate();
  const cancelRequestRef = useRef(null);
  const typewritingRef = useRef(null);
  const stopTypingRef = useRef(false);
  const [createfile, setcreatefile] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const dragCounter = useRef(0);

  const email = localStorage.getItem("email");
  const googleemail = localStorage.getItem("googleemail");
  const userid = email || googleemail;

  useEffect(() => {
    const isuserinthesystem = localStorage.getItem("keepLoggedIn");
    if (isuserinthesystem) {
      setloggedin(true);
      setName(localStorage.getItem("googlename") || "");
    } else {
      setloggedin(false);
    }
  }, [isLoggedin, name]);

  // Fetch previous chat on login
  useEffect(() => {
    const fetchPreviousMessages = async () => {
      if (!userid) return;
      try {
        const response = await axios.get(`https://malan-ai-db.vercel.app/api/chat/${userid}`);
        if (response.data && response.data.messages) {
          setmessagetext(response.data.messages);
        }
      } catch (err) {
        console.error("Error fetching previous chat:", err);
      }
    };

    if (isLoggedin) fetchPreviousMessages();
  }, [isLoggedin, userid]);

  const logout = () => {
    localStorage.clear();
    navigate("/login");
  };

  const stopgenerate = () => {
    stopTypingRef.current = true;

    if (cancelRequestRef.current) {
      cancelRequestRef.current.abort();
      cancelRequestRef.current = null;
    }

    if (typewritingRef.current) {
      clearInterval(typewritingRef.current);
      typewritingRef.current = null;
    }

    setmessagetext((prev) => {
      const newMessages = [...prev];
      const last = newMessages[newMessages.length - 1];
      if (last?.sender === "Bot" && last.text.length > 0 && !last.text.endsWith("...")) {
        last.text = last.text.trimEnd() + "...";
      }
      return newMessages;
    });

    setistyping(false);
    setIsLoading(false);
  };

  const deletefile = (index) => setFile(prev => prev.filter((_, i) => i !== index));

  const send = async () => {
    if (userInput.trim() === "" && file.length === 0) return;
    if (!userid) {
      console.error("No user ID found, cannot save message");
      return;
    }

    stopTypingRef.current = false;
    setIsLoading(true);

    // Show user's message immediately
    const userMessageObj = {
      sender: "user",
      text: userInput,
      files: file.map(f => ({ name: f.name })),
    };
    setmessagetext(prev => [...prev, userMessageObj]);

    // Save user message to DB
    try {
      await axios.post("https://malan-ai-db.vercel.app/api/chat", {
        id: userid,
        userchatmessage: [userMessageObj],
      });
    } catch (err) {
      console.error("Error saving user message:", err);
    }

    const controller = new AbortController();
    cancelRequestRef.current = controller;
    const signal = controller.signal;

    let fetchOptions = { method: "POST", signal };

    if (file.length > 0) {
      const form = new FormData();
      form.append("message", userInput);
      file.forEach(f => form.append("file", f));
      if (includeServerFile) form.append("includeServerFile", "true");
      if (createfile) form.append("createfile", "true");
      fetchOptions.body = form;
    } else {
      fetchOptions.headers = { "Content-Type": "application/json" };
      fetchOptions.body = JSON.stringify({
        message: userInput,
        includeServerFile: includeServerFile ? "true" : "false",
        createfile: createfile ? "true" : "false",
      });
    }

    try {
      const resp = await fetch("https://malan-ai-server.vercel.app/api/chat", fetchOptions);

      if (!resp.ok) {
        const errBody = await resp.json().catch(() => ({}));
        throw new Error(errBody.error || `Server returned ${resp.status}`);
      }

      const contentType = resp.headers.get("Content-Type");

      // File response
      if (contentType && contentType.includes("text/plain")) {
        const blob = await resp.blob();
        const fileName =
          resp.headers.get("Content-Disposition")?.match(/filename="(.+)"/)?.[1] || "Malan-Ai.txt";
        const fileURL = window.URL.createObjectURL(blob);

        const botFileMessage = {
          sender: "Bot",
          text: "Your File is here",
          fileDownload: { name: fileName, url: fileURL },
        };

        setmessagetext(prev => [...prev, botFileMessage]);
        await axios.post("https://malan-ai-db.vercel.app/api/chat", {
          id: userid,
          userchatmessage: [botFileMessage],
        });

        setistyping(false);
        setIsLoading(false);
        setFile([]);
        setUserInput("");
        return;
      }

      // Normal bot text reply
      const data = await resp.json();
      const botReply = data.reply || "No response from server";

      setistyping(true);
      let index = 0;
      const typingSpeed = 30;

      setmessagetext(prev => [...prev, { sender: "Bot", text: "" }]);

      // Bot typing animation
      typewritingRef.current = setInterval(() => {
        if (stopTypingRef.current) {
          clearInterval(typewritingRef.current);
          typewritingRef.current = null;
          setistyping(false);
          return;
        }

        index++;
        setmessagetext(prev => {
          const updated = [...prev];
          const lastMsg = updated[updated.length - 1];
          if (lastMsg.sender === "Bot") lastMsg.text = botReply.slice(0, index);
          return updated;
        });

        if (index >= botReply.length) {
          clearInterval(typewritingRef.current);
          typewritingRef.current = null;
          setistyping(false);

          const botMessageObj = { sender: "Bot", text: botReply };
          // Save bot message to DB
          axios.post("https://malan-ai-db.vercel.app/api/chat", {
            id: userid,
            userchatmessage: [botMessageObj],
          }).catch(err => console.error("Error saving AI message:", err));
        }
      }, typingSpeed);

    } catch (err) {
      if (err.name === "AbortError") return;
      console.error("chat error", err);
      setmessagetext(prev => [...prev, { sender: "Bot", text: "Error: could not reach chat server." }]);
      setistyping(false);
    } finally {
      setIsLoading(false);
      if (!stopTypingRef.current) setUserInput("");
      setFile([]);
    }
  };

  // Drag & Drop
  useEffect(() => {
    const handleDragEnter = (e) => { e.preventDefault(); e.stopPropagation(); dragCounter.current++; setIsDragging(true); };
    const handleDragLeave = (e) => { e.preventDefault(); e.stopPropagation(); dragCounter.current--; if (dragCounter.current === 0) setIsDragging(false); };
    const handleDrop = (e) => { e.preventDefault(); e.stopPropagation(); dragCounter.current = 0; setIsDragging(false); setFile(prev => [...prev, ...Array.from(e.dataTransfer.files)]); };

    window.addEventListener("dragenter", handleDragEnter);
    window.addEventListener("dragleave", handleDragLeave);
    window.addEventListener("dragover", (e) => { e.preventDefault(); e.stopPropagation(); });
    window.addEventListener("drop", handleDrop);

    return () => {
      window.removeEventListener("dragenter", handleDragEnter);
      window.removeEventListener("dragleave", handleDragLeave);
      window.removeEventListener("dragover", (e) => e.preventDefault());
      window.removeEventListener("drop", handleDrop);
    };
  }, []);

  // Auto scroll
  useEffect(() => {
    const container = fovmessage.current?.parentElement;
    if (!container) return;
    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 40;
    if (isNearBottom) fovmessage.current.scrollIntoView({ behavior: "smooth" });
  }, [messagetext, istyping]);

  return (
    <>
      <div className="head">
        <div className="row"><h1 className="h1">MaLan-AI</h1></div>
        <div className="loginpage">
          <div className="row">
            {isLoggedin ? (
              <>
                <h1 className="h1pf1">{localStorage.getItem("email")}</h1>
                <h1 className="h1pf">{localStorage.getItem("googleusername")}</h1>
                <button className="gotologinpage" onClick={logout}>Logout</button>
              </>
            ) : (
              <>
                <button className="gotologinpage" onClick={() => navigate("/")}>Login</button>
                <button className="gotosignpage" onClick={() => navigate("/signup")}>Sign Up</button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="container">
        <div className="chat-window">
          <div className="messages">
            <AnimatePresence>
              {messagetext.map((msg, index) => (
                <motion.div key={index}
                  initial={{ z: 100, opacity: 0 }}
                  animate={{ y: 0, opacity: 1, scale: 1.05 }}
                  exit={{ z: 100, opacity: 0, scale: 1 }}
                  transition={{ type: "spring", stiffness: 800, damping: 25, mass: 1 }}
                  className={msg.sender === "user" ? "usermessage" : "chatmessage"}
                >
                  <p style={{ whiteSpace: "pre-wrap" }}>
                    {msg.text}
                    {msg.files && msg.files.map((f, i) => <span key={i} className="filename">📎 {f.name}</span>)}
                    {msg.fileDownload && (
                      <div className="download-link">
                        📁 <a href={msg.fileDownload.url} download={msg.fileDownload.name} target="_blank" rel="noopener noreferrer">
                          Download {msg.fileDownload.name}
                        </a>
                      </div>
                    )}
                  </p>
                </motion.div>
              ))}
            </AnimatePresence>
            {isLoading && !istyping && (
              <div className="chatmessage bot-typing">
                <div className="typing-dots"><span></span><span></span><span></span></div>
              </div>
            )}
            <div ref={fovmessage}></div>
          </div>

          <div className="row1">
            <h1 className="copyright">@Copyright 2025 MaLan-AI</h1>
            <div className="input-area">
              {isLoggedin ? (
                <>
                  <label className="checkbox">
                    <input type="checkbox" checked={createfile} onChange={(e) => setcreatefile(e.target.checked)} />
                    Create file
                  </label>
                  <div className="input-row">
                    <input
                      className="input1"
                      type="text"
                      value={userInput}
                      onChange={(e) => setUserInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && (userInput.trim() !== "" || file.length > 0) && !isLoading) {
                          if (istyping) stopgenerate(); else send();
                          setTimeout(() => fovmessage.current?.scrollIntoView({ behavior: "smooth" }), 100);
                        }
                      }}
                      placeholder="Ask Anything..."
                    />
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={(e) => {
                        if (e.target.files.length > 0) setFile(prev => [...prev, ...Array.from(e.target.files)]);
                        setTimeout(() => fovmessage.current?.scrollIntoView({ behavior: "smooth" }), 100);
                      }}
                      multiple
                      style={{ display: "none" }}
                    />
                    <button className="upload-btn" onClick={() => fileInputRef.current?.click()}>📎</button>
                    <button className="button" onClick={() => { if (istyping) stopgenerate(); else send(); setTimeout(() => fovmessage.current?.scrollIntoView({ behavior: "smooth" }), 100); }}
                      disabled={(userInput.trim() === "" && file.length === 0) || isLoading}>
                      {istyping ? <div className="circle"></div> : "Send"}
                    </button>
                  </div>

                  {isDragging && <div className="drag-overlay"><div className="drop-zone"><p>📎Drop files here to upload...</p></div></div>}
                  {file.length > 0 && <div className="files-container">{file.map((f, i) => (<div key={i}><p className="filename">{f.name}</p><button className="deletebutton" onClick={() => deletefile(i)}>x</button></div>))}</div>}
                </>
              ) : <h1 className="warning">Please Log In or SignUp to continue</h1>}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default Chat;
