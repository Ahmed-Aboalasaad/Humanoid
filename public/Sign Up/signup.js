// Wait for the DOM to load
document.addEventListener("DOMContentLoaded", () => {
  // Select the form and the sign-up button
  const form = document.querySelector("form");
  const signupButton = document.querySelector(".signup-button");

  // Add event listener to handle form submission
  form.addEventListener("submit", async (event) => {
    event.preventDefault(); // Prevent default form submission behavior

    // Collect input values
    const username = form.querySelector("input[type='text']").value;
    const email = form.querySelector("input[type='email']").value;
    const password = form.querySelector("input[type='password']").value;

    // Validate input fields (basic validation)
    if (!username || !email || !password) {
      alert("Please fill in all fields");
      return;
    }

    // Prepare the request payload
    const payload = {
      name: username,
      email: email,
      password: password,
    };

    try {
      // Send a POST request to the signup endpoint
      const response = await fetch(
        "http://localhost:3030/humaniod/user/signup",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      // Parse the response JSON
      const data = await response.json();

      // Check the response status
      if (response.status === 201) {
        alert("User created successfully!");
        console.log("Token:", data.token); // Display the token in the console
        // Redirect to login page or another page
        window.location.href = "/login";
      } else {
        // Handle errors
        alert(data.message || "An error occurred during signup");
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Failed to sign up. Please try again later.");
    }
  });
});

document.addEventListener("DOMContentLoaded", () => {
  const createAccountLink = document.querySelector(".create-account a");
  createAccountLink.addEventListener("click", (event) => {
    event.preventDefault(); // Prevent default link behavior
    window.location.href = "/signup"; // Redirect to the Sign Up page
  });
});

document.addEventListener("DOMContentLoaded", () => {
  // Select all password toggle elements
  const passwordToggles = document.querySelectorAll(".password-toggle");

  passwordToggles.forEach((toggle) => {
    toggle.addEventListener("click", () => {
      // Find the associated password input field
      const passwordInput = toggle.previousElementSibling;

      // Toggle the input type between "password" and "text"
      const type =
        passwordInput.getAttribute("type") === "password" ? "text" : "password";
      passwordInput.setAttribute("type", type);

      // Optionally, toggle a CSS class for styling or animation
      toggle.classList.toggle("active");
    });
  });
});
