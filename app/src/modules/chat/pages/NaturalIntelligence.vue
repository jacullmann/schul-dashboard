<script setup lang="ts">
import { useRouter } from 'vue-router';

const router = useRouter();
</script>

<template>
  <div class="h-[100dvh] w-full flex flex-col bg-canvas">
    <h1 class="mx-4! my-2!">Natural Intelligence</h1>
    <div
      class="w-full max-w-[800px] mx-auto flex flex-col gap-2 min-h-full items-center"
    >
      <div class="h-[calc(100dvh-40dvh)] flex flex-col px-4 justify-center">
        <div class="text-center text-5xl! my-8 text-on-ghost">
          Tired of <b>artifical</b> intelligence?
        </div>
        <div class="text-lg mb-8 text-on-ghost-muted">
          Can machines replace humans? Experience natural intelligence or try
          working as an AI model and compete against artificial intelligence.
        </div>

        <BaseRow justify="center">
          <!-- BaseButton variant="ghost" size="lg" @click="router.push('/natural-intelligence/server')">Fulfill requests</BaseButton> -->
          <BaseButton
            variant="action"
            size="lg"
            @click="router.push('/natural-intelligence/chat')"
            >Try Natural Intelligence now</BaseButton
          >
        </BaseRow>
        <div class="text-sm mt-2 text-center text-on-ghost-muted font-medium">
          No sign up required!
        </div>
      </div>

      <div class="prose p-4">
        <h2 class="mt-32!">How it works</h2>
        <p>
          Natural Intelligence works as the interface between two humans. It
          features two modes:
        </p>
        <h3>Chat</h3>
        <p>
          The user sees a normal chat interface and sends a request. Once
          another human player is found, the user has to wait until he receives
          an answer upon which he can keep chatting or start a new chat. The
          user can manage different settings which dictate what tools the other
          player has access to and how long he can think about the answer.
        </p>
        <h3>Server</h3>
        <p>
          The user sees an interface which simulates the tools and information
          an LLM can access. The goal is to answer the requests send by the
          other as good as possible. To achieve this, the user can use tools to
          search the web or use a drawing pad.
        </p>
      </div>
    </div>
  </div>
</template>
