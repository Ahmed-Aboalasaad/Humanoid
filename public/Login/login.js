// Wait for the DOM to load
document.addEventListener("DOMContentLoaded", () => {
  // Select the form and login button
  const form = document.querySelector("form");
  const loginButton = document.querySelector(".login-button");

  // Add event listener to handle form submission
  form.addEventListener("submit", async (event) => {
    event.preventDefault(); // Prevent default form submission behavior

    // Collect input values
    const email = form.querySelector("input[type='text']").value; // Assuming username field stores email
    const password = form.querySelector("input[type='password']").value;

    // Validate input fields (basic validation)
    if (!email || !password) {
      alert("Please fill in all fields");
      return;
    }

    // Prepare the request payload
    const payload = {
      email: email,
      password: password,
    };

    try {
      // Send a POST request to the login endpoint
      const response = await fetch(
        "http://localhost:3030/humaniod/user/login",
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
      if (response.ok) {
        alert("Login successful!");
        console.log("Token:", data.token); // Display the token in the console
        // Store token in localStorage or a cookie for future requests
        localStorage.setItem("authToken", data.token);
        // Redirect to another page (e.g., dashboard)
        window.location.href = "/chat";
      } else {
        // Handle errors
        console.log(data);
        alert(data.message || "Invalid credentials. Please try again.");
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Failed to log in. Please try again later.");
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
