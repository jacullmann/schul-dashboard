<template>
  <footer class="footer">
    <div class="footer-container container">
      <div class="footer-section">
        <h3>Bewertungen</h3>
        <p>Erfahrungen teilen und Transparenz schaffen.</p>
      </div>
      <div class="footer-section">
        <h3>Links</h3>
        <router-link to="/" class="footer-link">Übersicht</router-link>
        <router-link to="/hausaufgaben" class="footer-link">Hausaufgaben</router-link>
        <router-link to="/impressum-&-datenschutz" class="footer-link">Datenschutz & Impressum</router-link>
      </div>
      <div class="footer-section">
        <h3>Kontakt</h3>
        <p>support@gmail.com</p>
        <p>Modersohhhhnstrasse</p>
      </div>
    </div>
    <div class="footer-bottom">
      <p>
        © {{ year }} — Alle Rechte vorbehalten.
        <span class="admin-login-link">
          <router-link to="/admin">Admin-Login</router-link>
        </span>
      </p>
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
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 2rem;
  padding-bottom: 2rem;
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
  text-align: center;
  border-top: 1px solid #333;
  padding: 1rem 0;
  font-size: 0.8rem;
}

.admin-login-link a {
  color: #b0b0b0;
  text-decoration: none;
  transition: color 0.3s ease;
  margin-left: 1rem;
}

.admin-login-link a:hover {
  color: #bd34fe;
}

/* Responsive Design */
@media (max-width: 768px) {
  .footer-container {
    grid-template-columns: 1fr;
    text-align: center;
  }
}
</style>
