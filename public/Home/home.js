// Select the buttons
const loginButton = document.querySelector(".button.outline");
const signUpButton = document.querySelector(".button.solid");
const chatButton = document.querySelector(".gochat");

// Add event listener for the "Log in" button
loginButton.addEventListener("click", () => {
  window.location.href = "/login";
});

// Add event listener for the "Sign Up" button
signUpButton.addEventListener("click", () => {
  window.location.href = "/signup";
});

// Add event listener for the "Chat" button
chatButton.addEventListener("click", () => {
  window.location.href = "/chat/";
});
