document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

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

        const spotsLeft = details.max_participants - details.participants.length;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
        `;

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();

  document.querySelectorAll('.activity-card').forEach(card => {
    ensureParticipantsContainer(card);
    renderParticipants(card, readParticipantsFromCard(card));
  });

  document.addEventListener('submit', (e) => {
    const form = e.target.closest('.signup-form') || e.target.closest('form.signup-form');
    if (!form) return;
    e.preventDefault();
    const card = form.closest('.activity-card');
    if (!card) return;
    const nameInput = form.querySelector('input[name="name"]') || form.querySelector('input[type="text"]');
    const name = (nameInput && nameInput.value.trim()) || '';
    if (!name) return;

    const participants = readParticipantsFromCard(card);
    participants.push(name);
    card.setAttribute('data-participants', JSON.stringify(participants));
    renderParticipants(card, participants);
    if (nameInput) nameInput.value = '';
  });

  function ensureParticipantsContainer(card) {
    let container = card.querySelector('.participants');
    if (!container) {
      container = document.createElement('div');
      container.className = 'participants empty';
      container.innerHTML = '<h5>Participants</h5><ul class="participants-list"><li>No participants yet</li></ul>';
      const avail = card.querySelector('.availability');
      if (avail && avail.parentNode) avail.parentNode.insertBefore(container, avail.nextSibling);
      else card.appendChild(container);
    } else if (!container.querySelector('.participants-list')) {
      container.innerHTML = '<h5>Participants</h5><ul class="participants-list"><li>No participants yet</li></ul>';
    }
  }

  function readParticipantsFromCard(card) {
    const attr = card.getAttribute('data-participants');
    if (attr) {
      try { return JSON.parse(attr) || []; } catch { return attr.split(',').map(s=>s.trim()).filter(Boolean); }
    }
    const script = card.querySelector('script[type="application/json"].participants-data');
    if (script) {
      try { return JSON.parse(script.textContent || script.innerText) || []; } catch {}
    }
    const names = card.querySelectorAll('.participants-list .participant-name');
    if (names && names.length) return Array.from(names).map(n => n.textContent.trim()).filter(Boolean);
    return [];
  }

  function renderParticipants(card, participants) {
    ensureParticipantsContainer(card);
    const container = card.querySelector('.participants');
    const list = container.querySelector('.participants-list');
    list.innerHTML = '';

    if (Array.isArray(participants) && participants.length) {
      container.classList.remove('empty');
      participants.forEach(p => {
        const name = typeof p === 'string' ? p : (p && (p.name || `${p.first||''} ${p.last||''}`).trim()) || '';
        const li = document.createElement('li');

        const avatar = document.createElement('span');
        avatar.className = 'participant-avatar';
        avatar.textContent = initials(name);

        const spanName = document.createElement('span');
        spanName.className = 'participant-name';
        spanName.textContent = name;

        li.appendChild(avatar);
        li.appendChild(spanName);
        list.appendChild(li);
      });
    } else {
      container.classList.add('empty');
      list.innerHTML = '<li>No participants yet</li>';
    }
  }

  function initials(name) {
    return (String(name || '').split(/\s+/).map(n => n[0] || '').slice(0,2).join('') || '?').toUpperCase();
  }
});
