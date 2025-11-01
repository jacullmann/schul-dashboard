<template>
  <div class="mobile-card-list-wrapper">
    <div style="display: flex; justify-content: center; align-items: center;">
      <h2 class="digin"><n-gradient-text
          gradient="linear-gradient(70deg, #ff9823, #ff335a, #af00ff, #6600ff)"
      >
        <div class="bibibobo">Tauche ein...</div>
      </n-gradient-text></h2>
    </div>
    <n-space vertical>
      <div class="ult">
        <div class="ult-in">...in die Welt der ultimativen Einfachheit.</div>
        <n-carousel :space-between="20" draggable >
          <n-card class="ncards" :bordered="false"><div class="upto">Alles an einem Platz</div></n-card>
          <n-card class="ncards" :bordered="false"><div class="upto">Nie wieder Hausaufgaben vergessen</div></n-card>
          <n-card class="ncards" :bordered="false"><div class="upto">Immer dabei</div></n-card>
          <n-card class="ncards" :bordered="false"><div class="upto">Geschützter persönlicher Account</div></n-card>
        </n-carousel>
      </div>

      <n-card style="border-radius: 10px; display: flex; justify-content: center; align-items: center; text-align: center; padding: 8px" title="Mit unserem Tool..." class="n-more" size="small">
        <n-divider
            class="dosh"
            style="margin-top: 1px; display: flex; justify-content: center; align-items: center; text-align: center; padding: 8px"
        />

        <n-space  vertical>
          <n-gradient-text

              :gradient="{
      deg: 90,
      from: 'rgb(250,247,247)',
      to: 'rgb(251,252,255)',
    }"

          >

            ...behälst du immer den Überblick...

          </n-gradient-text>
          <ArrowDownIcon />
        </n-space>

        <n-space  vertical >
          <n-gradient-text
              :gradient="{
      deg: 90,
      from: 'rgb(250,247,247)',
      to: 'rgb(251,252,255)',
    }"
          >
            ...kannst du von überall aus lernen...

          </n-gradient-text>
          <ArrowDownIcon />
        </n-space>

        <n-space  vertical >
          <n-gradient-text
              :gradient="{
      deg: 90,
     from: 'rgb(250,247,247)',
     to: 'rgb(251,252,255)',
    }"
          >
            ...schreibst du bessere Noten...
          </n-gradient-text>
          <ArrowDownIcon />
        </n-space>

        <n-space  vertical >
          <n-gradient-text
              :gradient="{
      deg: 90,
      from: 'rgb(250,247,247)',
     to: 'rgb(251,252,255)',
    }"
          >
            ...hast du mehr Freizeit...
          </n-gradient-text>
          <ArrowDownIcon />
        </n-space>

        <n-space  vertical >
          <n-gradient-text
              :gradient="{
      deg: 90,
      from: 'rgb(250,247,247)',
     to: 'rgb(251,252,255)',
    }"
          >
            ...bist du so flexibel wie nie zuvor!
          </n-gradient-text>
          <ListCheckIcon style="margin-top: 7px"/>
        </n-space>



      </n-card>
    </n-space>

    <NCollapse :default-expanded-names="['']" class="mobile-collapse-list" accordion>

      <NCollapseItem name="homework" class="mobile-list-item">
        <template #header>
          <div class="mobile-list-header">
            <NIcon :size="20" color="var(--primary)"><ClipboardList color="white" /></NIcon>
            <span class="mobile-list-title">Hausaufgabe morgen</span>
          </div>
        </template>
        <template #header-extra>
          <NCheckbox class="dosh" :checked="true"  size="small" :theme-overrides="{ colorChecked: '#70e0ff' }" />
        </template>
        <NCard size="small" :bordered="false" class="mobile-card-content">
          <p class="small-detail">CDA p. 77/78</p>
          <NButton  @click="handleButtonClick('französischHa')" size="small" type="info" secondary>
            Details anzeigen
          </NButton>
        </NCard>
      </NCollapseItem>

      <NCollapseItem name="test" class="mobile-list-item">
        <template #header>
          <div class="mobile-list-header">
            <NIcon :size="20" color="var(--n-color-warning)"><BookOpen /></NIcon>
            <span class="mobile-list-title">Klassenarbeit Deutsch</span>
          </div>
        </template>
        <template #header-extra>
          <NTag class="dosh" type="warning" size="small" round>Wichtig</NTag>
        </template>
        <NCard size="small" :bordered="false" class="mobile-card-content">
          <p class="small-detail theme">Thema: Gedichtsanalyse und Inhaltszusammenfassung</p>
          <NButton   @click="handleButtonClick('deutschKa')" size="small" type="info" secondary>
            <div >Lernzettel öffnen</div>
          </NButton>
        </NCard>
      </NCollapseItem>

      <NCollapseItem name="tasks" class="mobile-list-item">
        <template #header>
          <div class="mobile-list-header">
            <NIcon :size="20" color="var(--n-color-success)"><Clock /></NIcon>
            <span class="mobile-list-title">Vokabelkarten anfertigen bis Freitag</span>
          </div>
        </template>
        <template #header-extra>
          <NCheckbox class="dosh" :checked="false" size="small" />
        </template>
        <NCard size="small" :bordered="false" class="mobile-card-content">
          <p class="small-detail">Seite 177-178 komplett als Vokabelkarten aufschreiben</p>
          <NButton   @click="handleButtonClick('vocabHw')" size="small" type="success" secondary>
            Vokabelliste anschauen
          </NButton>
        </NCard>
      </NCollapseItem>

      <NCollapseItem name="schedule" class="mobile-list-item">
        <template #header>
          <div class="mobile-list-header">
            <NIcon :size="20" color="var(--n-color-error)"><AlertTriangle /></NIcon>
            <span class="mobile-list-title">Stundenplan-Änderung!</span>
          </div>
        </template>
        <template #header-extra>
          <NTag class="dosh" type="error" size="small" round>Ausfall</NTag>
        </template>
        <NCard size="small" :bordered="false" class="mobile-card-content">
          <p class="small-detail" style="font-weight: bold; color: var(--n-color-error)">1./2. entfällt heute!</p>
          <NButton  @click="handleButtonClick('ausfall')" size="small" type="error" secondary>
            Auf DSB überprüfen
          </NButton>
        </NCard>
      </NCollapseItem>

    </NCollapse>

  </div>
</template>

<script setup lang="ts">
import {
  NButton, NCard, NCollapse, NCollapseItem, NTag, NCheckbox, NIcon,
  useMessage
} from 'naive-ui';
import {ClipboardList, BookOpen, Clock, AlertTriangle, AnnoyedIcon, LockKeyhole, SmilePlus, Laugh, ArrowDownIcon, ListCheckIcon} from 'lucide-vue-next';
import { h } from 'vue';

const message = useMessage()

const renderIcon = (iconComponent: any) => {

  return () => h(NIcon, null, { default: () => h(iconComponent) });
}


const handleButtonClick = (aktionstyp: string) => {

  let contentText: string;
  let messageType: 'info' | 'warning' | 'error' | 'success';
  let iconComponent: any;

  if (aktionstyp === 'französischHa') {
    contentText = 'Tja, dabei können wir dir auch nicht helfen.';
    messageType = 'info';
    iconComponent = AnnoyedIcon;
  }
  else if (aktionstyp === 'deutschKa') {
    contentText = 'Passwort eingeben --> Losstarten';
    messageType = 'info';
    iconComponent = LockKeyhole;
  }
  else if (aktionstyp === 'vocabHw') {
    contentText = 'Eigentlich Seite 178-384, aber das ersparen wir euch.';
    messageType = 'info';
    iconComponent = SmilePlus;
  }
  else if (aktionstyp === 'ausfall') {
    contentText = 'Spaß, natürlich fällt die 1./2. Stunde nicht aus.';
    messageType = 'info';
    iconComponent = Laugh;
  }
  else {
    contentText = `Unbekannter Parameter '${aktionstyp}'. `;
    messageType = 'info';
    iconComponent = null;
  }

  message[messageType](contentText, {
    duration: 1800,
    icon: iconComponent ? renderIcon(iconComponent) : undefined
  });
}


</script>

<style scoped>
.digin {
}



.ncards{
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 5px 5px 5px 5px;
  max-width:100%;
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(5px) saturate(125%) brightness(185%);
  -webkit-backdrop-filter: blur(20px) saturate(105%) brightness(125%);
  height: 200px;
  color: white;
}
.ult {
  font-size: 1.05rem;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  text-align: center;
  background: linear-gradient(70deg, #995c1a, #992037, #6900cc, #400099);
  border-radius: 8px;
  margin-bottom: 10px;
  text-shadow: none;
  color: white;
  padding: 25px 15px 20px 15px;
  max-width: 100%;
  width: 80vw;



}

.ult-in{
  font-weight: 600;
  margin-bottom: 10px;

}



.n-more{
  border: none;
  color: white;
  background-color: rgba(100, 100, 100, 0.25);
  backdrop-filter: blur(10px);
  width: 80vw;
}
:deep(.n-more .n-card-header__main) {
  color: white;
}

.mobile-card-list-wrapper {
  padding: 0 20px 40px;
}
.mobile-collapse-list {
  margin-top: 30px;
}

.mobile-list-item {
  margin-bottom: 12px;
  background-color: rgba(100, 100, 100, 0.25);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  overflow: hidden;
  transition: box-shadow 0.3s ease, transform 0.3s ease;
  width: 80vw;
}

.mobile-list-item:hover {
  transform: translateY(-2px);
}

:deep(.n-collapse-item__header) {
  padding: 16px 20px !important;
  color: var(--n-text-color-base);
  font-weight: 600;
  border-bottom: none !important;
}
:deep(.n-collapse-item-arrow) {
  color: white !important;
}


:deep(.n-collapse-item) {
  border-top: none !important;
}
.mobile-list-header {
  display: flex;
  align-items: center;
  gap: 10px;
  color: white;
}

.mobile-list-title {
  font-weight: 600;
  font-size: 1.1rem;
}


.mobile-card-content {
  background-color: rgba(0, 0, 0, 0.3);
  padding: 12px 20px 16px 20px !important;
  border-radius: 0 0 12px 12px;
  color: white;
}

.mobile-card-content p {
  margin: 0 0 10px 0;
}

.small-detail {
  font-size: 14px;
  color: var(--n-text-color-base);
}

.theme {
  color: var(--n-color-warning);
}
.bibibobo {
  font-weight: 800;
  font-size: 2rem
}

@media (max-width: 320px) {
  .dosh{
    display: none;
  }

}
.n-more :deep(.n-gradient-text .n-gradient-text__inner) {
  white-space: normal;
}



@media (min-width:700px ) {
  .bibibobo {
    font-size: 2.4rem;
  }
  
}
</style>