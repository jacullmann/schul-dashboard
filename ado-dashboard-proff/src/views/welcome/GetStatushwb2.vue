<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';

let intervalId: number | undefined = undefined;

const status = ref<string>('Lade...');

const API_STATUS_URL = 'https://api.schul-dashboard.com/api/serverstatus';

async function checkServerStatus() {
  try {
    const response  = await fetch(API_STATUS_URL);

    if (response.ok) {
      const data = await response.json();


      if (data.status === 'good') {
        status.value = 'Server erreichbar';
      } else  {
        status.value = 'Serverantwort unerwartet';
      }
    } else {
      status.value = 'Serververbindung unterbrochen.';
    }

  } catch (error) {
    console.error('Verbindung zum Server konnte nicht hergestellt werden:', error);
    status.value = 'Server nicht erreichbar';
  }

}


onMounted(() => {
  intervalId = window.setInterval(checkServerStatus, 5000);
  console.log('Server-Status wird abgerufen...');
});

onUnmounted(() => {
  if (intervalId !== undefined) {
    window.clearInterval(intervalId);
    console.log('Status-Überprüfung gestoppt');
  }
});
</script>

<template>
  <div>
    <p :class="status.includes('Server erreichbar') ? 'status-good' : 'status-bad'" >{{ status }}</p>
  </div>
</template>

<style scoped>
.status-good {
  color: green;
  font-weight: bold;
}
.status-bad {
  color: red;
  font-weight: bold;
}

</style>