<script setup lang="ts">
import AppLogo from '@/common/components/AppLogo.vue';
import Tagline from "@/common/components/Tagline.vue";
import ThemeDropdown from "@/common/components/ThemeDropdown.vue";
import LocaleDropdown from "@/common/components/LocaleDropdown.vue";
import FooterSection from "./FooterSection.vue";
import FooterLink from "./FooterLink.vue";
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const year = new Date().getFullYear();
</script>

<template>
  <footer class="bg-canvas text-on-surface pt-12 border-t border-canvas-border md:px-4 md:pt-4">
    <div class="container pb-10 md:pb-8 max-w-[1300px]">
      <div class="grid grid-cols-[1.5fr_1fr_1fr_1fr_1fr_1fr] lg:grid-cols-2 md:grid-cols-1 gap-4">
        <FooterSection content-class="gap-2" class="max-lg:col-span-full">
          <div class="flex items-center gap-3 mb-1">
            <AppLogo class="h-[28px] w-auto" aria-hidden="true" />
            <span class="font-h2 font-bold text-on-surface leading-none mb-1">schul-dashboard</span>
          </div>
          <Tagline />
        </FooterSection>

        <FooterSection title="Navigation">
          <FooterLink to="/home">{{ t('groups.home.title') }}</FooterLink>
          <FooterLink to="/todos">{{ t('school.private.title') }}</FooterLink>
          <FooterLink to="/info-dashboard">{{ t('info.dashboard.title') }}</FooterLink>
          <FooterLink to="/games">{{ t('navigation.games') }}</FooterLink>
          <FooterLink to="/brain">Brain Tests</FooterLink>
          <FooterLink to="/imagetool">{{ t('navigation.imageTool') }}</FooterLink>
        </FooterSection>

        <FooterSection :title="t('legal.title')">
          <FooterLink to="/legal/impress">{{ t('legal.imprint.title') }}</FooterLink>
          <FooterLink to="/legal/privacy-policy">{{ t('legal.privacy.title') }}</FooterLink>
          <FooterLink to="/legal/terms">{{ t('legal.terms.title') }}</FooterLink>
        </FooterSection>

        <FooterSection :title="t('contact.contact.title')">
          <FooterLink to="/contact">{{ t('contact.contact.title') }}</FooterLink>
        </FooterSection>

        <FooterSection :title="t('global.design')">
          <div class="mt-2">
            <ThemeDropdown />
          </div>
        </FooterSection>

        <FooterSection :title="t('global.language')">
          <div class="mt-2">
            <LocaleDropdown />
          </div>
        </FooterSection>
      </div>
    </div>

    <div class="border-t border-canvas-border font-sub">
      <div class="max-w-[1300px] flex justify-between items-center md:flex-col md:items-start md:gap-3">
        <p class="text-on-surface-muted m-0">© {{ year }} {{ t('global.title') }}</p>
      </div>
    </div>
  </footer>
</template>
