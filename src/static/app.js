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
          // store the activity name, max participants and current participants on the card and render participants
          activityCard.setAttribute('data-activity-name', name);
          activityCard.setAttribute('data-max-participants', details.max_participants);
          activityCard.setAttribute('data-participants', JSON.stringify(details.participants || []));
          ensureParticipantsContainer(activityCard);
          renderParticipants(activityCard, details.participants || []);

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
        // update the corresponding activity card immediately
        updateCardAfterSignup(activity, email);
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

  function updateCardAfterSignup(activityName, email) {
    // find the card for this activity
    const cards = document.querySelectorAll('.activity-card');
    let card = null;
    for (const c of cards) {
      if (c.getAttribute('data-activity-name') === activityName) { card = c; break; }
    }
    if (!card) return;

    // read current participants, add email if not present
    const participants = readParticipantsFromCard(card);
    if (!participants.includes(email)) participants.push(email);
    card.setAttribute('data-participants', JSON.stringify(participants));
    renderParticipants(card, participants);

    // update availability display if present
    const maxStr = card.getAttribute('data-max-participants');
    const max = maxStr ? parseInt(maxStr, 10) : null;
    if (max !== null && !Number.isNaN(max)) {
      const spotsLeft = Math.max(0, max - participants.length);
      // find the availability paragraph
      const ps = card.querySelectorAll('p');
      for (const p of ps) {
        if ((p.textContent || '').includes('Availability')) {
          p.innerHTML = `<strong>Availability:</strong> ${spotsLeft} spots left`;
          break;
        }
      }
    }
  }

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

  // Handle participant delete clicks (event delegation)
  document.addEventListener('click', async (e) => {
    const btn = e.target.closest('.participant-delete');
    if (!btn) return;
    const li = btn.closest('li');
    if (!li) return;
    const email = btn.getAttribute('data-email');
    const card = btn.closest('.activity-card');
    const activityName = card && card.getAttribute('data-activity-name');
    if (!activityName || !email) return;

    try {
      const resp = await fetch(`/activities/${encodeURIComponent(activityName)}/participants?email=${encodeURIComponent(email)}`, { method: 'DELETE' });
      const resJson = await resp.json().catch(() => ({}));
      if (resp.ok) {
        // update UI
        const participants = readParticipantsFromCard(card).filter(p => String(p) !== String(email));
        card.setAttribute('data-participants', JSON.stringify(participants));
        renderParticipants(card, participants);
        messageDiv.textContent = resJson.message || 'Unregistered successfully';
        messageDiv.className = 'success';
        messageDiv.classList.remove('hidden');
        setTimeout(() => messageDiv.classList.add('hidden'), 4000);
      } else {
        messageDiv.textContent = resJson.detail || 'Failed to unregister';
        messageDiv.className = 'error';
        messageDiv.classList.remove('hidden');
      }
    } catch (err) {
      console.error('Error unregistering participant:', err);
      messageDiv.textContent = 'Failed to unregister. Please try again.';
      messageDiv.className = 'error';
      messageDiv.classList.remove('hidden');
    }
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
        const email = typeof p === 'string' ? p : (p && (p.email || p.emailAddress || p.email_address)) || name;
        const li = document.createElement('li');

        const avatar = document.createElement('span');
        avatar.className = 'participant-avatar';
        avatar.textContent = initials(name);

        const spanName = document.createElement('span');
        spanName.className = 'participant-name';
        spanName.textContent = name || email;

        const del = document.createElement('button');
        del.className = 'participant-delete';
        del.setAttribute('data-email', email);
        del.setAttribute('title', 'Unregister participant');
        del.textContent = '✖';

        li.appendChild(avatar);
        li.appendChild(spanName);
        li.appendChild(del);
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
