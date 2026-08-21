// This array stores the conversation so the bot remembers context
let chatHistory = [];

// Helper function to create message bubbles
function appendMessage(role, text) {
  const chatBox = document.getElementById("chat-box");
  const msgDiv = document.createElement("div");
  
  // Assign class based on who is speaking
  msgDiv.className = role === "user" ? "user-message" : "bot-message";
  
  if (role === "bot") {
    // Use marked to parse AI markdown (bold, lists, etc.)
    msgDiv.innerHTML = marked.parse(text);
  } else {
    msgDiv.innerText = text;
  }
  
  chatBox.appendChild(msgDiv);
  
  // AUTO-SCROLL: Keep the latest message in view
  chatBox.scrollTop = chatBox.scrollHeight;
}

async function sendMessage() {
  const input = document.getElementById("user-input");
  const sendBtn = document.getElementById("send-btn");
  const message = input.value.trim();

  if (!message) return;

  // 1. Show User message in UI
  appendMessage("user", message);
  input.value = "";

  // 2. Add to history memory
  chatHistory.push({ role: "user", content: message });

  // 3. Disable UI while loading
  sendBtn.disabled = true;
  sendBtn.innerText = "...";

  try {
    const response = await fetch("/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: chatHistory }) // Send full history
    });

    const data = await response.json();

    // 4. Show Bot message in UI
    appendMessage("bot", data.reply);

    // 5. Add bot's reply to history memory
    chatHistory.push({ role: "assistant", content: data.reply });

  } catch (err) {
    appendMessage("bot", "Error: Could not connect to server.");
  } finally {
    // 6. Re-enable UI
    sendBtn.disabled = false;
    sendBtn.innerText = "Send";
  }
}

// Show a welcome message on load
window.onload = () => {
    appendMessage("bot", "Hi! I am your V2 Chatbot. I can remember our conversation and format text!");
};