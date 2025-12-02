<template>
  <section class="bonito-grid-section">
    <div class="flex1">
      <!--<h2>
        Warum Schul-Dashboard?
      </h2>-->
    </div>
    <div class="bonito-grid">

      <div class="grid-item span-2-cols">
        <h3 class="item-title"><span class="title-f"><Compass size="18px" />Flexibilität</span></h3>
        <p class="item-text">
          Mit dem digitalen Dashboard hast du weniger Stress. Ob zuhause, in der U-Bahn, in der Schule oder im Urlaub, kurz bevor die Schule wieder anfängt – du weißt immer Bescheid.
        </p>
      </div>

      <div class="grid-item">
        <h3 class="item-title"><span class="title-f"><Zap size="18px" />Dein Lern-Gamechanger</span></h3>
        <p class="item-text">
          Verwandle deinen öden, ätzenden, stressigen Schulalltag: Weniger Stress, bessere Organisation. Du hast alles, was du brauchst, immer dabei!
        </p>
      </div>

      <div class="grid-item">
        <h3 class="item-title"><span class="title-f"><Palette size="18px" />Individuelle Anpassung</span></h3>
        <p class="item-text">
          Passe deine Benutzeroberfläche ganz nach deinen Wünschen an. Niemand hat dir vorzuschreiben, wie dein Dashboard aussehen soll.
        </p>
      </div>

      <div class="grid-item">
        <h3 class="item-title"><span class="title-f"><ScanEye size="18px" />Alles auf einen Blick</span></h3>
        <p class="item-text">
          Ein Blick auf das Handy, und du weißt schon, was du zu tun hast. Verliere nie wieder den Überblick!
        </p>
      </div>

      <div class="grid-item">
        <h3 class="item-title"><span class="title-f"><Layers size="18px" />Erweiterte Funktionen</span></h3>
        <p class="item-text">
          Es warten zahlreiche weitere Funktionen auf dich. Wir passen uns immer an die aktuellen Gegebenheiten an und entwickeln neue Lösungen!
        </p>
      </div>

      <div class="grid-item">
        <h3 class="item-title"><span class="title-f"><Tablet size="18px" />Modern</span></h3>
        <p class="item-text">
          Anstatt alles auf Papier festzuhalten, kannst du nun alles digital überblicken. Kein Papiermüll, keine verlorenen Zettel mehr!
        </p>
      </div>

      <div class="grid-item">
        <h3 class="item-title"><span class="title-f"><MessageCircle size="18px" />Support</span></h3>
        <p class="item-text">
          Bei Fragen, Unklarheiten oder Anmerkungen kannst du uns jederzeit kontaktieren. Wir nehmen jede Kritik gerne an und helfen gerne weiter.
        </p>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { Zap, Compass, Palette, ScanEye, Layers, Tablet, MessageCircle } from 'lucide-vue-next'
</script>

<style scoped>
.title-f {
  display: flex;
  justify-content: flex-start;
  align-items: center;
  flex-direction: row;
  gap: 10px;
}
.flex1 {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  margin-bottom: 0.5rem;

}
.bonito-grid-section {
  padding:5rem 1.5rem;
}

.bonito-grid {
  max-width: 1400px;
  margin: 0 auto;
  display: grid;
  gap: 1.5rem;
  grid-template-columns: repeat(
    auto-fit,
    minmax(280px, 1fr)
  );
  grid-auto-rows: minmax(100px, auto);
}
.grid-item {
  background-color: var(--llbg);
  border-radius: 16px;
  padding: 1.75rem;
  border: 1px solid var(--border);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  height: 350px;
  cursor: pointer;

}

.grid-item:hover {
  border: 1px solid var(--border2);
}
.grid-item:active {
  border: 1px solid var(--lp);
}

.item-title {
  font-size: 1.2rem;
  margin-top: 0;
  margin-bottom: 0.75rem;
}

.item-text {
  color: var(--sub2);
  font-size: 1rem;
  line-height: 1.6;
}
.span-2-cols {
  grid-column: span 2;
}

@media (max-width: 1250px) {
  .bonito-grid {
    grid-template-columns: 1fr 1fr;
  }

}
@media (max-width: 768px) {
  .span-2-cols{
    grid-column: span 1;
    grid-row: span 1;
  }
  .bonito-grid {
    grid-template-columns: 1fr;
  }
  .item-title {
    font-size: 1.1rem;
  }
  .item-text {
    font-size: 0.8rem;
  }
  .grid-item {
    height: auto;
  }
}
</style>