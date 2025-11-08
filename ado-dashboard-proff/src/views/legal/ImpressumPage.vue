<template>
  <div>
    <h2>Impressum</h2>
    <h3>Angaben gemäß § 5 TMG</h3>
    <p>
      Max Mustermann<br />
      Musterstraße 1<br />
      12345 Musterstadt<br />
      Deutschland
    </p>
    <h3>Kontakt</h3>
    <p>
      Telefon: +49 (0)123 456789<br />
      E-Mail: <a href="mailto:max@muster.de">max@muster.de</a>
    </p>
    <h3>Haftungsausschluss</h3>
    <p>
      Trotz sorgfältiger inhaltlicher Kontrolle übernehmen wir keine Haftung für <span @click="note" >externe Links</span>.
    </p>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
const router = useRouter()

function note() {
  router.push('/bewerten')
}

</script>