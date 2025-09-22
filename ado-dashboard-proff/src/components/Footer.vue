<template>
  <footer class="footer">
    <div class="footer-container container">
      <div class="footer-columns">
        <div class="footer-section">
          <h3>Bewertungen</h3>
          <p>Teile deine Erfahrungen und sorge für mehr Transparenz in der Community.</p>
        </div>

        <div class="footer-section">
          <h3>Nützliche Links</h3>
          <router-link to="/" class="footer-link">Dashboard</router-link>
          <router-link to="/bewerten" class="footer-link">Bewerten</router-link>
          <router-link to="/impressum-&-datenschutz" class="footer-link">Datenschutz & Impressum</router-link>
        </div>

        <div class="footer-section">
          <h3>Kontakt</h3>
          <p>support@gmail.com</p>
          <p>Modersohhhhnstrasse</p>
        </div>
      </div>
    </div>

    <div class="footer-bottom">
      <div class="container footer-bottom-content">
        <p>© {{ year }} — Alle Rechte vorbehalten.</p>
        <router-link to="/admin" class="admin-login-link">Admin-Login</router-link>
      </div>
    </div>
  </footer>
</template>

<script setup lang="ts">
const year = new Date().getFullYear();
</script>

<style scoped>
.footer {
  background-color: #1a1a1a;
  color: #b0b0b0;
  padding-top: 2rem;
  border-top: 1px solid #333;
}

.footer-container {
  padding-bottom: 2rem;
}

.footer-columns {
  display: flex;
  justify-content: flex-start;
  gap: 3rem;
  flex-wrap: wrap;
}

.footer-section {
  flex-basis: 200px;
  flex-grow: 1;
}

.footer-section h3 {
  color: #fff;
  font-size: 1.2rem;
  margin-bottom: 1rem;
}

.footer-section p {
  font-size: 0.9rem;
  line-height: 1.6;
}

.footer-link {
  display: block;
  color: #b0b0b0;
  text-decoration: none;
  margin-bottom: 0.5rem;
  transition: color 0.3s ease;
}

.footer-link:hover {
  color: #fff;
}

.footer-bottom {
  border-top: 1px solid #333;
  padding: 1rem 0;
  font-size: 0.8rem;
}

.footer-bottom-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.admin-login-link {
  color: #b0b0b0;
  text-decoration: none;
  transition: color 0.3s ease;
}

.admin-login-link:hover {
  color: #bd34fe;
}

/* Responsive Design */
@media (max-width: 768px) {
  .footer-columns {
    flex-direction: column;
    gap: 1.5rem;
    text-align: left; /* Wichtig: Text bleibt linksbündig */
  }

  .footer-bottom-content {
    flex-direction: column;
    align-items: flex-start; /* Wichtig: Inhalt bleibt linksbündig */
    gap: 0.5rem;
  }
}
</style>