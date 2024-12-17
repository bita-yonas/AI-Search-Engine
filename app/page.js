"use client";
import {
  Button,
  TextField,
  Box,
  Stack,
  Typography,
  AppBar,
  Toolbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import { useState, useEffect, useRef } from "react";

export default function Home() {
  const [showChat, setShowChat] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "Hi! I'm your AI-powered assistant. How can I help you today?",
    },
  ]);
  const [message, setMessage] = useState("");
  const chatContainer = useRef(null);

  const sendMessage = async () => {
    if (!message.trim()) return; // Prevent sending empty messages
    const userMessage = { role: "user", content: message };

    setMessages((messages) => [
      ...messages,
      userMessage,
      { role: "assistant", content: "" },
    ]);

    setMessage("");

    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify([...messages, userMessage]),
    });

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let result = "";

    reader.read().then(function processText({ done, value }) {
      if (done) return;
      const text = decoder.decode(value || new Uint8Array(), { stream: true });
      result += text;
      setMessages((messages) => {
        const lastMessage = messages[messages.length - 1];
        return [
          ...messages.slice(0, -1),
          { ...lastMessage, content: lastMessage.content + text },
        ];
      });
      return reader.read().then(processText);
    });
  };

  const scrollToBottom = () => {
    if (chatContainer.current) {
      chatContainer.current.scrollTop = chatContainer.current.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleAboutOpen = () => setAboutOpen(true);
  const handleAboutClose = () => setAboutOpen(false);

  const handleGetStarted = () => setShowChat(true);

  return (
    <Box
      width="100vw"
      height="100vh"
      display="flex"
      justifyContent="center"
      alignItems="center"
      flexDirection="column"
      sx={{
        backgroundImage: 'url("/pp.jpg")',
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        color: "white",
      }}
    >
      {!showChat ? (
        <>
          <AppBar
            position="static"
            sx={{ bgcolor: "transparent", boxShadow: "none" }}
          >
            <Toolbar>
              <Typography variant="h6" color="#a3bffa" sx={{ flexGrow: 1 }}>
                AI Search Engine
              </Typography>
              <Button
                color="inherit"
                sx={{ color: "#a3bffa" }}
                onClick={handleAboutOpen}
              >
                About
              </Button>
            </Toolbar>
          </AppBar>

          <Box
            textAlign="center"
            display="flex"
            flexDirection="column"
            justifyContent="center"
            alignItems="center"
            height="80%"
          >
            <Typography
              variant="h2"
              sx={{ fontWeight: "bold", mb: 2, color: "#ffffff" }}
            >
              Welcome to{" "}
              <span style={{ color: "#a3bffa" }}>AI Search Engine</span>
            </Typography>
            <Typography variant="h6" sx={{ mb: 4, color: "#d1d5db" }}>
              Effortlessly search and explore with AI-powered insights.
            </Typography>
            <Button
              variant="contained"
              sx={{
                bgcolor: "#a3bffa",
                color: "black",
                borderRadius: "8px",
                padding: "10px 24px",
                "&:hover": { bgcolor: "#7b93d1" },
              }}
              onClick={handleGetStarted}
            >
              Get Started
            </Button>
          </Box>

          <Dialog open={aboutOpen} onClose={handleAboutClose}>
            <DialogTitle>About AI Search Engine</DialogTitle>
            <DialogContent>
              <Typography variant="body1">
                The AI Search Engine helps you explore topics and find insights
                with the power of AI. It uses advanced technology to deliver
                accurate and comprehensive information in a user-friendly
                interface.
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Developed by Bitania Yonas.
              </Typography>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleAboutClose} color="primary">
                Close
              </Button>
            </DialogActions>
          </Dialog>
        </>
      ) : (
        <>
          <Box
            width="100%"
            bgcolor="#ffffff"
            p={2}
            display="flex"
            justifyContent="space-between"
            alignItems="center"
            boxShadow="0 4px 8px rgba(0, 0, 0, 0.2)"
          >
            <Typography variant="h6" color="#1f2937">
              AI Search Engine
            </Typography>
            <Button
              sx={{
                bgcolor: "#4f46e5",
                color: "white",
                borderRadius: "8px",
                "&:hover": { bgcolor: "#4338ca" },
              }}
              onClick={handleAboutOpen}
            >
              About
            </Button>
          </Box>

          <Stack
            direction="column"
            spacing={2}
            width="100%"
            maxWidth="700px"
            flexGrow={1}
            overflow="auto"
            padding="20px"
            ref={chatContainer}
          >
            {messages.map((message, index) => (
              <Box
                key={index}
                display="flex"
                justifyContent={
                  message.role === "assistant" ? "flex-start" : "flex-end"
                }
                mb={2}
              >
                <Box
                  bgcolor={message.role === "assistant" ? "#111827" : "#e0e0e0"}
                  color={message.role === "assistant" ? "white" : "black"}
                  borderRadius="16px"
                  p={2}
                  maxWidth="75%"
                >
                  <Typography>{message.content}</Typography>
                </Box>
              </Box>
            ))}
          </Stack>

          <Stack
            direction="row"
            spacing={2}
            width="100%"
            maxWidth="700px"
            p={2}
            bgcolor="white"
            borderRadius="24px"
            boxShadow="0px 4px 12px rgba(0, 0, 0, 0.2)"
          >
            <TextField
              fullWidth
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && sendMessage()}
              placeholder="Ask something..."
            />
            <Button
              variant="contained"
              onClick={sendMessage}
              sx={{
                bgcolor: "#4f46e5",
                color: "white",
                borderRadius: "8px",
                "&:hover": { bgcolor: "#4338ca" },
              }}
            >
              Send
            </Button>
          </Stack>
        </>
      )}
    </Box>
  );
}
