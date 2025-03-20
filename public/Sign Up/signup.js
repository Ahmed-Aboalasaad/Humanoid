document.addEventListener("DOMContentLoaded", function () {
    // Select form and input fields
    const form = document.getElementById("signupForm");
    const usernameInput = document.getElementById("username");
    const emailInput = document.getElementById("email");
    const passwordInput = document.getElementById("password");
    const confirmPasswordInput = document.getElementById("confirmPassword");

    // Password toggle buttons
    const togglePasswordBtn = document.getElementById("togglePassword");
    const toggleConfirmPasswordBtn = document.getElementById("toggleConfirmPassword");

    // Password visibility toggles
    togglePasswordBtn.addEventListener("click", function () {
        togglePasswordVisibility(passwordInput, togglePasswordBtn);
    });

    toggleConfirmPasswordBtn.addEventListener("click", function () {
        togglePasswordVisibility(confirmPasswordInput, toggleConfirmPasswordBtn);
    });

    // Function to toggle password visibility
    function togglePasswordVisibility(inputField, toggleButton) {
        const img = toggleButton.querySelector("img");
        if (inputField.type === "password") {
            inputField.type = "text";
            img.src = "./Sign Up/images/eye_opened.png";
        } else {
            inputField.type = "password";
            img.src = "./Sign Up/images/eye_closed.png";
        }
    }

    // Handle form submission with alert validation
    form.addEventListener("submit", async function (event) {
        event.preventDefault(); // Prevent default form behavior
        let isValid = true;

        // Username validation
        if (usernameInput.value.trim().length < 5) {
            alert("Username must be at least 5 characters long.");
            return;
        }

        // Email validation (Gmail only)
        const emailPattern = /^[a-zA-Z0-9._%+-]+@gmail\.com$/;
        if (!emailPattern.test(emailInput.value.trim())) {
            alert("Email must be a valid Gmail address.");
            return;
        }

        // Password validation
        if (passwordInput.value.length < 6) {
            alert("Password must be at least 6 characters long.");
            return;
        }

        // Confirm Password validation
        if (confirmPasswordInput.value !== passwordInput.value) {
            alert("Passwords do not match.");
            return;
        }

        // Prepare payload
        const formData = {
            name: usernameInput.value.trim(),
            email: emailInput.value.trim(),
            password: passwordInput.value
        };

        console.log("Signup Payload:", formData);

        try {
            // Send POST request to register the user
            const response = await fetch("http://localhost:3030/humaniod/user/signup", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(formData)
            });

            const result = await response.json();
            console.log("Signup Response:", result);

            if (response.status === 201 && result.token) {
                setAuthToken(result.token);
                alert("Signup successful! Redirecting to login.");
                window.location.href = "../Login/login.html"; // Redirect to login page
            } else {
                throw new Error(result.message || "Signup failed. Please try again.");
            }
        } catch (error) {
            console.error("Signup Error:", error);
            alert(error.message);
        }
    });

    // Save token to cookies
    function setAuthToken(token) {
        const expires = new Date();
        expires.setDate(expires.getDate() + 7); // Token expires in 7 days
        document.cookie = `authToken=${token}; expires=${expires.toUTCString()}; path=/;`;
    }

    // Optional: Add click event for login link (if dynamically handled)
    const loginLink = document.getElementById("loginLink");
    if (loginLink) {
        loginLink.addEventListener("click", (event) => {
            event.preventDefault();
            window.location.href = "../Login/login.html"; // Redirect to login page
        });
    }
});
