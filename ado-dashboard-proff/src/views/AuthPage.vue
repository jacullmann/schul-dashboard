<template>
  <div class="outer-container">
    <div class="header-container">
      <WelcomeHeader @click="isWelcomeContent = true" />
    </div>

    <div class="main-container">
        <WelcomeContent v-if="isWelcomeContent" :on-start-click="showAuthForm" key="welcome"/>

        <div v-if="!isWelcomeContent" class="auth-content content" key="auth-form">
          <AuthForm />
        </div>
      <Sec  v-if="!isWelcomeContent && isSecurity" />




    </div>

    <div class="footer-container">
      <WelcomeFooter />
    </div>

  </div>
</template>

<script setup lang="ts">
import  { ref } from 'vue';

import WelcomeHeader from "./welcome/WelcomeHeader.vue";
import WelcomeFooter from "./welcome/WelcomeFooter.vue";
import AuthForm from "./welcome/AuthForm.vue";
import WelcomeContent from "./welcome/WelcomeContent.vue";
import Sec from "./welcome/Sec.vue";

const isWelcomeContent = ref<boolean>(true);

function showAuthForm() {
  isWelcomeContent.value = false;
}

</script>

<style scoped>
.outer-container {
  position: relative;
  min-height: 100vh;
  width: 100%;
  background-color: #030303;
  display: flex;
  flex-direction: column;
}

.header-container {
  width: 100%;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  position: sticky;
  top: 0;
  z-index: 100;
}

.footer-container {
  width: 100%;
  margin-top: auto;
}

.main-container {
  flex-grow: 1;
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 20px;
  box-sizing: border-box;
}

.auth-content {
  text-align: center;
  padding: 40px 0;
}
</style>