<template>
  <section class="contact-section card" aria-label="Kontaktformular">
    <div class="container">

      <div >
        <div >
        <h2>Kontakt</h2>
        <small >Teile deine Erfahrungen mit uns</small><br /><br/><hr/><br/>
        </div>
        <Manual />
        <hr />
        <br />
        <!--<div class="cont">


        </div>-->
        <h3>Kontaktformular</h3><br/>
        <form
            class="contact-form"
            :class="{ 'is-submitting': isSubmitting }"
            @submit.prevent="handleSubmit"
            novalidate
        >
          <!-- Honeypot -->
          <input
              type="text"
              autocomplete="off"
              tabindex="-1"
              class="honeypot"
              v-model="honeypot"
              aria-hidden="true"
          />

          <!-- Name & Email Row -->
          <div class="form-row">
            <div class="form-group">
              <div class="input-wrapper" :class="getInputClass('name')">
                <input
                    id="name"
                    type="text"
                    class="form-input"
                    v-model.trim="formData.name"
                    :disabled="isSubmitting"
                    @focus="handleFocus('name')"
                    @blur="handleBlur('name')"
                    @input="handleInput('name')"
                    :aria-invalid="hasError('name')"
                    aria-describedby="name-error"
                    required
                />
                <label for="name" class="form-label">Name *</label>
              </div>
              <transition name="fade-slide">
                <p v-if="showError('name')" id="name-error" class="error-message">
                  {{ errors.name }}
                </p>
              </transition>
            </div>

            <div class="form-group">
              <div class="input-wrapper" :class="getInputClass('email')">
                <input
                    id="email"
                    type="email"
                    inputmode="email"
                    autocapitalize="off"
                    autocomplete="email"
                    class="form-input"
                    v-model.trim="formData.email"
                    :disabled="isSubmitting"
                    @focus="handleFocus('email')"
                    @blur="handleBlur('email')"
                    @input="handleInput('email')"
                    :aria-invalid="hasError('email')"
                    aria-describedby="email-error"
                    required
                />
                <label for="email" class="form-label">E-Mail *</label>

              </div>
              <transition name="fade-slide">
                <p v-if="showError('email')" id="email-error" class="error-message">
                  {{ errors.email }}
                </p>
              </transition>
            </div>
          </div>

          <!-- Subject -->
          <div class="form-group">
            <div class="input-wrapper" :class="getInputClass('subject')">
              <input
                  id="subject"
                  type="text"
                  class="form-input"
                  v-model.trim="formData.subject"
                  :disabled="isSubmitting"
                  @focus="handleFocus('subject')"
                  @blur="handleBlur('subject')"
                  @input="handleInput('subject')"
                  :aria-invalid="hasError('subject')"
                  aria-describedby="subject-error"
                  required
              />
              <label for="subject" class="form-label">Betreff *</label>

            </div>
            <transition name="fade-slide">
              <p v-if="showError('subject')" id="subject-error" class="error-message">
                {{ errors.subject }}
              </p>
            </transition>
          </div>

          <!-- Message -->
          <div class="form-group">
            <div class="textarea-wrapper" :class="getInputClass('message')">
              <textarea
                  id="message"
                  class="form-textarea"
                  rows="1"
                  v-model.trim="formData.message"
                  :disabled="isSubmitting"
                  @focus="handleFocus('message')"
                  @blur="handleBlur('message')"
                  @input="handleTextareaInput"
                  :aria-invalid="hasError('message')"
                  aria-describedby="message-error message-counter"
                  required
              ></textarea>
              <label for="message" class="form-label">Nachricht *</label>

              <div class="textarea-footer">
                <span id="message-counter" class="char-counter" :class="{ 'counter-warning': charCount > MESSAGE_MAX * 0.9 }">
                  {{ charCount }} / {{ MESSAGE_MAX }}
                </span>
              </div>
            </div>
            <transition name="fade-slide">
              <p v-if="showError('message')" id="message-error" class="error-message">
                {{ errors.message }}
              </p>
            </transition>
          </div>

          <!-- Consent -->
          <div class="form-group consent-group">
            <label class="checkbox-label">
              <input
                  type="checkbox"
                  class="checkbox-input"
                  v-model="formData.consent"
                  :disabled="isSubmitting"
                  @change="validateField('consent')"
                  :aria-invalid="hasError('consent')"
                  aria-describedby="consent-error"
              />
              <span class="checkbox-box">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M20 6L9 17L4 12" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </span>
              <span class="checkbox-text">
                Ich akzeptiere die
                <a href="/impressum-&-datenschutz/datenschutzerklaerung" target="_blank" rel="noopener">Datenschutzerklärung</a>
                und die
                <a href="/impressum-&-datenschutz/impressum" target="_blank" rel="noopener">AGB</a>.
              </span>
            </label>
            <transition name="fade-slide">
              <p v-if="showError('consent')" id="consent-error" class="error-message">
                {{ errors.consent }}
              </p>
            </transition>
          </div>
          <!-- Status Banner -->
          <transition name="slide-down">
            <div v-if="banner.type" class="status-banner" :class="`status-${banner.type}`" role="alert" aria-live="polite">
              <div class="status-icon">
                <svg v-if="banner.type === 'success'" width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M20 6L9 17L4 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                <svg v-else-if="banner.type === 'error'" width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                  <path d="M15 9L9 15M9 9L15 15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
                <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M12 9V13M12 17H12.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
              </div>
              <span class="status-text">{{ banner.message }}</span>
            </div>
          </transition>

          <!-- Actions -->
          <div class="form-actions">
            <button
                data-umami-event="Kontaktformular absenden Button"
                type="submit"
                class="btn btn-primary"
                :disabled="isSubmitting || cooldownActive"
                :title="cooldownActive ? 'Bitte kurz warten…' : 'Nachricht senden'"
            >
              <svg v-if="isSubmitting" class="spinner" width="18" height="18" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" fill="none" stroke-linecap="round" stroke-dasharray="60" stroke-dashoffset="20" />
              </svg>
              <span>{{ isSubmitting ? 'Wird gesendet…' : 'Nachricht senden' }}</span>
            </button>

            <button
                data-umami-event="Kontaktformular zurücksetzen Button"
                type="button"
                class="btn btn-ghost"
                @click="resetForm"
                :disabled="isSubmitting"
            >
              Zurücksetzen
            </button>

            <transition name="fade">
              <span v-if="cooldownActive" class="cooldown-notice">
                Danke für deine Nachricht!
              </span>
            </transition>
          </div>
        </form>
      </div>
    </div>
  </section>
</template>

<script lang="ts" setup>
import { reactive, ref, computed, watch } from 'vue'
import Manual from './EmailContact.vue'

const FORMSPREE_ENDPOINT = 'https://formspree.io/f/mdkwadva'
const MESSAGE_MAX = 2000
const COOLDOWN_DURATION = 4000

// State
const isSubmitting = ref(false)
const cooldownActive = ref(false)
const honeypot = ref('')

const formData = reactive({
  name: '',
  email: '',
  subject: '',
  message: '',
  consent: false
})

const errors = reactive<Record<string, string>>({
  name: '',
  email: '',
  subject: '',
  message: '',
  consent: ''
})

const touched = reactive<Record<string, boolean>>({
  name: false,
  email: false,
  subject: false,
  message: false,
  consent: false
})

const focused = reactive<Record<string, boolean>>({
  name: false,
  email: false,
  subject: false,
  message: false,
  consent: false
})

const banner = reactive<{ type: 'success' | 'error' | 'warning' | ''; message: string }>({
  type: '',
  message: ''
})

// Computed
const charCount = computed(() => formData.message.length)

// Validation
const validators = {
  name: (value: string) => {
    if (!value || value.length < 2) {
      return 'Bitte gib deinen Namen ein (mindestens 2 Zeichen)'
    }
    return ''
  },

  email: (value: string) => {
    if (!value) {
      return 'Bitte gib deine E-Mail-Adresse ein'
    }
    const emailRegex = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i
    if (!emailRegex.test(value)) {
      return 'Bitte gib eine gültige E-Mail-Adresse ein'
    }
    return ''
  },

  subject: (value: string) => {
    if (!value || value.length < 2) {
      return 'Bitte gib einen Betreff ein (mindestens 2 Zeichen)'
    }
    return ''
  },

  message: (value: string) => {
    if (!value || value.length < 10) {
      return 'Bitte schreib eine Nachricht (mindestens 10 Zeichen)'
    }
    if (value.length > MESSAGE_MAX) {
      return `Die Nachricht darf maximal ${MESSAGE_MAX} Zeichen enthalten`
    }
    return ''
  },

  consent: (value: boolean) => {
    if (!value) {
      return 'Bitte akzeptiere die Datenschutzerklärung und AGB'
    }
    return ''
  }
}

let validationTimers: Record<string, number> = {}

function validateField(field: keyof typeof formData) {
  const validator = validators[field]
  if (validator) {
    errors[field] = validator(formData[field] as any)
  }
}

function validateAllFields(): boolean {
  let isValid = true

  Object.keys(formData).forEach((field) => {
    touched[field] = true
    validateField(field as keyof typeof formData)
    if (errors[field]) {
      isValid = false
    }
  })

  return isValid
}

// Helpers
function hasError(field: keyof typeof errors): boolean {
  return !!errors[field]
}

function showError(field: keyof typeof errors): boolean {
  return touched[field] && !!errors[field]
}

function getInputClass(field: keyof typeof formData) {
  return {
    'has-value': !!formData[field],
    'is-focused': focused[field],
    'is-valid': touched[field] && !errors[field] && formData[field],
    'is-invalid': touched[field] && errors[field]
  }
}

// Event Handlers
function handleFocus(field: keyof typeof focused) {
  focused[field] = true
}

function handleBlur(field: keyof typeof touched) {
  focused[field] = false
  touched[field] = true
  validateField(field as keyof typeof formData)
}

function handleInput(field: keyof typeof formData) {
  clearTimeout(validationTimers[field])

  validationTimers[field] = window.setTimeout(() => {
    if (touched[field]) {
      validateField(field)
    }
  }, 300)
}

function handleTextareaInput(e: Event) {
  const textarea = e.target as HTMLTextAreaElement

  // Auto-resize
  textarea.style.height = 'auto'
  textarea.style.height = Math.min(textarea.scrollHeight, 300) + 'px'

  handleInput('message')
}

function startCooldown() {
  cooldownActive.value = true
  setTimeout(() => {
    cooldownActive.value = false
  }, COOLDOWN_DURATION)
}

function resetForm() {
  formData.name = ''
  formData.email = ''
  formData.subject = ''
  formData.message = ''
  formData.consent = false

  Object.keys(errors).forEach(key => {
    errors[key] = ''
  })

  Object.keys(touched).forEach(key => {
    touched[key] = false
  })

  Object.keys(focused).forEach(key => {
    focused[key] = false
  })

  honeypot.value = ''
  banner.type = ''
  banner.message = ''

  // Clear session storage
  sessionStorage.removeItem('contact_form_draft')
}

async function handleSubmit() {
  // Cooldown check
  if (cooldownActive.value) {
    return
  }

  // Honeypot check
  if (honeypot.value) {
    banner.type = 'warning'
    banner.message = 'Dein Formular konnte nicht gesendet werden.'
    startCooldown()
    return
  }

  // Validate all fields
  if (!validateAllFields()) {
    banner.type = 'error'
    banner.message = 'Bitte fülle alle erforderlichen Felder korrekt aus.'
    return
  }

  // Start submission
  isSubmitting.value = true
  banner.type = ''
  banner.message = ''

  try {
    const response = await fetch(FORMSPREE_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        name: formData.name,
        email: formData.email,
        subject: formData.subject,
        message: formData.message
      })
    })

    if (response.ok) {
      banner.type = 'success'
      banner.message = 'Vielen Dank! Deine Nachricht wurde erfolgreich gesendet.'
      startCooldown()
      resetForm()

      // Scroll to top to show success message
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else {
      const data = await response.json().catch(() => ({}))
      banner.type = 'error'
      banner.message = data.error || data.message || 'Es ist ein Fehler aufgetreten. Bitte versuche es später erneut.'
    }
  } catch (error) {
    banner.type = 'error'
    banner.message = 'Netzwerkfehler. Bitte überprüfe deine Internetverbindung.'
  } finally {
    isSubmitting.value = false
  }
}

// Session Storage - Save draft
const STORAGE_KEY = 'contact_form_draft'

watch(formData, (newData) => {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(newData))
}, { deep: true })

// Restore draft on mount
try {
  const savedDraft = sessionStorage.getItem(STORAGE_KEY)
  if (savedDraft) {
    const draft = JSON.parse(savedDraft)
    Object.assign(formData, draft)
  }
} catch (e) {
  // Ignore errors
}
</script>

<style scoped>
.cont{
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}
/* Section */
.contact-section {
  padding: 30px 50px;
  min-height: 100vh;
}

/* Hero Header */
.hero-header {
  margin-bottom: 48px;
  text-align: center;
}

.hero-content {
  margin-bottom: 32px;
}

.hero-title {
  font-size: 42px;
  font-weight: 700;
  margin: 0 0 12px 0;
  color: #f1f1f1;
  letter-spacing: -0.02em;
}

.hero-subtitle {
  font-size: 18px;
  color: #f1f1f1;
  margin: 0;
  max-width: 600px;
  margin-left: auto;
  margin-right: auto;
  line-height: 1.6;
}

/* Status Banner */
.status-banner {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  padding: 14px 20px;
  border-radius: 8px;
  background: var(--card);
  border: 1px solid var(--border);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}

.status-banner.status-success {
  background: rgba(63, 147, 248, 0.1);
  border-color: var(--primary);
  color: var(--primary);
}

.status-banner.status-error {
  background: rgba(239, 68, 68, 0.1);
  border-color: var(--danger);
  color: var(--danger);
}

.status-banner.status-warning {
  background: rgba(245, 158, 11, 0.1);
  border-color: var(--warn);
  color: var(--warn);
}

.status-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.status-text {
  font-size: 15px;
  font-weight: 500;
}

/* Form Card */
.form-card {
  max-width: 700px;
  margin: 0 auto;
  background: var(--card);
  border-radius: 16px;
  padding: 48px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
}

.contact-form {
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.contact-form.is-submitting {
  opacity: 0.6;
  pointer-events: none;
}

/* Form Row */
.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}

/* Form Group */
.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* Input Wrapper */
.input-wrapper,
.textarea-wrapper {
  position: relative;
  display: flex;
  flex-direction: column;
}

/* Form Input */
.form-input,
.form-textarea {
  width: 100%;
  padding: 16px 16px 16px 16px;
  background: rgba(42, 42, 42, 0.5);
  border: 2px solid transparent;
  border-radius: 7px;
  color: #f1f1f1;
  font-size: 15px;
  transition: all 0.3s ease;
  outline: none;
}

.form-textarea {
  resize: none;
  min-height: 120px;
  font-family: inherit;
  line-height: 1.6;
}

.form-input:focus,
.form-textarea:focus {
  background: rgba(42, 42, 42, 0.8);
  border-color: var(--primary);
}

/* Floating Label */
.form-label {
  position: absolute;
  left: 16px;
  top: 17px;
  color: var(--muted);
  font-size: 16px;
  pointer-events: none;
  transition: all 0.3s ease;
  transform-origin: left center;
}

.input-wrapper.has-value .form-label,
.input-wrapper.is-focused .form-label,
.textarea-wrapper.has-value .form-label,
.textarea-wrapper.is-focused .form-label {
  top: -10px;
  left: 12px;
  font-size: 12px;
  color: var(--primary);
  background: var(--bg);
  padding: 0 6px;
  font-weight: 600;
}

/* Input States */
.input-wrapper.is-valid .form-input,
.textarea-wrapper.is-valid .form-textarea {
  border-color: var(--primary);
}

.input-wrapper.is-invalid .form-input,
.textarea-wrapper.is-invalid .form-textarea {
  border-color: var(--danger);
}

.input-wrapper.is-invalid .form-label,
.textarea-wrapper.is-invalid .form-label {
  color: var(--danger);
}

/* Input Border Animation */
.input-border {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 0;
  height: 2px;
  background: var(--primary);
  transition: width 0.3s ease;
}

.input-wrapper.is-focused .input-border,
.textarea-wrapper.is-focused .input-border {
  width: 100%;
}

/* Textarea Footer */
.textarea-footer {
  display: flex;
  justify-content: flex-end;
  margin-top: 8px;
}

.char-counter {
  font-size: 13px;
  color: var(--muted);
  font-weight: 500;
}

.char-counter.counter-warning {
  color: var(--warn);
}

/* Error Message */
.error-message {
  font-size: 13px;
  color: var(--danger);
  margin: 0;
  display: flex;
  align-items: center;
  gap: 6px;
}

.error-message::before {
  content: '⚠';
  font-size: 14px;
}

/* Checkbox */
.consent-group {
  margin-top: -8px;
}

.checkbox-label {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  cursor: pointer;
  user-select: none;
}

.checkbox-input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.checkbox-box {
  flex-shrink: 0;
  width: 22px;
  height: 22px;
  border: 2px solid var(--border);
  border-radius: 5px;
  background: rgba(42, 42, 42, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  margin-top: 2px;
}

.checkbox-box svg {
  opacity: 0;
  transform: scale(0);
  transition: all 0.2s ease;
}

.checkbox-input:checked + .checkbox-box {
  background: var(--primary);
  border-color: var(--primary);
}

.checkbox-input:checked + .checkbox-box svg {
  opacity: 1;
  transform: scale(1);
}

.checkbox-label:hover .checkbox-box {
  border-color: var(--primary);
}

.checkbox-text {
  font-size: 14px;
  color: var(--muted);
  line-height: 1.6;
}

.checkbox-text a {
  color: var(--primary);
  text-decoration: underline;
  text-decoration-color: transparent;
  transition: text-decoration-color 0.2s ease;
}

.checkbox-text a:hover {
  text-decoration-color: var(--primary);
}

/* Form Actions */
.form-actions {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
  margin-top: 8px;
}

.btn-primary,
.btn-ghost {
  padding: 14px 28px;
  border-radius: 5px;
  font-size: 16px;
  font-weight: 600;
  border: none;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  transition: all 0.3s ease;
  outline: none;
}

.btn-primary {
  background: var(--primary);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #2b7de0;
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(63, 147, 248, 0.4);
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-ghost {
  background: transparent;
  color: var(--muted);
  border: 2px solid var(--border);
}

.btn-ghost:hover:not(:disabled) {
  color: var(--text);
  border-color: var(--text);
}

.btn-ghost:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.cooldown-notice {
  font-size: 14px;
  color: var(--primary);
  font-weight: 500;
}

/* Spinner */
.spinner {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Honeypot */
.honeypot {
  position: absolute;
  left: -9999px;
  width: 0;
  height: 0;
  opacity: 0;
}

/* Animations */
.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.4s ease;
}

.slide-down-enter-from {
  opacity: 0;
  transform: translateY(-20px);
}

.slide-down-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.3s ease;
}

.fade-slide-enter-from {
  opacity: 0;
  transform: translateY(-8px);
}

.fade-slide-leave-to {
  opacity: 0;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Responsive */
@media (max-width: 768px) {
  .contact-section {
    padding: 40px 0;
  }

  .hero-title {
    font-size: 32px;
  }

  .hero-subtitle {
    font-size: 16px;
  }

  .form-card {
    padding: 32px 24px;
  }

  .form-row {
    grid-template-columns: 1fr;
    gap: 32px;
  }

  .form-actions {
    flex-direction: column;
    align-items: stretch;
  }

  .btn-primary,
  .btn-ghost {
    width: 100%;
    justify-content: center;
  }

  .status-banner {
    max-width: 100%;
  }
}

@media (max-width: 480px) {
  .form-card {
    padding: 24px 20px;
  }

  .hero-title {
    font-size: 28px;
  }

  .contact-form {
    gap: 24px;
  }
}
</style>