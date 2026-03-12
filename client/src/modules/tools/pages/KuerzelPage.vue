<script setup lang="ts">
import { ArrowLeftRight } from 'lucide-vue-next'
import InfoPop from '@/common/components/InfoModalCenter.vue'
import { useI18n } from 'vue-i18n'
import { useKuerzel } from '@/modules/tools/composables/useKuerzel'

const { t, tm } = useI18n()

const {
  mode,
  inputValue,
  outputValue,
  suggestions,
  isRotated,
  currentPlaceholder,
  otherPlaceholder,
  applySuggestion,
  toggleMode,
} = useKuerzel()
</script>

<template>
  <div class="card">
    <div class="card-top">
      <h2 style="margin-bottom: 16px" class="title-inf">
        {{ t('school.tables.abbr.title') }}
        <InfoPop :tooltip="t('school.tables.abbr.infopop.tooltip')" :title="t('school.tables.abbr.title')">
          <p style="margin-top: 0;">{{ t('school.tables.abbr.infopop.description') }}</p>

          <template v-for="(section, index) in tm('school.tables.abbr.infopop.sections')" :key="index">
            <h3 v-html="section.title"></h3>
            <p v-html="section.text"></p>
          </template>

          <div class="info-img-container">
            <img style="margin-bottom: 16px;" alt="Bild" class="info-img" src="https://res.cloudinary.com/dwysdpvcm/image/upload/v1765474358/K%C3%BCrzelfinder_Grafik_vw3do2.webp" />
          </div>
        </InfoPop>
      </h2>
    </div>

    <div class="row">
      <div class="col">
        <small class="nwer">{{ mode==='shortToName' ? 'Kürzel' : 'Name' }}</small>
        <input
            v-model="inputValue"
            class="input"
            :placeholder="currentPlaceholder"
        />

        <div v-if="mode==='nameToShort' && suggestions.length > 0 && !outputValue" class="suggestion mobile">
          {{ t('school.tables.abbr.didYouMean1') }}
          <span
              v-for="(s, idx) in suggestions"
              :key="idx"
              @click="applySuggestion(s)"
              class="suggestion-link"
          >
              {{ s.title ? t(`global.titles.${s.title}`) : '' }} {{ s.name }}<span v-if="Number(idx) < suggestions.length - 1">,</span>
            </span>
          {{ t('school.tables.abbr.didYouMean2') }}
        </div>
      </div>

      <div class="switch-col">
        <button
            class="switch-btn"
            :class="{ rotated: isRotated }"
            @click="toggleMode"
        >
          <ArrowLeftRight class="switch-icon" />
        </button>
      </div>

      <div class="col">
        <small class="nwer">{{ mode==='shortToName' ? t('school.tables.abbr.name') : t('school.tables.abbr.abbr') }}</small>
        <input
            class="input"
            :value="outputValue"
            readonly
            :placeholder="inputValue ? '' : otherPlaceholder"
        />
      </div>
    </div>

    <div v-if="mode==='nameToShort' && suggestions.length > 0 && !outputValue" class="suggestion desktop">
      {{ t('school.tables.abbr.didYouMean1') }}
      <span
          v-for="(s, idx) in suggestions"
          :key="idx"
          @click="applySuggestion(s)"
          class="suggestion-link"
      >
          {{ s.title ? t(`global.titles.${s.title}`) : '' }} {{ s.name }}<span v-if="Number(idx) < suggestions.length - 1">,</span>
        </span>
      {{ t('school.tables.abbr.didYouMean2') }}
    </div>
  </div>
</template>

<style scoped>

.input {
  margin-top: 6px;
}

.row {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
}

.col {
  flex: 1;
}

.switch-col {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
.switch-btn {
  background: var(--vlbg);
  border: 1px solid var(--border2);
  border-radius: var(--border-4);
  width: 38px;
  height: 38px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.1s ease;
  margin: 0;
}

.switch-btn:hover {
  border: 1px solid var(--border2);
}


.switch-icon {
  width: 22px;
  height: 22px;
  color: var(--text);
  transition: color 0.1s, transform 0.2s ease;
}

.switch-btn:hover {
  background: var(--ghost--hover)
}

.switch-btn.rotated .switch-icon {
  transform: rotate(180deg);
}

.suggestion {
  margin-top: 8px;
  color: var(--sub);
  font-style: italic;
  font-size: var(--font-size-sub);
}

.suggestion-link {
  cursor: pointer;
  color: var(--text);
  font-weight: bold;
}

.desktop {
  display: block;
}

.mobile {
  display: none;
}

@media (max-width: 600px) {
  .desktop {
    display: none;
  }

  .mobile {
    display: block;
  }

  .row {
    flex-direction: column;
    align-items: stretch;
  }

  .col {
    width: 100%;
    padding: 0;
  }

  .switch-btn {
    margin: 16px 0 -8px 0;
  }
}
</style>