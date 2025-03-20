document.addEventListener("DOMContentLoaded", () => {
    // Selectors
    const loginForm = document.getElementById("loginForm") || document.querySelector("form");
    const emailInput = document.getElementById("email") || loginForm.querySelector("input[type='text']");
    const passwordInput = document.getElementById("password") || loginForm.querySelector("input[type='password']");
    const emailError = document.getElementById("emailError");
    const togglePassword = document.getElementById("togglePassword");
    const eyeIcon = document.getElementById("eyeIcon");
    const loginButton = document.getElementById("loginButton") || document.querySelector(".login-button");
    const createAccountLink = document.querySelector(".create-account a");
  
    // ✅ Password Visibility Toggle
    if (togglePassword && passwordInput && eyeIcon) {
      togglePassword.addEventListener("click", () => {
        if (passwordInput.type === "password") {
          passwordInput.type = "text";
          eyeIcon.src = "./images/eye_opened.png";
        } else {
          passwordInput.type = "password";
          eyeIcon.src = "./images/eye_closed.png";
        }
      });
    }
  
    // ✅ Email Validation (Gmail Only)
    if (emailInput && emailError) {
      emailInput.addEventListener("input", () => {
        if (!emailInput.value.endsWith("@gmail.com")) {
          emailError.style.display = "block";
        } else {
          emailError.style.display = "none";
        }
      });
    }
  
    // ✅ Form Submission and Login Handling
    loginForm.addEventListener("submit", async (event) => {
      event.preventDefault(); // Prevent default form behavior
  
      const email = emailInput.value.trim();
      const password = passwordInput.value;
  
      // Basic Validation
      if (!email || !password) {
        alert("Please fill in all required fields.");
        return;
      }
  
      if (!email.endsWith("@gmail.com")) {
        alert("Email must be a Gmail address.");
        return;
      }
  
      // Prepare payload
      const payload = { email, password };
      console.log("Login Payload:", payload);
  
      // Button feedback
      if (loginButton) loginButton.textContent = "Logging in...";
  
      try {
        // Send POST request
        const response = await fetch("http://localhost:3030/humaniod/user/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
  
        const result = await response.json();
        console.log("Login Response:", result);
  
        if (response.ok && result?.token) {
          alert("Login successful!");
          localStorage.setItem("authToken", result.token); // Save token
          window.location.href = "/chat"; // Redirect to chat page
        } else {
          alert(result.message || "Invalid credentials. Please try again.");
        }
      } catch (error) {
        console.error("Login Error:", error);
        alert("Failed to log in. Please try again later.");
      } finally {
        if (loginButton) loginButton.textContent = "Login"; // Reset button text
      }
    });
  
    // ✅ "Create Account" Link Navigation
    if (createAccountLink) {
      createAccountLink.addEventListener("click", (event) => {
        event.preventDefault(); // Prevent default anchor behavior
        window.location.href = "/signup"; // Redirect to Sign Up page
      });
    }
  });