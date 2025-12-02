<script setup lang="ts">
import Special from "./Special.vue";
import G from "./G.vue";
import Line from './Line.vue'
import { ArrowDown } from 'lucide-vue-next'
import NewMainButton from "./NewMainButton.vue";

defineProps<{
  onStartClick: () => void;
  onMoreInfoClick: () => void;
}>();
</script>

<template>
  <div class="welcome-section">
    <div class="visual-container">
      <Special class="svg-placeholder" />
    </div>

    <div class="text-content">
      <h1 class="headline">Schule im Überblick</h1>
      <p class="subline">
        Alle Infos zu jeder Zeit in deiner Hosentasche.
        Kollaborativ und
        <span class="free"><span class="line-span">komplett kostenfrei <Line class="line"/></span> </span>.
      </p>

      <div class="action-buttons">
        <button class="action-btn secondary arrow-hover-effect border" @click="onMoreInfoClick">
          <span class="arrow-wrapper">
            Mehr erfahren
            <ArrowDown class="arrow-icon original-arrow" :size="20"/>
            <ArrowDown class="arrow-icon replacement-arrow" :size="20"/>
          </span>
        </button>

        <NewMainButton @click="onStartClick" class="border" />
      </div>
    </div>

  </div>
</template>

<style scoped>

.line {
  height: 12px;
  width: 100%;
  position: absolute;
  bottom: -5px;
  left: 0;
}
.line-span {
  display: inline-block;
  position: relative;
}
.welcome-section {
  display: flex;
  flex-direction: row;
  align-items: center;
  max-width: 1400px;
  width: 90%;
  margin: 0 auto;
  min-height: calc(100vh - 70px - 50px - 2rem);
  gap: 40px;
  padding: 40px 0;
}

.visual-container {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  min-width: 300px;
}

.svg-placeholder {
  width: 100%;
  max-width: 600px;
  height: auto;
  min-height: 400px;
  border-radius: 20px;
  color: white;
  font-size: 1.5rem;
  font-weight: bold;
  display: flex;
  justify-content: center;
  align-items: center;;
}

.text-content {
  flex: 1;
  max-width: 500px;
  color: white;
}

.headline {
  font-size: 7rem;
  font-weight: 600;
  line-height: 1.1;
  margin-bottom: 24px;
  letter-spacing: -0.05em;
  text-align: right;
}

.subline {
  font-size: 1.25rem;
  line-height: 1.6;
  margin-bottom: 32px;
  color: #c0c0c0;
  text-align: right;

}


.free {
  font-weight: 600;
  color: #fff;
}

.action-buttons {
  display: flex;
  gap: 20px;
  margin-top: 30px;
  justify-content: flex-end;
}

.action-btn {
  padding: 14px 30px;
  border-radius: 12px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  min-width: 180px;
  position: relative;
  overflow: hidden;
}


.secondary {
  border: 2px solid transparent;
  background: transparent;
  color: var(--text);
}

.secondary:hover {
}
.arrow-hover-effect {
  display: flex;
  align-items: center;
  justify-content: center;
}

.arrow-wrapper {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  position: relative;
  padding-right: 25px;
}

.arrow-icon {
  width: 20px;
  height: 20px;
  position: absolute;
  right: 0;
  color: white;
  top: 0;
  transition: transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94), opacity 0.3s;
}
.replacement-arrow {
  transform: translateY(calc(-50% - 100% - 10px));
  opacity: 0;
}

.arrow-hover-effect:hover .original-arrow {
  transform: translateY(calc(-50% + 100% + 10px));
  opacity: 0;
}

.arrow-hover-effect:hover .replacement-arrow {
  transform: translateY(0);
  opacity: 1;
}

@media (max-width: 992px) {
  .welcome-section {
    flex-direction: column;
    text-align: center;
    padding: 20px 0;
  }

  .text-content {
    max-width: 100%;
    order: 2;
  }

  .visual-container {
    order: 1;
  }

  .headline {
    font-size: 3rem;
    text-align: center;
  }

  .subline {
    font-size: 1.1rem;
    text-align: center;
  }

  .action-buttons {
    justify-content: center;
  }
}

@media (max-width: 576px) {
  .headline {
    font-size: 2.5rem;
  }
  .action-buttons {
    flex-direction: row;
    gap: 5px;
  }
  .action-btn {
    padding: 0 0;
    min-width: inherit;
  }
  .secondary, .primary {
    padding: 12px 14px 12px 14px;
    font-size: 1rem;
  }
  .arrow-wrapper {
    padding-right: 20px;
  }
  .arrow-icon {
    width: 16px;
    height: 16px;
  }
}
.border {
  /*border: 1px solid red;*/
}
</style>