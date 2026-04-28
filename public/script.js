// ============================================
//   SHAVINDER NEF — Apple-Level Polish
// ============================================

// --- GLOBAL UI UPDATER ---
document.addEventListener("DOMContentLoaded", () => {
  updateCartBadge();
  updateAccountLink();
  initScrollReveal();
  initHeaderParallax();
  initSmoothLinks();
});

// ============================================
//   CART BADGE
// ============================================
function updateCartBadge() {
  const cart = JSON.parse(localStorage.getItem("wildlifeCart")) || [];
  const badge = document.getElementById("cartBadge");
  if (badge) badge.innerText = cart.length;
}

// ============================================
//   ACCOUNT DROPDOWN
// ============================================
function updateAccountLink() {
  const accountLink = document.getElementById("accountLink");
  if (!accountLink) return;

  const currentUser = JSON.parse(localStorage.getItem("wildlifeUser"));

  // Build dropdown wrapper
  const wrapper = document.createElement("div");
  wrapper.className = "account-dropdown-wrapper";

  if (currentUser) {
    const firstName = currentUser.name.split(" ")[0];
    const icon = currentUser.role === "Admin" ? "👑" : "👤";

    wrapper.innerHTML = `
      <button class="nav-item account-trigger" id="accountTrigger" aria-haspopup="true" aria-expanded="false">
        ${icon} Hi, ${firstName}
        <svg class="chevron" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
      </button>
      <div class="account-dropdown" id="accountDropdown">
        ${
          currentUser.role === "Admin"
            ? `
        <a href="admin.html" class="dropdown-item">
          <span class="dropdown-icon">⚙️</span>
          <span>Admin Dashboard</span>
        </a>
        <div class="dropdown-divider"></div>
        `
            : ""
        }
        <a href="my-orders.html" class="dropdown-item">
          <span class="dropdown-icon">📦</span>
          <span>My Orders</span>
        </a>
        <div class="dropdown-divider"></div>
        <button class="dropdown-item dropdown-logout" onclick="logoutUser()">
          <span class="dropdown-icon">🚪</span>
          <span>Log Out</span>
        </button>
      </div>
    `;
  } else {
    wrapper.innerHTML = `
      <a href="login.html" class="nav-item" id="accountTrigger">
        👤 Login / Sign Up
      </a>
    `;
  }

  accountLink.replaceWith(wrapper);

  // Toggle dropdown
  const trigger = document.getElementById("accountTrigger");
  const dropdown = document.getElementById("accountDropdown");
  if (trigger && dropdown) {
    trigger.addEventListener("click", (e) => {
      e.stopPropagation();
      const open = dropdown.classList.toggle("open");
      trigger.setAttribute("aria-expanded", open);
      trigger.classList.toggle("active", open);
    });
  }
}

function logoutUser() {
  localStorage.removeItem("wildlifeUser");
  window.location.href = "index.html";
}

// Close dropdown when clicking outside
document.addEventListener("click", () => {
  const dropdown = document.getElementById("accountDropdown");
  const trigger = document.getElementById("accountTrigger");
  if (dropdown && dropdown.classList.contains("open")) {
    dropdown.classList.remove("open");
    if (trigger) {
      trigger.setAttribute("aria-expanded", false);
      trigger.classList.remove("active");
    }
  }
});

// ============================================
//   SCROLL REVEAL
// ============================================
function initScrollReveal() {
  const targets = document.querySelectorAll(
    ".reveal, .reveal-left, .reveal-right",
  );
  if (!targets.length) return;

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add("visible");
          io.unobserve(e.target);
        }
      });
    },
    { threshold: 0.12 },
  );

  targets.forEach((el) => io.observe(el));
}

// ============================================
//   HEADER PARALLAX (subtle)
// ============================================
function initHeaderParallax() {
  const headerBg = document.querySelector(".header-bg");
  if (!headerBg) return;

  let ticking = false;
  window.addEventListener(
    "scroll",
    () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          const scrolled = window.scrollY;
          const rate = scrolled * 0.25;
          headerBg.style.transform = `scale(1) translateY(${rate}px)`;
          ticking = false;
        });
        ticking = true;
      }
    },
    { passive: true },
  );
}

// ============================================
//   SMOOTH PAGE TRANSITIONS
// ============================================
function initSmoothLinks() {
  // Add fade-in on load
  document.body.style.opacity = "0";
  document.body.style.transition = "opacity 0.4s ease";
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      document.body.style.opacity = "1";
    });
  });

  // Intercept internal link clicks
  document.querySelectorAll("a[href]").forEach((link) => {
    const href = link.getAttribute("href");
    if (
      !href ||
      href.startsWith("http") ||
      href.startsWith("#") ||
      href.startsWith("mailto")
    )
      return;

    link.addEventListener("click", (e) => {
      e.preventDefault();
      document.body.style.opacity = "0";
      setTimeout(() => {
        window.location.href = href;
      }, 320);
    });
  });
}

// ============================================
//   SIDEBAR NAVIGATION
// ============================================
function toggleDashboard() {
  document.getElementById("dashboard").classList.toggle("active");
}

// Close sidebar when clicking outside
document.addEventListener("click", (e) => {
  const dashboard = document.getElementById("dashboard");
  const menuBtn = document.querySelector(".menu-btn");
  if (!dashboard || !menuBtn) return;
  if (
    dashboard.classList.contains("active") &&
    !dashboard.contains(e.target) &&
    !menuBtn.contains(e.target)
  ) {
    dashboard.classList.remove("active");
  }
});

// ============================================
//   GALLERY MODAL LOGIC
// ============================================
let currentImgIndex = 0;
let allImages = [];

document.addEventListener("DOMContentLoaded", () => {
  allImages = Array.from(document.querySelectorAll(".gallery img"));
});

function openModal(src) {
  const modal = document.getElementById("modal");
  const modalImg = document.getElementById("modalImg");

  currentImgIndex = allImages.findIndex((img) => img.src === src);

  modal.style.display = "flex";
  // Force reflow for animation
  modal.offsetHeight;
  modalImg.src = src;

  // Prevent body scroll
  document.body.style.overflow = "hidden";
}

function changeImage(step) {
  if (allImages.length === 0) return;

  currentImgIndex += step;
  if (currentImgIndex >= allImages.length) currentImgIndex = 0;
  if (currentImgIndex < 0) currentImgIndex = allImages.length - 1;

  const modalImg = document.getElementById("modalImg");
  // Quick fade swap
  modalImg.style.opacity = "0";
  modalImg.style.transform =
    step > 0 ? "translateX(20px)" : "translateX(-20px)";
  modalImg.style.transition = "opacity 0.2s ease, transform 0.2s ease";

  setTimeout(() => {
    modalImg.src = allImages[currentImgIndex].src;
    modalImg.style.opacity = "1";
    modalImg.style.transform = "translateX(0)";
  }, 180);
}

function closeModal() {
  const modal = document.getElementById("modal");
  modal.style.display = "none";
  document.body.style.overflow = "";
}

// Keyboard Navigation
document.addEventListener("keydown", (e) => {
  const modal = document.getElementById("modal");
  if (modal && modal.style.display === "flex") {
    if (e.key === "ArrowRight") changeImage(1);
    if (e.key === "ArrowLeft") changeImage(-1);
    if (e.key === "Escape") closeModal();
  }
});

// Click outside modal image to close
document.addEventListener("click", (e) => {
  const modal = document.getElementById("modal");
  if (modal && e.target === modal) closeModal();
});

// ============================================
//   CART LOGIC
// ============================================
let cart = JSON.parse(localStorage.getItem("wildlifeCart")) || [];

function addToCart() {
  const imageUrl = document.getElementById("modalImg").src;
  const size = document.getElementById("printSize").value;
  const finish = document.getElementById("paperFinish").value;

  const item = { id: Date.now(), imageUrl, size, finish };

  let cart = JSON.parse(localStorage.getItem("wildlifeCart")) || [];
  cart.push(item);
  localStorage.setItem("wildlifeCart", JSON.stringify(cart));

  updateCartBadge();
  bumpBadge();

  // Subtle feedback
  const btn = event?.target;
  if (btn) {
    const original = btn.innerText;
    btn.innerText = "✓ Added!";
    btn.style.background = "#2a9d8f";
    setTimeout(() => {
      btn.innerText = original;
      btn.style.background = "";
    }, 1500);
  }
}

function bumpBadge() {
  const badge = document.getElementById("cartBadge");
  if (!badge) return;
  badge.classList.remove("badge-bump");
  void badge.offsetWidth; // reflow
  badge.classList.add("badge-bump");
}

function buyNow() {
  addToCart();
  // Small delay so badge bump is visible
  setTimeout(() => {
    window.location.href = "checkout.html";
  }, 200);
}
