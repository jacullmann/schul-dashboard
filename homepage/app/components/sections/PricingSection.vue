<script setup lang="ts">
const { t } = useI18n();

interface PricingPlan {
  name: string;
  description: string;
  price: string | null;
  features: string[];
  highlighted?: boolean;
}

/**
 * TODO: Pricing Plans
 * - Replace with your actual pricing tiers
 * - Add billing toggle (monthly/yearly) if needed
 * - Update i18n keys with your pricing content
 */
const plans: PricingPlan[] = [
  {
    name: t('sections.pricing.plan0.name'),
    description: t('sections.pricing.plan0.description'),
    price: t('sections.pricing.plan0.price'),
    features: [
      t('sections.pricing.feature1'),
      t('sections.pricing.feature2'),
    ],
  },
  {
    name: t('sections.pricing.plan1.name'),
    description: t('sections.pricing.plan1.description'),
    price: t('sections.pricing.plan1.price'),
    features: [
      t('sections.pricing.feature1'),
      t('sections.pricing.feature2'),
      t('sections.pricing.feature3'),
    ],
    highlighted: true,
  },
  {
    name: t('sections.pricing.plan2.name'),
    description: t('sections.pricing.plan2.description'),
    price: t('sections.pricing.plan2.price'),
    features: [
      t('sections.pricing.feature1'),
      t('sections.pricing.feature2'),
      t('sections.pricing.feature3'),
      t('sections.pricing.feature4'),
    ],
  },
];
</script>

<template>
  <section class="w-full py-16 md:py-12">
    <div class="max-w-[1300px] w-full mx-auto px-4 lg:px-6">
      <!-- Section Header -->
      <div class="text-center mb-16 md:mb-12">
        <div class="inline-block px-3.5 py-1 rounded-full bg-surface border border-surface-border text-footnote font-semibold text-on-surface-muted uppercase tracking-wider mb-4">
          {{ t('sections.pricing.badge') }}
        </div>
        <h2 class="text-[clamp(1.5rem,3vw,2.25rem)] font-bold text-on-surface font-display leading-[1.25] max-w-[520px] mx-auto">
          {{ t('sections.pricing.title') }}
        </h2>
        <p class="text-on-surface-muted mt-4 max-w-md mx-auto">
          {{ t('sections.pricing.description') }}
        </p>
      </div>

      <!-- Pricing Cards Grid -->
      <div class="grid grid-cols-3 md:grid-cols-2 sm:grid-cols-1 gap-6 max-w-5xl mx-auto">
        <article
          v-for="(plan, idx) in plans"
          :key="`plan-${idx}`"
          class="relative rounded-xl border transition-all"
          :class="plan.highlighted
            ? 'border-action bg-surface-hover scale-105 lg:scale-110 shadow-lg'
            : 'border-surface-border bg-surface hover:border-surface-hover-border hover:bg-surface-hover-subtle'
          "
        >
          <!-- Highlighted Badge -->
          <div
            v-if="plan.highlighted"
            class="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-action text-on-action text-footnote font-semibold"
          >
            {{ t('sections.pricing.featured') }}
          </div>

          <!-- Card Content -->
          <div class="p-7 flex flex-col gap-6 h-full">
            <!-- Header -->
            <div>
              <h3 class="text-title font-semibold text-on-surface font-display m-0">
                {{ plan.name }}
              </h3>
              <p class="text-sm text-on-surface-muted mt-1 m-0">
                {{ plan.description }}
              </p>
            </div>

            <!-- Price -->
            <div class="border-t border-surface-border pt-4">
              <p class="text-3xl font-bold text-on-surface font-display m-0">
                {{ plan.price }}
              </p>
            </div>

            <!-- Features -->
            <ul class="flex flex-col gap-3 flex-1">
              <li
                v-for="(feature, featureIdx) in plan.features"
                :key="`feature-${featureIdx}`"
                class="flex items-start gap-2 text-on-surface-muted text-sm"
              >
                <span class="text-action font-bold mt-0.5 flex-shrink-0">✓</span>
                <span>{{ feature }}</span>
              </li>
            </ul>

            <!-- CTA -->
            <button
              type="button"
              class="w-full py-2.5 px-4 rounded-lg font-semibold transition-all border"
              :class="plan.highlighted
                ? 'bg-action text-on-action border-action hover:bg-action-hover'
                : 'border-surface-border text-on-surface hover:bg-surface-hover-subtle'
              "
            >
              {{ t('sections.pricing.cta') }}
            </button>
          </div>
        </article>
      </div>
    </div>
  </section>
</template>
