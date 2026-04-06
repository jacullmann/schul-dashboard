<script setup lang="ts">
import { ref } from 'vue';
import { Plus, AudioLines, ArrowUp } from '@lucide/vue';
import ModelSelect from '@/modules/chat/components/ModelSelect.vue';
import ToolMenu from '@/modules/chat/components/ToolMenu.vue';
import { useToast } from '@/common/composables/useToast';

const userInput = ref('');
const showFiles = ref(false);

function send() {
  useToast().success('Message sent. Reply in 2-3 business days');
  userInput.value = '';
}
</script>

<template>
  <div class="absolute inset-0 flex items-center justify-center w-full">
    <div class="flex flex-col justify-center w-full max-w-200 px-4">
      <div class="text-4xl text-center mb-12 font-normal">Tired of talking to <b>artifical</b> intelligence?</div>
      <form @submit.prevent="send" novalidate>
        <div
          class="p-3 rounded-[32px] flex flex-col gap-2 bg-surface border border-surface-border w-full"
        >
          <input
            id="user-input"
            v-model="userInput"
            type="text"
            placeholder="Ask Natural Intelligence"
            autocomplete="off"
            class="flex-1 w-full py-2 px-3 leading-6 rounded-none bg-transparent border-none outline-none shadow-none text-on-surface text-body placeholder:text-on-surface-subtle select-none"
          />
          <BaseRow justify="between">
            <BaseRow>
              <BaseTooltip content="Add files" placement="bottom">
                <BaseButton :icon="Plus" size="lg" @click="showFiles = true" />
              </BaseTooltip>

              <ToolMenu />
            </BaseRow>
            <BaseRow>
              <ModelSelect modelValue="ultra" />

              <Transition
                mode="out-in"
                enter-active-class="transition-opacity duration-100 ease-in-out"
                enter-from-class="opacity-0"
                enter-to-class="opacity-100"
                leave-active-class="transition-opacity duration-100 ease-in-out"
                leave-from-class="opacity-100"
                leave-to-class="opacity-0"
              >
                <BaseTooltip
                  v-if="!userInput"
                  key="voice"
                  content="Use voice"
                  placement="bottom"
                >
                  <BaseButton :icon="AudioLines" size="lg" />
                </BaseTooltip>

                <BaseTooltip
                  v-else
                  key="submit"
                  content="Submit"
                  placement="bottom"
                >
                  <BaseButton :icon="ArrowUp" variant="action" type="submit" size="lg" />
                </BaseTooltip>
              </Transition>
            </BaseRow>
          </BaseRow>
        </div>
      </form>
    </div>
  </div>
</template>
