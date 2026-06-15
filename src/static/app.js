document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");
  const emailInput = document.getElementById("email");
  const signupButton = signupForm.querySelector('button[type="submit"]');
  const signupHint = document.getElementById("signup-hint");
  const authStatusPill = document.getElementById("auth-status-pill");
  const authMenuButton = document.getElementById("auth-menu-button");
  const authMenu = document.getElementById("auth-menu");
  const openLoginButton = document.getElementById("open-login-button");
  const logoutButton = document.getElementById("logout-button");
  const authModal = document.getElementById("auth-modal");
  const loginForm = document.getElementById("login-form");
  const authMessage = document.getElementById("auth-message");
  const closeAuthModalButton = document.getElementById("close-auth-modal");

  const authState = {
    authenticated: false,
    username: null,
  };

  function setMessage(target, text, className) {
    target.textContent = text;
    target.className = className;
    target.classList.remove("hidden");

    setTimeout(() => {
      target.classList.add("hidden");
    }, 5000);
  }

  function closeAuthMenu() {
    authMenu.classList.add("hidden");
    authMenuButton.setAttribute("aria-expanded", "false");
  }

  function openAuthMenu() {
    authMenu.classList.remove("hidden");
    authMenuButton.setAttribute("aria-expanded", "true");
  }

  function closeAuthModal() {
    authModal.classList.add("hidden");
    authModal.setAttribute("aria-hidden", "true");
    authMessage.classList.add("hidden");
    loginForm.reset();
  }

  function openAuthModal() {
    authModal.classList.remove("hidden");
    authModal.setAttribute("aria-hidden", "false");
    authMenu.classList.add("hidden");
    authMenuButton.setAttribute("aria-expanded", "false");
  }

  function syncAuthUi() {
    const isTeacher = authState.authenticated;

    authStatusPill.textContent = isTeacher
      ? `Teacher mode: ${authState.username}`
      : "Guest mode";

    signupHint.textContent = isTeacher
      ? "You can register or unregister students from activities."
      : "Teacher login is required to register or unregister students. Guests can still view the participant list.";

    emailInput.disabled = !isTeacher;
    activitySelect.disabled = !isTeacher;
    signupButton.disabled = !isTeacher;
    signupButton.textContent = isTeacher ? "Register Student" : "Login as Teacher";
    logoutButton.classList.toggle("hidden", !isTeacher);
    openLoginButton.classList.toggle("hidden", isTeacher);
  }

  async function fetchAuthStatus() {
    const response = await fetch("/auth/status");
    const authStatus = await response.json();

    authState.authenticated = authStatus.authenticated;
    authState.username = authStatus.username;
    syncAuthUi();
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft =
          details.max_participants - details.participants.length;

        const participantRows = details.participants
          .map(
            (email) =>
              `<li><span class="participant-email">${email}</span>${
                authState.authenticated
                  ? `<button class="delete-btn" data-activity="${name}" data-email="${email}" type="button">❌</button>`
                  : ""
              }</li>`
          )
          .join("");

        // Create participants HTML with delete icons only for teachers
        const participantsHTML =
          details.participants.length > 0
            ? `<div class="participants-section">
              <h5>Participants:</h5>
              <ul class="participants-list">
                ${participantRows}
              </ul>
            </div>`
            : `<p><em>No participants yet</em></p>`;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants-container">
            ${participantsHTML}
          </div>
        `;

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });

      // Add event listeners to delete buttons
      document.querySelectorAll(".delete-btn").forEach((button) => {
        button.addEventListener("click", handleUnregister);
      });
    } catch (error) {
      activitiesList.innerHTML =
        "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle unregister functionality
  async function handleUnregister(event) {
    const button = event.target;
    const activity = button.getAttribute("data-activity");
    const email = button.getAttribute("data-email");

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/unregister?email=${encodeURIComponent(email)}`,
        {
          method: "DELETE",
        }
      );

      const result = await response.json();

      if (response.ok) {
        setMessage(messageDiv, result.message, "success");

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        setMessage(messageDiv, result.detail || "An error occurred", "error");
      }
    } catch (error) {
      setMessage(messageDiv, "Failed to unregister. Please try again.", "error");
      console.error("Error unregistering:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!authState.authenticated) {
      openAuthModal();
      setMessage(messageDiv, "Teacher login is required before registering students.", "info");
      return;
    }

    const email = emailInput.value;
    const activity = activitySelect.value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        setMessage(messageDiv, result.message, "success");
        signupForm.reset();

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        setMessage(messageDiv, result.detail || "An error occurred", "error");
      }
    } catch (error) {
      setMessage(messageDiv, "Failed to sign up. Please try again.", "error");
      console.error("Error signing up:", error);
    }
  });

  authMenuButton.addEventListener("click", () => {
    if (authMenu.classList.contains("hidden")) {
      openAuthMenu();
    } else {
      closeAuthMenu();
    }
  });

  openLoginButton.addEventListener("click", () => {
    openAuthModal();
  });

  closeAuthModalButton.addEventListener("click", closeAuthModal);

  logoutButton.addEventListener("click", async () => {
    try {
      const response = await fetch("/auth/logout", {
        method: "POST",
      });
      const result = await response.json();

      if (response.ok) {
        authState.authenticated = false;
        authState.username = null;
        syncAuthUi();
        fetchActivities();
        setMessage(messageDiv, result.message, "success");
      } else {
        setMessage(messageDiv, result.detail || "Unable to log out", "error");
      }
    } catch (error) {
      setMessage(messageDiv, "Unable to log out. Please try again.", "error");
      console.error("Error logging out:", error);
    }
  });

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    try {
      const response = await fetch("/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });
      const result = await response.json();

      if (response.ok) {
        authState.authenticated = true;
        authState.username = result.username;
        syncAuthUi();
        closeAuthModal();
        fetchActivities();
        setMessage(messageDiv, result.message, "success");
      } else {
        setMessage(authMessage, result.detail || "Invalid teacher credentials", "error");
      }
    } catch (error) {
      setMessage(authMessage, "Login failed. Please try again.", "error");
      console.error("Error logging in:", error);
    }
  });

  document.addEventListener("click", (event) => {
    if (!authMenu.contains(event.target) && !authMenuButton.contains(event.target)) {
      closeAuthMenu();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeAuthMenu();
      closeAuthModal();
    }
  });

  // Initialize app
  fetchAuthStatus().then(fetchActivities);
});
